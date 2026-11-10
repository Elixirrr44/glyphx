// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { copyText, joinBatch, readClipboardText } from "./clipboard";

const FAMILY = "\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}";
const TRIANGLES = `G\u{20E4}A\u{20E4}N\u{20E4}G\u{20E4} ${FAMILY}`;

function mockClipboard(writeText: (s: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
}

afterEach(() => {
  Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
  vi.restoreAllMocks();
});

describe("copyText", () => {
  it("writes the exact Unicode string with the async Clipboard API", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    mockClipboard(writeText);
    await expect(copyText(TRIANGLES)).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledTimes(1);
    const copied = writeText.mock.calls[0][0] as string;
    expect(copied).toBe(TRIANGLES);
    expect(Array.from(copied).length).toBe(Array.from(TRIANGLES).length);
  });

  it("falls back to execCommand when the Clipboard API rejects", async () => {
    mockClipboard(vi.fn().mockRejectedValue(new Error("denied")));
    let selected = "";
    const exec = vi.fn(() => {
      selected = (document.activeElement as HTMLTextAreaElement | null)?.value ?? "";
      return true;
    });
    Object.defineProperty(document, "execCommand", { value: exec, configurable: true });
    await expect(copyText(TRIANGLES)).resolves.toBe(true);
    expect(exec).toHaveBeenCalledWith("copy");
    expect(selected).toBe(TRIANGLES);
    // The temporary textarea is cleaned up.
    expect(document.querySelectorAll("textarea")).toHaveLength(0);
  });

  it("uses the fallback when no Clipboard API exists", async () => {
    const exec = vi.fn(() => true);
    Object.defineProperty(document, "execCommand", { value: exec, configurable: true });
    await expect(copyText("plain")).resolves.toBe(true);
    expect(exec).toHaveBeenCalled();
  });

  it("reports failure when every method fails", async () => {
    mockClipboard(vi.fn().mockRejectedValue(new Error("denied")));
    Object.defineProperty(document, "execCommand", {
      value: () => {
        throw new Error("unsupported");
      },
      configurable: true,
    });
    await expect(copyText("x")).resolves.toBe(false);
  });
});

describe("desktop bridge", () => {
  afterEach(() => {
    delete (window as unknown as { glyphxDesktop?: unknown }).glyphxDesktop;
  });

  it("prefers the desktop app's native clipboard when present", async () => {
    const bridgeCopy = vi.fn().mockResolvedValue(true);
    const webCopy = vi.fn().mockResolvedValue(undefined);
    mockClipboard(webCopy);
    (window as unknown as { glyphxDesktop: unknown }).glyphxDesktop = { copyText: bridgeCopy, readText: vi.fn().mockResolvedValue("pasted") };
    await expect(copyText(TRIANGLES)).resolves.toBe(true);
    expect(bridgeCopy).toHaveBeenCalledWith(TRIANGLES);
    expect(webCopy).not.toHaveBeenCalled();
    await expect(readClipboardText()).resolves.toBe("pasted");
  });

  it("falls back to the web Clipboard API if the bridge refuses", async () => {
    const webCopy = vi.fn().mockResolvedValue(undefined);
    mockClipboard(webCopy);
    (window as unknown as { glyphxDesktop: unknown }).glyphxDesktop = { copyText: vi.fn().mockResolvedValue(false), readText: vi.fn() };
    await expect(copyText("x")).resolves.toBe(true);
    expect(webCopy).toHaveBeenCalledWith("x");
  });
});

describe("joinBatch", () => {
  it("joins outputs for batch copy and skips empty entries", () => {
    expect(joinBatch(["a", "", "b"])).toBe("a\nb");
    expect(joinBatch(["a", "b"], "blankline")).toBe("a\n\nb");
    expect(joinBatch(["a", "b"], "space")).toBe("a b");
  });
});

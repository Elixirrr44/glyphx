// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearAllData, historyStore, recentStore } from "@/lib/storage";
import { CopyButton } from "./primitives";

const OUTPUT = "G\u{20E4}A\u{20E4}N\u{20E4}G\u{20E4} \u{1F44D}\u{1F3FD}";

describe("CopyButton", () => {
  let writeText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    clearAllData();
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  });

  afterEach(() => {
    cleanup();
  });

  it("copies the exact output, shows confirmation and records history", async () => {
    render(<CopyButton text={OUTPUT} meta={{ label: "Triangle Overlay", styleId: "tri-classic" }} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /copy/i }));
    });
    expect(writeText).toHaveBeenCalledWith(OUTPUT);
    expect(await screen.findByText("Copied")).toBeTruthy();
    expect(historyStore.get()[0]).toMatchObject({ text: OUTPUT, styleId: "tri-classic", label: "Triangle Overlay" });
    expect(recentStore.get()).toEqual(["tri-classic"]);
  });

  it("is disabled when there is nothing to copy", () => {
    render(<CopyButton text="" />);
    expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(true);
  });
});

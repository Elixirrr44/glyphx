/**
 * Copy real Unicode strings to the clipboard. Uses the async Clipboard API and
 * falls back to a hidden textarea + execCommand for older / insecure contexts.
 * The exact string is copied — no normalization or trimming.
 */

/** Bridge exposed by the GlyphX desktop app (electron/preload.cjs). */
interface DesktopBridge {
  copyText(text: string): Promise<boolean>;
  readText(): Promise<string>;
}

function desktopBridge(): DesktopBridge | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { glyphxDesktop?: DesktopBridge }).glyphxDesktop;
}

export async function copyText(text: string): Promise<boolean> {
  const bridge = desktopBridge();
  if (bridge) {
    try {
      if (await bridge.copyText(text)) return true;
    } catch {
      // fall back to the web APIs below
    }
  }
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to the legacy path
    }
  }
  return legacyCopy(text);
}

function legacyCopy(text: string): boolean {
  if (typeof document === "undefined") return false;
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.top = "0";
  ta.style.left = "0";
  ta.style.opacity = "0";
  ta.style.pointerEvents = "none";
  document.body.appendChild(ta);
  const selection = document.getSelection();
  const previous = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
  const previousFocus = document.activeElement as HTMLElement | null;
  ta.focus({ preventScroll: true });
  ta.select();
  ta.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = typeof document.execCommand === "function" && document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(ta);
  previousFocus?.focus?.({ preventScroll: true });
  if (previous && selection) {
    selection.removeAllRanges();
    selection.addRange(previous);
  }
  return ok;
}

/** Read plain text from the clipboard (desktop bridge first, then the async Clipboard API). */
export async function readClipboardText(): Promise<string> {
  const bridge = desktopBridge();
  if (bridge) return bridge.readText();
  if (typeof navigator !== "undefined" && navigator.clipboard?.readText) return navigator.clipboard.readText();
  throw new Error("Clipboard read is not available");
}

/** Join several outputs for batch copy. */
export function joinBatch(items: string[], separator: "newline" | "blankline" | "space" = "newline"): string {
  const sep = separator === "newline" ? "\n" : separator === "blankline" ? "\n\n" : " ";
  return items.filter((s) => s.length > 0).join(sep);
}

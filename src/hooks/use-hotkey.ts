"use client";

import { useEffect, useRef } from "react";

const isEditable = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));

/**
 * Register a keyboard shortcut. `combo` examples: "/", "mod+z", "mod+shift+z", "mod+y".
 * `mod` means Ctrl on Windows/Linux and Cmd on macOS.
 */
export function useHotkey(
  combo: string,
  handler: (e: KeyboardEvent) => void,
  options: { allowInInputs?: boolean; enabled?: boolean } = {},
) {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  const { allowInInputs = false, enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;
    const parts = combo.toLowerCase().split("+");
    const key = parts[parts.length - 1];
    const wantMod = parts.includes("mod");
    const wantShift = parts.includes("shift");
    const onKey = (e: KeyboardEvent) => {
      if (!allowInInputs && isEditable(e.target)) return;
      const mod = e.ctrlKey || e.metaKey;
      if (wantMod !== mod) return;
      if (wantMod && wantShift !== e.shiftKey) return;
      if (e.key.toLowerCase() !== key) return;
      e.preventDefault();
      ref.current(e);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [combo, allowInInputs, enabled]);
}

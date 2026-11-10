"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { copyText } from "@/lib/clipboard";
import { actions, settingsStore } from "@/lib/storage";

export interface CopyMeta {
  label?: string;
  styleId?: string;
  /** Skip adding to history (e.g. copying a code point from the inspector). */
  silent?: boolean;
}

export async function copyWithFeedback(text: string, meta: CopyMeta = {}): Promise<boolean> {
  if (!text) {
    toast.error("Nothing to copy yet", { description: "Type some text first." });
    return false;
  }
  const ok = await copyText(text);
  if (ok) {
    if (!meta.silent) {
      actions.addHistory(text, meta.label ?? "Copied text", meta.styleId);
      if (meta.styleId) actions.recordRecent(meta.styleId);
    }
    if (settingsStore.get().copyToasts) {
      toast.success(meta.label ? `Copied ${meta.label}` : "Copied", {
        description: text.length > 80 ? `${Array.from(text).slice(0, 60).join("")}\u{2026}` : text,
        duration: 1800,
      });
    }
  } else {
    toast.error("Couldn't access the clipboard", {
      description: "Select the text and copy it manually (Ctrl/Cmd + C).",
    });
  }
  return ok;
}

export function useCopy() {
  return useCallback((text: string, meta?: CopyMeta) => copyWithFeedback(text, meta), []);
}

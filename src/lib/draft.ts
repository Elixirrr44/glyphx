/**
 * Hand-off of a style recipe to the Custom Designer (e.g. "edit this random
 * style"). Uses sessionStorage so it also survives a reload of the designer.
 */

import type { Layer } from "./unicode/engine";
import { isLayer } from "./storage";

const KEY = "glyphx:v1:designer-draft";

export interface DesignerDraft {
  name: string;
  layers: Layer[];
  text?: string;
}

export function setDesignerDraft(draft: DesignerDraft) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    // ignore — the designer will just start from defaults
  }
}

/** Read the pending draft (kept until replaced, so re-renders can read it again). */
export function takeDesignerDraft(): DesignerDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DesignerDraft>;
    if (!Array.isArray(parsed.layers) || !parsed.layers.every(isLayer)) return null;
    return { name: typeof parsed.name === "string" ? parsed.name : "Draft", layers: parsed.layers, text: parsed.text };
  } catch {
    return null;
  }
}

"use client";

import { useEffect, useState } from "react";

/**
 * Detect whether a locally-installed font is available by measuring text
 * against generic fallbacks. Works for system fonts that `document.fonts`
 * cannot report on. Returns null until measured (client only).
 */
export function isFontInstalled(family: string): boolean {
  if (typeof document === "undefined") return false;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  const sample = "mmmmmmmmmmlli1WQ@\u{25B3}\u{2605}";
  const bases = ["monospace", "serif", "sans-serif"];
  return bases.some((base) => {
    ctx.font = `72px ${base}`;
    const baseWidth = ctx.measureText(sample).width;
    ctx.font = `72px "${family}", ${base}`;
    return ctx.measureText(sample).width !== baseWidth;
  });
}

export function useFontAvailability(families: string[]): Record<string, boolean> | null {
  const [result, setResult] = useState<Record<string, boolean> | null>(null);
  const key = families.join("|");
  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      const out: Record<string, boolean> = {};
      for (const f of key.split("|")) out[f] = isFontInstalled(f);
      setResult(out);
    };
    // Measure after web fonts settle so loaded fonts are not misreported.
    if (typeof document !== "undefined" && document.fonts?.ready) document.fonts.ready.then(run, run);
    else run();
    return () => {
      cancelled = true;
    };
  }, [key]);
  return result;
}

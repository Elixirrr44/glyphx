"use client";

import { useEffect, useMemo, useState } from "react";
import { useCopy } from "@/hooks/use-copy";
import { stripDecorativeMarks } from "@/lib/unicode/engine";
import { unstyle } from "@/lib/unicode/alphabets";
import { inspectText, isNameTableLoaded, loadNameTable, textStats } from "@/lib/unicode/inspect";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatPill } from "./primitives";

/** Hook that triggers a re-render once the Unicode name table has loaded. */
export function useNameTable(): boolean {
  const [loaded, setLoaded] = useState(isNameTableLoaded);
  useEffect(() => {
    if (loaded) return;
    let alive = true;
    loadNameTable().then(
      () => alive && setLoaded(true),
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, [loaded]);
  return loaded;
}

/** Grapheme-by-grapheme breakdown with code points, names, categories and encodings. */
export function InspectorPanel({ text, limit = 200 }: { text: string; limit?: number }) {
  const namesLoaded = useNameTable();
  const copy = useCopy();
  const stats = useMemo(() => textStats(text), [text]);
  // namesLoaded is a dependency so names are recomputed once the table arrives.
  const { graphemes, truncated } = useMemo(() => inspectText(text, limit), [text, limit, namesLoaded]); // eslint-disable-line react-hooks/exhaustive-deps
  const plain = useMemo(() => unstyle(stripDecorativeMarks(text)), [text]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        <StatPill value={stats.graphemes} label="graphemes" />
        <StatPill value={stats.codePoints} label="code points" />
        <StatPill value={stats.utf16} label="UTF-16 units" />
        <StatPill value={stats.utf8Bytes} label="UTF-8 bytes" />
        <StatPill value={stats.combiningMarks} label="combining marks" tone={stats.combiningMarks > 40 ? "warn" : undefined} />
        <StatPill value={stats.emoji} label="emoji" />
        <StatPill value={stats.words} label="words" />
        <StatPill value={stats.nfcStable ? "yes" : "no"} label="NFC-stable" tone={stats.nfcStable ? "ok" : "warn"} />
        <StatPill value={stats.nfkcStable ? "yes" : "no"} label="survives NFKC" tone={stats.nfkcStable ? "ok" : "warn"} />
      </div>

      {plain !== text && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-2 text-xs">
          <span className="text-muted-foreground">Plain version:</span>
          <span className="glyph max-w-full truncate text-sm">{plain || "\u{2014}"}</span>
          <Button size="xs" variant="outline" className="ml-auto" onClick={() => copy(plain, { label: "plain text" })}>
            Copy plain
          </Button>
        </div>
      )}

      {text.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing to inspect yet.</p>
      ) : (
        <ol className="space-y-2" aria-label="Graphemes">
          {graphemes.map((g, i) => (
            <li key={i} className="flex gap-3 rounded-xl border border-white/5 bg-black/20 p-2.5">
              <div
                className={cn(
                  "glyph glyph-clip grid min-h-14 w-14 shrink-0 place-items-center rounded-lg bg-white/[0.04] text-2xl",
                  g.isEmoji && "bg-neon-2/10",
                )}
                aria-hidden
              >
                {g.text.trim() ? g.text : "\u{2423}"}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="text-[11px] text-muted-foreground">
                  #{i + 1} {"\u{00B7}"} {g.codePoints.length} code point{g.codePoints.length === 1 ? "" : "s"}
                  {g.isEmoji && " \u{00B7} emoji"}
                </div>
                <ul className="space-y-1">
                  {g.codePoints.map((cp, j) => (
                    <li key={j} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() => copy(cp.hex, { label: cp.hex, silent: true })}
                        className="rounded bg-neon-1/15 px-1.5 py-0.5 font-mono text-neon-1 outline-none hover:bg-neon-1/25 focus-visible:ring-2 focus-visible:ring-ring"
                        title="Copy code point"
                      >
                        {cp.hex}
                      </button>
                      <span className="font-medium break-all">{cp.name || <span className="text-muted-foreground italic">unnamed</span>}</span>
                      <span className="text-muted-foreground">
                        {cp.category} {"\u{00B7}"} {cp.block}
                      </span>
                      <button
                        type="button"
                        onClick={() => copy(cp.utf16, { label: "JS escape", silent: true })}
                        className="font-mono text-muted-foreground outline-none hover:text-foreground focus-visible:underline"
                        title="Copy JavaScript escape"
                      >
                        {cp.utf16}
                      </button>
                      <span className="font-mono text-muted-foreground/70" title="UTF-8 bytes">
                        {cp.utf8}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      )}
      {truncated && <p className="text-xs text-muted-foreground">Showing the first {limit} graphemes.</p>}
    </div>
  );
}

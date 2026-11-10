"use client";

import { Fragment, type ReactNode } from "react";

/**
 * Approximate Discord rendering of Markdown and ```ansi code blocks, so users
 * can see what the copied source will look like after sending.
 */

const FG: Record<number, string> = {
  30: "#4f545c", 31: "#dc322f", 32: "#859900", 33: "#b58900", 34: "#268bd2", 35: "#d33682", 36: "#2aa198", 37: "#ffffff",
};
const BG: Record<number, string> = {
  40: "#002b36", 41: "#cb4b16", 42: "#586e75", 43: "#657b83", 44: "#839496", 45: "#6c71c4", 46: "#93a1a1", 47: "#fdf6e3",
};

interface AnsiSpan {
  text: string;
  fg?: string;
  bg?: string;
  bold?: boolean;
  underline?: boolean;
}

export function parseAnsi(body: string): AnsiSpan[] {
  const spans: AnsiSpan[] = [];
  let style: Omit<AnsiSpan, "text"> = {};
  const re = /\u001b\[([0-9;]*)m/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    if (m.index > last) spans.push({ text: body.slice(last, m.index), ...style });
    const codes = m[1].split(";").filter(Boolean).map(Number);
    if (codes.length === 0 || codes.every((c) => c === 0)) style = {};
    for (const c of codes) {
      if (c === 0) style = {};
      else if (c === 1) style = { ...style, bold: true };
      else if (c === 4) style = { ...style, underline: true };
      else if (FG[c]) style = { ...style, fg: FG[c] };
      else if (BG[c]) style = { ...style, bg: BG[c] };
    }
    last = re.lastIndex;
  }
  if (last < body.length) spans.push({ text: body.slice(last), ...style });
  return spans;
}

function inline(text: string, keyBase: string): ReactNode[] {
  // Order matters: bold before italic, underline before italic underscores.
  const re = /(\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\|\|[^|]+\|\||`[^`]+`|\*[^*]+\*)/gu;
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(re)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(text.slice(last, idx));
    const tok = m[0];
    const key = `${keyBase}-${i++}`;
    if (tok.startsWith("**")) out.push(<strong key={key}>{inline(tok.slice(2, -2), key)}</strong>);
    else if (tok.startsWith("__")) out.push(<u key={key}>{inline(tok.slice(2, -2), key)}</u>);
    else if (tok.startsWith("~~")) out.push(<s key={key}>{inline(tok.slice(2, -2), key)}</s>);
    else if (tok.startsWith("||"))
      out.push(
        <span key={key} className="rounded bg-zinc-600/80 px-0.5 text-transparent transition-colors hover:bg-zinc-600/40 hover:text-inherit">
          {tok.slice(2, -2)}
        </span>,
      );
    else if (tok.startsWith("`"))
      out.push(
        <code key={key} className="rounded bg-black/40 px-1 font-mono text-[0.85em]">
          {tok.slice(1, -1)}
        </code>,
      );
    else out.push(<em key={key}>{inline(tok.slice(1, -1), key)}</em>);
    last = idx + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function DiscordPreview({ text }: { text: string }) {
  const ansi = /^```ansi\n([\s\S]*)\n```$/u.exec(text);
  if (ansi) {
    return (
      <pre className="glyph overflow-x-auto rounded-md border border-black/40 bg-[#2b2d31] p-2 font-mono text-sm text-[#b9bbbe]">
        {parseAnsi(ansi[1]).map((s, i) => (
          <span
            key={i}
            style={{
              color: s.fg,
              backgroundColor: s.bg,
              fontWeight: s.bold ? 700 : undefined,
              textDecoration: s.underline ? "underline" : undefined,
            }}
          >
            {s.text}
          </span>
        ))}
      </pre>
    );
  }
  return (
    <div className="glyph space-y-0.5 rounded-md bg-[#313338] p-2 text-[15px] text-[#dbdee1]">
      {text.split("\n").map((line, i) => {
        const key = `l${i}`;
        if (line.startsWith("### ")) return <div key={key} className="text-base font-bold">{inline(line.slice(4), key)}</div>;
        if (line.startsWith("## ")) return <div key={key} className="text-lg font-bold">{inline(line.slice(3), key)}</div>;
        if (line.startsWith("# ")) return <div key={key} className="text-2xl font-bold">{inline(line.slice(2), key)}</div>;
        if (line.startsWith("-# ")) return <div key={key} className="text-xs text-[#949ba4]">{inline(line.slice(3), key)}</div>;
        if (line.startsWith("> "))
          return (
            <div key={key} className="border-l-4 border-[#4e5058] pl-2">
              {inline(line.slice(2), key)}
            </div>
          );
        return <Fragment key={key}>{line ? <div>{inline(line, key)}</div> : <br />}</Fragment>;
      })}
    </div>
  );
}

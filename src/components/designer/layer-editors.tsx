"use client";

import { Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FONT_OPTIONS, SelectField, SliderField, SwitchField } from "@/components/glyph/controls";
import { Chip } from "@/components/glyph/primitives";
import type { AnsiBg, AnsiColor, CaseMode, EmojiMode, Layer, LayerType, Target } from "@/lib/unicode/engine";
import { MARKS, MARK_BY_CHAR, type MarkPosition, POSITION_LABELS } from "@/lib/unicode/marks";
import { newSeed } from "@/lib/unicode/random";
import { segmentGraphemes } from "@/lib/unicode/segment";
import { FieldInput } from "./field-registry";

export const LAYER_META: Record<LayerType, { title: string; description: string }> = {
  font: { title: "Font", description: "Map letters to a styled Unicode alphabet" },
  case: { title: "Case", description: "Upper, lower, title, alternating or random case" },
  marks: { title: "Overlay marks", description: "Stack combining marks (triangle, circle, strike\u{2026}) on each character" },
  zalgo: { title: "Glitch", description: "Random zalgo marks above, through and below" },
  charWrap: { title: "Wrap each character", description: "Put symbols around every character" },
  separator: { title: "Between characters", description: "Insert a decoration between characters" },
  wordSeparator: { title: "Between words", description: "Replace spaces with a decoration" },
  wrap: { title: "Prefix & suffix", description: "Frame the whole text" },
  reverse: { title: "Reverse", description: "Reverse the order of characters (emoji-safe)" },
  flip: { title: "Upside down", description: "Flip letters and reverse" },
  replace: { title: "Replace characters", description: "Swap each character for a fixed string" },
  emoji: { title: "Emoji", description: "Emoji between letters, between words or around words" },
  glitchChars: { title: "Noise characters", description: "Randomly inject characters such as \u{2591}\u{2592}\u{2593}" },
  ansi: { title: "Discord ANSI color", description: "Colored text inside an ```ansi code block" },
  linePrefix: { title: "Line prefix", description: "Prefix each line, e.g. Discord headers or quotes" },
};

export const ADDABLE: LayerType[] = [
  "font", "marks", "wrap", "separator", "charWrap", "wordSeparator", "zalgo", "case", "emoji",
  "glitchChars", "flip", "reverse", "replace", "linePrefix", "ansi",
];

export function defaultLayer(type: LayerType): Layer {
  switch (type) {
    case "font":
      return { type, font: "boldScript" };
    case "case":
      return { type, mode: "upper" };
    case "marks":
      return { type, marks: "\u{20E4}", target: "nonspace" };
    case "zalgo":
      return { type, up: 4, mid: 1, down: 4, seed: 1234, variance: 0.5, target: "nonspace" };
    case "charWrap":
      return { type, left: "\u{3010}", right: "\u{3011}" };
    case "separator":
      return { type, value: "\u{2726}", skipSpaces: true };
    case "wordSeparator":
      return { type, value: " \u{2661} " };
    case "wrap":
      return { type, prefix: "\u{A9C1} ", suffix: " \u{A9C2}" };
    case "reverse":
      return { type };
    case "flip":
      return { type };
    case "replace":
      return { type, with: "\u{2605}", target: "nonspace" };
    case "emoji":
      return { type, emojis: ["\u{2728}", "\u{1F525}"], mode: "between" };
    case "glitchChars":
      return { type, amount: 30, charset: "\u{2591}\u{2592}\u{2593}", seed: 77 };
    case "ansi":
      return { type, fg: "pink", bold: true };
    case "linePrefix":
      return { type, prefix: "# " };
  }
}

const WRAP_PAIRS: [string, string][] = [
  ["\u{A9C1} ", " \u{A9C2}"], ["\u{2726} ", " \u{2726}"], ["\u{2605}\u{5F61} ", " \u{5F61}\u{2605}"], ["\u{300E}", "\u{300F}"],
  ["\u{4E42} ", " \u{4E42}"], ["\u{2E3B} ", " \u{2E3B}"], ["\u{029A} ", " \u{025E}"], ["\u{2022}\u{00B0}\u{2022} ", " \u{2022}\u{00B0}\u{2022}"],
  ["\u{271E} ", " \u{271E}"], ["\u{26A1}", "\u{26A1}"], ["\u{1F451} ", " \u{1F451}"], ["\u{2584}\u{FE3B}\u{30C7}", "\u{2550}\u{2550}\u{2501}\u{4E00}"],
];
const CHAR_PAIRS: [string, string][] = [
  ["\u{3010}", "\u{3011}"], ["\u{300C}", "\u{300D}"], ["\u{300E}", "\u{300F}"], ["\u{27E6}", "\u{27E7}"], ["\u{2770}", "\u{2771}"],
  ["(", ")"], ["[", "]"], ["\u{2985}", "\u{2986}"], ["||", "||"], ["\u{0F3A}", "\u{0F3B}"],
];
const SEPARATORS = ["\u{2726}", "\u{00B7}", "\u{2661}", "\u{2605}", " ", "\u{2219}", "\u{22C6}", "\u{25C6}", "\u{2727}", "\u{203A}", "\u{223F}", "\u{2022}"];
const WORD_SEPS = [" \u{2661} ", " \u{2726} ", " \u{1F525} ", " \u{1F44F} ", " \u{00B7} ", " \u{2014} ", "\u{3000}", " \u{2B50} "];
const LINE_PREFIXES = ["# ", "## ", "### ", "-# ", "> ", ">>> ", "- ", "1. "];
const ANSI_COLORS: (AnsiColor | "rainbow")[] = ["rainbow", "red", "yellow", "green", "cyan", "blue", "pink", "white", "gray"];
const ANSI_BGS: AnsiBg[] = ["none", "darkBlue", "orange", "marbleBlue", "turquoise", "gray", "indigo", "lightGray", "white"];
const TARGETS: { value: Target; label: string }[] = [
  { value: "nonspace", label: "Every character except spaces" },
  { value: "all", label: "Every character, including spaces" },
  { value: "letters", label: "Letters only" },
  { value: "alnum", label: "Letters & digits" },
  { value: "text", label: "Text only (skip emoji)" },
  { value: "emoji", label: "Emoji only" },
];

function MarksEditor({ layer, onChange }: { layer: Extract<Layer, { type: "marks" }>; onChange: (l: Layer, key?: string) => void }) {
  const seq = Array.from(layer.marks);
  const positions = seq.map((c) => MARK_BY_CHAR.get(c)?.position).filter(Boolean) as MarkPosition[];
  const enclosures = positions.filter((p) => p === "enclose").length;
  const overlays = positions.filter((p) => p === "overlay").length;
  const groups: MarkPosition[] = ["enclose", "overlay", "above", "below"];
  return (
    <div className="space-y-3">
      <div className="flex min-h-9 flex-wrap items-center gap-1 rounded-lg border border-white/10 bg-black/20 p-1.5">
        {seq.length === 0 && <span className="px-1 text-xs text-muted-foreground">No marks yet {"\u{2014}"} pick some below</span>}
        {seq.map((c, i) => (
          <button
            key={`${c}-${i}`}
            type="button"
            onClick={() => onChange({ ...layer, marks: seq.filter((_, j) => j !== i).join("") })}
            className="glyph rounded-md bg-neon-1/15 px-2 py-0.5 text-lg outline-none hover:bg-destructive/25 focus-visible:ring-2 focus-visible:ring-ring"
            title={`Remove ${MARK_BY_CHAR.get(c)?.name ?? "mark"}`}
            aria-label={`Remove ${MARK_BY_CHAR.get(c)?.label ?? "mark"}`}
          >
            {`\u{25CC}${c}`}
          </button>
        ))}
      </div>
      {(enclosures > 1 || overlays > 1) && (
        <p className="text-[11px] text-warning">
          {enclosures > 1 && "Several enclosing marks overlap \u{2014} most fonts draw them on top of each other. "}
          {overlays > 1 && "Several overlays share the same spot and will cross each other."}
        </p>
      )}
      {groups.map((g) => (
        <div key={g}>
          <p className="mb-1 text-[11px] tracking-wide text-muted-foreground uppercase">{POSITION_LABELS[g]}</p>
          <div className="flex flex-wrap gap-1">
            {MARKS.filter((m) => m.position === g).map((m) => (
              <Chip key={m.id} title={m.name} onClick={() => onChange({ ...layer, marks: layer.marks + m.char })}>
                <span className="glyph text-base">{`\u{25CC}${m.char}`}</span> {m.label}
              </Chip>
            ))}
          </div>
        </div>
      ))}
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField label="Apply to" value={layer.target ?? "nonspace"} onChange={(v) => onChange({ ...layer, target: v })} options={TARGETS} />
        <SliderField label="Every Nth character" value={layer.every ?? 1} min={1} max={6} onChange={(v) => onChange({ ...layer, every: v }, "every")} />
      </div>
    </div>
  );
}

/** Editor body for one layer. `onChange(layer, coalesceKey?)`. */
export function LayerEditor({ layer, onChange }: { layer: Layer; onChange: (l: Layer, key?: string) => void }) {
  switch (layer.type) {
    case "font":
      return <SelectField label="Alphabet" value={layer.font} onChange={(font) => onChange({ ...layer, font })} options={FONT_OPTIONS} />;
    case "case":
      return (
        <div className="flex flex-wrap gap-1.5">
          {(["upper", "lower", "title", "alternate", "inverse", "random"] as CaseMode[]).map((m) => (
            <Chip key={m} active={layer.mode === m} onClick={() => onChange({ ...layer, mode: m, seed: layer.seed ?? 5 })}>
              {m}
            </Chip>
          ))}
        </div>
      );
    case "marks":
      return <MarksEditor layer={layer} onChange={onChange} />;
    case "zalgo":
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <SliderField label="Above" value={layer.up} max={30} onChange={(up) => onChange({ ...layer, up }, "up")} />
          <SliderField label="Through" value={layer.mid} max={10} onChange={(mid) => onChange({ ...layer, mid }, "mid")} />
          <SliderField label="Below" value={layer.down} max={30} onChange={(down) => onChange({ ...layer, down }, "down")} />
          <SliderField
            label="Randomness"
            value={Math.round((layer.variance ?? 0.5) * 100)}
            format={(v) => `${v}%`}
            onChange={(v) => onChange({ ...layer, variance: v / 100 }, "variance")}
          />
          <SelectField label="Apply to" value={layer.target ?? "nonspace"} onChange={(v) => onChange({ ...layer, target: v })} options={TARGETS} />
          <div className="flex items-end">
            <Button variant="outline" size="sm" onClick={() => onChange({ ...layer, seed: newSeed() })}>
              <Dices /> Re-roll pattern
            </Button>
          </div>
        </div>
      );
    case "charWrap":
      return (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <FieldInput label="Left" value={layer.left} onChange={(left) => onChange({ ...layer, left }, "left")} />
            <FieldInput label="Right" value={layer.right} onChange={(right) => onChange({ ...layer, right }, "right")} />
          </div>
          <div className="flex flex-wrap gap-1">
            {CHAR_PAIRS.map(([l, r]) => (
              <Chip key={l + r} onClick={() => onChange({ ...layer, left: l, right: r })}>
                <span className="glyph">{`${l}a${r}`}</span>
              </Chip>
            ))}
          </div>
        </div>
      );
    case "separator":
      return (
        <div className="space-y-2">
          <FieldInput label="Decoration" value={layer.value} onChange={(value) => onChange({ ...layer, value }, "value")} />
          <div className="flex flex-wrap gap-1">
            {SEPARATORS.map((s) => (
              <Chip key={s} active={layer.value === s} onClick={() => onChange({ ...layer, value: s })}>
                <span className="glyph">{s === " " ? "space" : `a${s}b`}</span>
              </Chip>
            ))}
          </div>
          <SwitchField label="Skip spaces" checked={layer.skipSpaces ?? true} onChange={(skipSpaces) => onChange({ ...layer, skipSpaces })} />
        </div>
      );
    case "wordSeparator":
      return (
        <div className="space-y-2">
          <FieldInput label="Replace spaces with" value={layer.value} onChange={(value) => onChange({ ...layer, value }, "value")} />
          <div className="flex flex-wrap gap-1">
            {WORD_SEPS.map((s) => (
              <Chip key={s} active={layer.value === s} onClick={() => onChange({ ...layer, value: s })}>
                <span className="glyph">{`a${s}b`}</span>
              </Chip>
            ))}
          </div>
        </div>
      );
    case "wrap":
      return (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <FieldInput label="Prefix" value={layer.prefix} onChange={(prefix) => onChange({ ...layer, prefix }, "prefix")} />
            <FieldInput label="Suffix" value={layer.suffix} onChange={(suffix) => onChange({ ...layer, suffix }, "suffix")} />
          </div>
          <div className="flex flex-wrap gap-1">
            {WRAP_PAIRS.map(([p, s]) => (
              <Chip key={p + s} onClick={() => onChange({ ...layer, prefix: p, suffix: s })}>
                <span className="glyph">{`${p.trim()}\u{2026}${s.trim()}`}</span>
              </Chip>
            ))}
          </div>
        </div>
      );
    case "reverse":
    case "flip":
      return <p className="text-sm text-muted-foreground">{LAYER_META[layer.type].description}. No options.</p>;
    case "replace":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <FieldInput label="Replace with" value={layer.with} onChange={(w) => onChange({ ...layer, with: w }, "with")} />
          <SelectField label="Apply to" value={layer.target ?? "nonspace"} onChange={(v) => onChange({ ...layer, target: v })} options={TARGETS} />
        </div>
      );
    case "emoji":
      return (
        <div className="space-y-2">
          <FieldInput
            label="Emoji (type or pick several)"
            value={layer.emojis.join("")}
            onChange={(v) => onChange({ ...layer, emojis: segmentGraphemes(v).filter((g) => g.trim()) }, "emojis")}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <SelectField
              label="Placement"
              value={layer.mode}
              onChange={(mode) => onChange({ ...layer, mode: mode as EmojiMode })}
              options={[
                { value: "between", label: "Between characters" },
                { value: "words", label: "Between words" },
                { value: "wordWrap", label: "Around each word" },
              ]}
            />
            <SwitchField
              className="items-center"
              label="Random order"
              checked={!!layer.random}
              onChange={(random) => onChange({ ...layer, random, seed: layer.seed ?? newSeed() })}
            />
          </div>
        </div>
      );
    case "glitchChars":
      return (
        <div className="space-y-3">
          <SliderField label="Amount" value={layer.amount} max={80} format={(v) => `${v}%`} onChange={(amount) => onChange({ ...layer, amount }, "amount")} />
          <FieldInput label="Characters to inject" value={layer.charset} onChange={(charset) => onChange({ ...layer, charset }, "charset")} />
          <Button variant="outline" size="sm" onClick={() => onChange({ ...layer, seed: newSeed() })}>
            <Dices /> Re-roll
          </Button>
        </div>
      );
    case "ansi":
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1">
            {ANSI_COLORS.map((c) => (
              <Chip key={c} active={layer.fg === c} onClick={() => onChange({ ...layer, fg: c })}>
                {c}
              </Chip>
            ))}
          </div>
          <SelectField
            label="Background"
            value={layer.bg ?? "none"}
            onChange={(bg) => onChange({ ...layer, bg })}
            options={ANSI_BGS.map((b) => ({ value: b, label: b === "none" ? "No background" : b }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <SwitchField label="Bold" checked={!!layer.bold} onChange={(bold) => onChange({ ...layer, bold })} />
            <SwitchField label="Underline" checked={!!layer.underline} onChange={(underline) => onChange({ ...layer, underline })} />
          </div>
          <p className="text-[11px] text-muted-foreground">Keep this as the last layer: it wraps everything in a code block.</p>
        </div>
      );
    case "linePrefix":
      return (
        <div className="space-y-2">
          <FieldInput label="Prefix" value={layer.prefix} onChange={(prefix) => onChange({ ...layer, prefix }, "prefix")} />
          <div className="flex flex-wrap gap-1">
            {LINE_PREFIXES.map((pfx) => (
              <Chip key={pfx} active={layer.prefix === pfx} onClick={() => onChange({ ...layer, prefix: pfx })}>
                <code>{pfx.trim()}</code>
              </Chip>
            ))}
          </div>
        </div>
      );
  }
}

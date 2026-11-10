"use client";

import { BookmarkPlus, Dices, Eraser, ScanSearch, Zap } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CompatPanelFor } from "@/components/glyph/compat";
import { FONT_OPTIONS, SelectField, SliderField, SwitchField } from "@/components/glyph/controls";
import { Chip, CopyButton, GlyphText, PageHeader, Panel, StatPill } from "@/components/glyph/primitives";
import { TextComposer } from "@/components/glyph/text-composer";
import { useSettings, useEngineOptions, useWorkspaceText } from "@/hooks/use-store";
import { openInspector } from "@/lib/inspector-store";
import { actions } from "@/lib/storage";
import type { FontId } from "@/lib/unicode/alphabets";
import { type Layer, stripDecorativeMarks, type Target, transform } from "@/lib/unicode/engine";
import { newSeed } from "@/lib/unicode/random";
import { countMarks, segmentGraphemes } from "@/lib/unicode/segment";

interface GlitchConfig {
  up: number;
  mid: number;
  down: number;
  variance: number;
  seed: number;
  target: Target;
  randomCase: boolean;
  blocks: number;
  charset: string;
  font: FontId | "none";
}

const CHARSETS: { value: string; label: string }[] = [
  { value: "\u{2591}\u{2592}\u{2593}\u{2588}", label: "Shade blocks \u{2591}\u{2592}\u{2593}" },
  { value: "\u{00A6}|\u{2502}\u{2503}_", label: "Broken bars \u{00A6}|\u{2503}" },
  { value: "\u{2580}\u{2584}\u{258C}\u{2590}", label: "Half blocks \u{2580}\u{2584}" },
  { value: "\u{2234}\u{2235}\u{2237}\u{205E}", label: "Dot noise \u{2234}\u{2235}" },
  { value: "\u{2620}\u{26A0}\u{2622}", label: "Hazard \u{2620}\u{26A0}" },
];

const QUICK: { id: string; label: string; cfg: Partial<GlitchConfig> }[] = [
  { id: "light", label: "Light", cfg: { up: 2, mid: 0, down: 2, variance: 0.5, blocks: 0, randomCase: false } },
  { id: "medium", label: "Medium", cfg: { up: 5, mid: 1, down: 5, variance: 0.5, blocks: 0, randomCase: false } },
  { id: "heavy", label: "Heavy", cfg: { up: 12, mid: 2, down: 12, variance: 0.3, blocks: 0, randomCase: false } },
  { id: "chaos", label: "Chaos", cfg: { up: 20, mid: 4, down: 20, variance: 0.2, blocks: 20, randomCase: true } },
  { id: "ascend", label: "Ascend", cfg: { up: 9, mid: 0, down: 0, variance: 0.4, blocks: 0 } },
  { id: "descend", label: "Descend", cfg: { up: 0, mid: 0, down: 9, variance: 0.4, blocks: 0 } },
  { id: "static", label: "Static", cfg: { up: 0, mid: 3, down: 0, variance: 0.2, blocks: 15 } },
];

const DEFAULT: GlitchConfig = {
  up: 5,
  mid: 1,
  down: 5,
  variance: 0.5,
  seed: 1337,
  target: "nonspace",
  randomCase: false,
  blocks: 0,
  charset: CHARSETS[0].value,
  font: "none",
};

export function glitchLayers(c: GlitchConfig): Layer[] {
  const layers: Layer[] = [];
  if (c.randomCase) layers.push({ type: "case", mode: "random", seed: c.seed });
  if (c.font !== "none") layers.push({ type: "font", font: c.font });
  if (c.blocks > 0) layers.push({ type: "glitchChars", amount: c.blocks, charset: c.charset, seed: c.seed + 1 });
  layers.push({ type: "zalgo", up: c.up, mid: c.mid, down: c.down, seed: c.seed, variance: c.variance, target: c.target });
  return layers;
}

export function GlitchStudioView() {
  const [text, setText] = useWorkspaceText();
  const deferred = useDeferredValue(text);
  const settings = useSettings();
  const options = useEngineOptions();
  const [cfg, setCfg] = useState<GlitchConfig>(DEFAULT);
  const [dirty, setDirty] = useState("");
  const set = (patch: Partial<GlitchConfig>) => setCfg((c) => ({ ...c, ...patch }));

  const source = deferred || "Glitch Studio";
  const result = useMemo(() => transform(source, glitchLayers(cfg), options), [source, cfg, options]);
  const maxMarks = useMemo(() => segmentGraphemes(result.output).reduce((m, g) => Math.max(m, countMarks(g)), 0), [result.output]);
  const cleaned = useMemo(() => stripDecorativeMarks(dirty), [dirty]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Zap className="size-5" />}
        title="Glitch Studio"
        description="Tune zalgo marks above, through and below each character, add corruption, and keep it all within safe limits."
      />
      <TextComposer value={text} onChange={setText} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <Panel title="Controls" bodyClassName="space-y-5">
          <div className="flex flex-wrap gap-1.5">
            {QUICK.map((q) => (
              <Chip key={q.id} onClick={() => set(q.cfg)}>
                {q.label}
              </Chip>
            ))}
          </div>
          <SliderField label="Marks above" value={cfg.up} max={30} onChange={(v) => set({ up: v })} />
          <SliderField label="Marks through" value={cfg.mid} max={10} onChange={(v) => set({ mid: v })} />
          <SliderField label="Marks below" value={cfg.down} max={30} onChange={(v) => set({ down: v })} />
          <SliderField
            label="Randomness"
            value={Math.round(cfg.variance * 100)}
            onChange={(v) => set({ variance: v / 100 })}
            format={(v) => `${v}%`}
            hint="How much the mark count varies from character to character."
          />
          <SliderField
            label="Glitch characters"
            value={cfg.blocks}
            max={70}
            onChange={(v) => set({ blocks: v })}
            format={(v) => `${v}%`}
            hint="Chance of injecting a noise character after each character."
          />
          <SelectField label="Noise characters" value={cfg.charset} onChange={(v) => set({ charset: v })} options={CHARSETS} />
          <SelectField
            label="Base font"
            value={cfg.font}
            onChange={(v) => set({ font: v as GlitchConfig["font"] })}
            options={[{ value: "none", label: "Keep original letters", preview: "Abc" }, ...FONT_OPTIONS]}
          />
          <SelectField
            label="Apply to"
            value={cfg.target}
            onChange={(v) => set({ target: v as Target })}
            options={[
              { value: "nonspace", label: "Everything except spaces" },
              { value: "letters", label: "Letters only" },
              { value: "text", label: "Text, not emoji" },
              { value: "all", label: "Everything, including spaces" },
            ]}
          />
          <SwitchField label="Random case" checked={cfg.randomCase} onChange={(v) => set({ randomCase: v })} />
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => set({ seed: newSeed() })}>
              <Dices /> Re-roll
            </Button>
            <Button variant="ghost" onClick={() => setCfg(DEFAULT)}>
              Reset
            </Button>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel
            title="Output"
            actions={
              <>
                <Button size="sm" variant="ghost" onClick={() => openInspector(result.output, "Glitch output")}>
                  <ScanSearch /> Inspect
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    actions.saveText(result.output, "Glitch Studio");
                    toast.success("Saved to Favorites \u{2192} Saved texts");
                  }}
                >
                  <BookmarkPlus /> Save
                </Button>
                <CopyButton text={result.output} meta={{ label: "glitch text" }} />
              </>
            }
          >
            <div className="rounded-xl bg-black/30 px-4 py-10">
              <GlyphText text={result.output} size={Math.max(settings.previewFontSize, 28)} className="max-h-[22rem]" />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <StatPill value={result.output.length} label="UTF-16 units" />
              <StatPill value={maxMarks} label="max marks / char" tone={maxMarks > 15 ? "warn" : undefined} />
              <StatPill value={settings.maxMarksPerGrapheme} label="safety cap" />
              {result.cappedMarks && <StatPill value="!" label="mark cap reached" tone="warn" />}
              {result.cappedLength && <StatPill value="!" label="length cap reached" tone="warn" />}
            </div>
            {(result.cappedMarks || result.cappedLength) && (
              <p className="mt-2 text-xs text-warning">
                Some marks were skipped to keep the output safe. Raise the cap in Settings if you really need more.
              </p>
            )}
          </Panel>
          <Panel title="Compatibility">
            <CompatPanelFor text={result.output} compact />
          </Panel>
          <Panel
            title="Clean up zalgo"
            description="Paste glitched text to strip decorative combining marks while keeping normal accents and emoji."
            actions={
              <Button size="sm" variant="ghost" onClick={() => setDirty(result.output)}>
                <Eraser /> Use output
              </Button>
            }
          >
            <Textarea
              value={dirty}
              onChange={(e) => setDirty(e.target.value)}
              placeholder={"Paste z\u{0335}\u{0353}a\u{0336}\u{0359}l\u{0337}\u{0347}g\u{0338}\u{035A}o\u{0335} text here"}
              aria-label="Text to clean"
              className="glyph min-h-20"
            />
            <div className="mt-2 flex items-center gap-2 rounded-xl bg-black/25 p-2 pl-3">
              <GlyphText text={cleaned} size={20} className="flex-1" placeholder="Clean text appears here" />
              <CopyButton text={cleaned} meta={{ label: "clean text" }} size="xs" />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

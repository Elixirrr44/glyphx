"use client";

import { Info, ScanSearch, Triangle } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { CompatPanelFor, FontPreviewGrid } from "@/components/glyph/compat";
import { Chip, CopyButton, GlyphText, IconAction, PageHeader, Panel } from "@/components/glyph/primitives";
import { TextComposer } from "@/components/glyph/text-composer";
import { useEngineOptions, useWorkspaceText } from "@/hooks/use-store";
import { graphemeBreakdown, type TriangleScope, triangleVariants } from "@/lib/generators";
import { openInspector } from "@/lib/inspector-store";
import { describeCodePoint } from "@/lib/unicode/inspect";
import { MARK_BY_ID, MK } from "@/lib/unicode/marks";
import { cn } from "@/lib/utils";

const EXTRAS = ["triangle", "circle", "square", "diamond", "strike", "slash", "dotAbove", "underline", "keycap"];

export function TriangleStudioView() {
  const [text, setText] = useWorkspaceText();
  const deferred = useDeferredValue(text);
  const options = useEngineOptions();
  const [extras, setExtras] = useState<string[]>([]);
  const [scope, setScope] = useState<TriangleScope>("all");
  const [selected, setSelected] = useState("each");

  const overlay = MK.triangle + extras.map((id) => MARK_BY_ID[id].char).join("");
  const source = deferred || "\u{1F525} GANG \u{1F480}";
  const variants = useMemo(() => triangleVariants(source, overlay, scope, options), [source, overlay, scope, options]);
  const active = variants.find((v) => v.id === selected) ?? variants[0];
  const breakdown = useMemo(() => graphemeBreakdown(source), [source]);
  const overlayInfo = useMemo(() => Array.from(overlay).map(describeCodePoint), [overlay]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Triangle className="size-5" />}
        title="Triangle Studio"
        description="Generate copyable combinations with the combining enclosing upward-pointing triangle (U+20E4) on text, emoji and sequences."
      />

      <div className="glass neon-border flex gap-3 rounded-2xl p-4 text-sm">
        <Info className="mt-0.5 size-5 shrink-0 text-neon-2" />
        <div className="space-y-1.5 text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">The triangle is a Unicode character, not a graphic.</span> U+20E4 COMBINING
            ENCLOSING UPWARD POINTING TRIANGLE is an <em>enclosing mark</em> (category Me). It has no shape of its own until a font draws it
            around the character before it {"\u{2014}"} GlyphX attaches it after each whole grapheme cluster, so emoji like{" "}
            {"\u{1F44D}\u{1F3FD}"} or {"\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}"} are never split.
          </p>
          <p>
            Because rendering is up to the reader{"\u{2019}"}s font, the same text can look like a neat triangle on one device and a
            detached outline on another. Emoji fonts usually ignore enclosing marks. Check the font previews below before you post.
          </p>
        </div>
      </div>

      <TextComposer value={text} onChange={setText} placeholder={"Type text or paste emoji\u{2026} e.g. GANG \u{1F525}"} />

      <Panel
        title="Overlay builder"
        description={`Triangle plus optional extra marks. Your text has ${breakdown.text} text character(s), ${breakdown.emoji} emoji and ${breakdown.spaces} space(s).`}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Add to triangle:</span>
          {EXTRAS.map((id) => {
            const mk = MARK_BY_ID[id];
            const on = extras.includes(id);
            return (
              <Chip key={id} active={on} title={mk.name} onClick={() => setExtras((e) => (on ? e.filter((x) => x !== id) : [...e, id]))}>
                <span className="glyph text-base">{`\u{25CC}${mk.char}`}</span>
                {id === "triangle" ? "Second triangle" : mk.label}
              </Chip>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Apply to:</span>
          {(
            [
              ["all", "Text & emoji"],
              ["text", "Text only"],
              ["emoji", "Emoji only"],
            ] as [TriangleScope, string][]
          ).map(([v, l]) => (
            <Chip key={v} active={scope === v} onClick={() => setScope(v)}>
              {l}
            </Chip>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
          <span className="text-muted-foreground">Overlay sequence:</span>
          {overlayInfo.map((cp, i) => (
            <span key={i} className="rounded-md bg-white/5 px-1.5 py-0.5 font-mono" title={cp.name}>
              {cp.hex}
            </span>
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
        <section className="space-y-2" aria-label="Triangle variants">
          {variants.map((v) => (
            <div
              key={v.id}
              className={cn(
                "glass flex items-center gap-2 rounded-2xl p-2 pl-3 transition-colors",
                active?.id === v.id && "border-neon-1/60 shadow-[0_0_0_1px_var(--neon-1)]",
              )}
            >
              <button
                type="button"
                onClick={() => setSelected(v.id)}
                className="min-w-0 flex-1 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-pressed={active?.id === v.id}
              >
                <p className="text-xs font-medium">{v.label}</p>
                <p className="text-[11px] text-muted-foreground">{v.description}</p>
                <GlyphText as="span" text={v.text} size={24} className="mt-1 max-h-28" />
              </button>
              <IconAction label="Inspect" onClick={() => openInspector(v.text, v.label)}>
                <ScanSearch />
              </IconAction>
              <CopyButton text={v.text} meta={{ label: `Triangle: ${v.label}` }} size="icon-sm" showLabel={false} />
            </div>
          ))}
        </section>

        <div className="space-y-4">
          <Panel title="Live font preview" description={active ? `${active.label} \u{2014} rendered with fonts available on this device.` : undefined}>
            <FontPreviewGrid text={active?.text ?? ""} size={28} />
          </Panel>
          <Panel title="Compatibility">{active && <CompatPanelFor text={active.text} />}</Panel>
        </div>
      </div>
    </div>
  );
}

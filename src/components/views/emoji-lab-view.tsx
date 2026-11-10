"use client";

import { Dices, FaceGrinning, ScanSearch } from "lucide-react";
import { useDeferredValue, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CompatDot } from "@/components/glyph/compat";
import { EmojiPicker } from "@/components/glyph/pickers";
import { Chip, CopyButton, EmptyState, GlyphText, IconAction, PageHeader, Panel } from "@/components/glyph/primitives";
import { ResultGrid, useGenerated } from "@/components/glyph/results";
import { TextComposer, type TextComposerHandle } from "@/components/glyph/text-composer";
import { useAllPresets, useEngineOptions, useWorkspaceText } from "@/hooks/use-store";
import { SKIN_TONES, supportsSkinTone, withSkinTone } from "@/lib/data/emoji";
import { EMOJI_THEMES, emojiCombos } from "@/lib/generators";
import { openInspector } from "@/lib/inspector-store";
import { applyLayers, type Target } from "@/lib/unicode/engine";
import { MARK_BY_ID } from "@/lib/unicode/marks";
import { newSeed } from "@/lib/unicode/random";
import { isEmojiGrapheme, segmentGraphemes } from "@/lib/unicode/segment";

const OVERLAY_IDS = ["triangle", "circle", "square", "diamond", "keycap", "noEntry", "slash", "strike", "xAbove", "underline"];

function Row({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-black/20 p-2 pl-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {label} <CompatDot text={text} />
        </div>
        <GlyphText text={text} size={22} className="max-h-28" />
      </div>
      <IconAction label="Inspect" onClick={() => openInspector(text, label)}>
        <ScanSearch />
      </IconAction>
      <CopyButton text={text} meta={{ label }} size="icon-sm" showLabel={false} />
    </div>
  );
}

export function EmojiLabView() {
  const [text, setText] = useWorkspaceText();
  const deferred = useDeferredValue(text);
  const composer = useRef<TextComposerHandle>(null);
  const options = useEngineOptions();
  const all = useAllPresets();

  const [theme, setTheme] = useState<string>("sparkle");
  const [seed, setSeed] = useState(3);
  const [overlays, setOverlays] = useState<string[]>(["triangle"]);
  const [scope, setScope] = useState<Target>("emoji");

  const graphemes = useMemo(() => segmentGraphemes(deferred), [deferred]);
  const ownEmojis = useMemo(() => Array.from(new Set(graphemes.filter(isEmojiGrapheme))), [graphemes]);
  const comboEmojis = useMemo(() => (theme === "mine" ? ownEmojis : (EMOJI_THEMES[theme]?.emojis ?? [])), [theme, ownEmojis]);
  const comboText = useMemo(
    () => graphemes.filter((g) => !isEmojiGrapheme(g)).join("").trim() || "GlyphX",
    [graphemes],
  );
  const combos = useMemo(() => emojiCombos(comboText, comboEmojis, seed), [comboText, comboEmojis, seed]);

  const overlayString = overlays.map((id) => MARK_BY_ID[id].char).join("");
  const overlaySource = deferred || "\u{1F525}\u{2728}\u{1F480}";
  const overlayResults = useMemo(() => {
    if (!overlayString) return [];
    const ov = overlayString;
    return [
      { label: "Selected overlays", text: applyLayers(overlaySource, [{ type: "marks", marks: ov, target: scope }], options) },
      { label: "Each overlay separately", text: overlays.map((id) => applyLayers(overlaySource, [{ type: "marks", marks: MARK_BY_ID[id].char, target: scope }], options)).join("  ") },
      { label: "Spaced", text: applyLayers(overlaySource, [{ type: "marks", marks: ov, target: scope }, { type: "separator", value: " " }], options) },
      { label: "Every other", text: applyLayers(overlaySource, [{ type: "marks", marks: ov, target: scope, every: 2 }], options) },
    ];
  }, [overlayString, overlaySource, scope, overlays, options]);

  const toneable = useMemo(() => ownEmojis.filter(supportsSkinTone).slice(0, 6), [ownEmojis]);

  const emojiPresets = useMemo(() => all.filter((p) => p.category === "emoji"), [all]);
  const emojiItems = useGenerated(emojiPresets, deferred || "GlyphX", options);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<FaceGrinning className="size-5" />}
        title="Emoji Lab"
        description="Mix emoji with text, generate emoji combinations, try combining overlays on emoji and explore skin-tone sequences."
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <TextComposer ref={composer} value={text} onChange={setText} placeholder={"Type text and add emoji\u{2026} \u{1F525}\u{2728}"} />
        <Panel title="Emoji picker" description="Click to insert at the cursor." bodyClassName="p-3 sm:p-4">
          <EmojiPicker onPick={(e) => composer.current?.insert(e)} height={210} />
        </Panel>
      </div>

      <Panel
        title="Emoji combination generator"
        description="Frames, trails and dividers built from an emoji theme or the emoji in your text."
        actions={
          <Button size="sm" variant="outline" onClick={() => setSeed(newSeed())}>
            <Dices /> Shuffle
          </Button>
        }
      >
        <div className="no-scrollbar mb-3 flex gap-1.5 overflow-x-auto pb-1">
          <Chip active={theme === "mine"} onClick={() => setTheme("mine")}>
            My emoji {ownEmojis.length > 0 && <span className="opacity-70">{ownEmojis.join("")}</span>}
          </Chip>
          {Object.entries(EMOJI_THEMES).map(([id, t]) => (
            <Chip key={id} active={theme === id} onClick={() => setTheme(id)}>
              {t.emojis[0]} {t.label}
            </Chip>
          ))}
        </div>
        {combos.length === 0 ? (
          <EmptyState title="No emoji in your text yet">Add some emoji above or pick a theme.</EmptyState>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {combos.map((c) => (
              <Row key={c.id} label={c.label} text={c.text} />
            ))}
          </div>
        )}
      </Panel>

      <Panel
        title="Emoji overlays"
        description="Apply combining marks to emoji. Emoji fonts rarely position marks around the picture, so results vary by device."
      >
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {OVERLAY_IDS.map((id) => {
            const mk = MARK_BY_ID[id];
            const on = overlays.includes(id);
            return (
              <Chip key={id} active={on} onClick={() => setOverlays((o) => (on ? o.filter((x) => x !== id) : [...o, id]))} title={mk.name}>
                <span className="glyph text-base">{`\u{25CC}${mk.char}`}</span> {mk.label}
              </Chip>
            );
          })}
          <span className="mx-1 h-5 w-px bg-white/10" />
          {(
            [
              ["emoji", "Emoji only"],
              ["all", "Everything"],
              ["text", "Text only"],
            ] as [Target, string][]
          ).map(([v, l]) => (
            <Chip key={v} active={scope === v} onClick={() => setScope(v)}>
              {l}
            </Chip>
          ))}
        </div>
        {overlayResults.length === 0 ? (
          <EmptyState title="Pick at least one overlay" />
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {overlayResults.map((r) => (
              <Row key={r.label} label={r.label} text={r.text} />
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Skin-tone sequences" description="Emoji that accept Fitzpatrick modifiers form one grapheme with the tone.">
        {toneable.length === 0 ? (
          <EmptyState title="No skin-tone capable emoji in your text">Try adding {"\u{1F44B} \u{1F44D} \u{1F64C}"} from the picker.</EmptyState>
        ) : (
          <div className="space-y-2">
            {toneable.map((e) => {
              const variants = SKIN_TONES.map((t) => withSkinTone(e, t.modifier));
              return (
                <div key={e} className="flex flex-wrap items-center gap-2 rounded-xl border border-white/5 bg-black/20 p-2">
                  {variants.map((v, i) => (
                    <Button key={v} variant="ghost" className="h-11 text-2xl" onClick={() => composer.current?.insert(v)} title={`Insert ${SKIN_TONES[i].label}`}>
                      {v}
                    </Button>
                  ))}
                  <CopyButton text={variants.join("")} meta={{ label: "all tones" }} size="xs" className="ml-auto" label="Copy row" />
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Emoji presets</h2>
        <ResultGrid items={emojiItems} />
      </section>
    </div>
  );
}

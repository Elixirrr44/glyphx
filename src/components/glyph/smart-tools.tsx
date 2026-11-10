"use client";

import { Dices, Save, Shuffle, WandSparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEngineOptions } from "@/hooks/use-store";
import { setDesignerDraft } from "@/lib/draft";
import { generateNicknames, mixEffects, NICK_THEMES, type NickTheme, randomStyle } from "@/lib/generators";
import { actions } from "@/lib/storage";
import { applyLayers } from "@/lib/unicode/engine";
import { newSeed } from "@/lib/unicode/random";
import { Chip, CopyButton, GlyphText, IconAction } from "./primitives";

function OutputRow({ text, label, children }: { text: string; label: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-black/20 p-2 pl-3">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <GlyphText text={text} size={20} className="max-h-24" />
      </div>
      {children}
      <CopyButton text={text} meta={{ label }} size="icon-sm" showLabel={false} />
    </div>
  );
}

export function RandomStyles({ text, count = 6 }: { text: string; count?: number }) {
  const options = useEngineOptions();
  const router = useRouter();
  const [seed, setSeed] = useState(20251109);
  const styles = useMemo(() => Array.from({ length: count }, (_, i) => randomStyle(seed + i * 7919)), [seed, count]);
  const sample = text || "GlyphX";
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Random recipes that combine compatible fonts, marks and frames.</p>
        <Button size="sm" variant="outline" onClick={() => setSeed(newSeed())}>
          <Dices /> Shuffle
        </Button>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {styles.map((s) => {
          const out = applyLayers(sample, s.layers, options);
          return (
            <OutputRow key={s.id} text={out} label={s.name}>
              <IconAction
                label="Save as preset"
                onClick={() => {
                  actions.saveCustomPreset({ name: s.name, description: "Saved from the random generator", layers: s.layers });
                  toast.success(`Saved \u{201C}${s.name}\u{201D} to your presets`);
                }}
              >
                <Save />
              </IconAction>
              <IconAction
                label="Edit in designer"
                onClick={() => {
                  setDesignerDraft({ name: s.name, layers: s.layers, text: sample });
                  router.push("/designer?draft=1");
                }}
              >
                <WandSparkles />
              </IconAction>
            </OutputRow>
          );
        })}
      </div>
    </div>
  );
}

export function MixedEffects({ text, count = 6 }: { text: string; count?: number }) {
  const options = useEngineOptions();
  const [seed, setSeed] = useState(7);
  const sample = text.trim() ? text : "Mix every word";
  const outputs = useMemo(
    () => Array.from({ length: count }, (_, i) => mixEffects(sample, seed + i * 101, options)),
    [sample, seed, count, options],
  );
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">A different effect on every word. Works best with a few words.</p>
        <Button size="sm" variant="outline" onClick={() => setSeed(newSeed())}>
          <Shuffle /> Remix
        </Button>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {outputs.map((o, i) => (
          <OutputRow key={i} text={o} label={`Mix #${i + 1}`} />
        ))}
      </div>
    </div>
  );
}

export function NicknameGenerator({ initial = "" }: { initial?: string }) {
  const options = useEngineOptions();
  const [base, setBase] = useState(initial);
  const [theme, setTheme] = useState<NickTheme>("gamer");
  const [seed, setSeed] = useState(42);
  const names = useMemo(() => generateNicknames(base, theme, seed, 12, options), [base, theme, seed, options]);
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={base}
          onChange={(e) => setBase(e.target.value)}
          placeholder="Your name (leave empty for random names)"
          aria-label="Base name"
          maxLength={24}
          className="sm:max-w-xs"
        />
        <Button size="default" variant="outline" onClick={() => setSeed(newSeed())}>
          <Dices /> Generate more
        </Button>
      </div>
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1" aria-label="Nickname themes">
        {(Object.keys(NICK_THEMES) as NickTheme[]).map((t) => (
          <Chip key={t} active={t === theme} onClick={() => setTheme(t)}>
            {NICK_THEMES[t].label}
          </Chip>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {names.map((n) => (
          <OutputRow key={n.text} text={n.text} label={n.plain} />
        ))}
      </div>
    </div>
  );
}

export function SmartTools({ text }: { text: string }) {
  return (
    <Tabs defaultValue="random" className="gap-4">
      <TabsList className="w-full sm:w-fit">
        <TabsTrigger value="random">Random style</TabsTrigger>
        <TabsTrigger value="mixed">Mixed effects</TabsTrigger>
        <TabsTrigger value="nick">Nicknames</TabsTrigger>
      </TabsList>
      <TabsContent value="random">
        <RandomStyles text={text} />
      </TabsContent>
      <TabsContent value="mixed">
        <MixedEffects text={text} />
      </TabsContent>
      <TabsContent value="nick">
        <NicknameGenerator />
      </TabsContent>
    </Tabs>
  );
}

"use client";

import { Download, Keyboard, Palette, Settings, Shield, Trash, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField, SliderField, SwitchField } from "@/components/glyph/controls";
import { GlyphText, PageHeader, Panel } from "@/components/glyph/primitives";
import { useSettings } from "@/hooks/use-store";
import { type Accent, actions, clearAllData, exportData, historyStore, importData, type Settings as S } from "@/lib/storage";
import { applyLayers } from "@/lib/unicode/engine";
import { hasNativeSegmenter } from "@/lib/unicode/segment";
import { cn } from "@/lib/utils";

const ACCENTS: { id: Accent; label: string; colors: [string, string] }[] = [
  { id: "violet", label: "Neon violet", colors: ["oklch(0.68 0.24 300)", "oklch(0.7 0.19 255)"] },
  { id: "blue", label: "Electric blue", colors: ["oklch(0.68 0.19 255)", "oklch(0.8 0.14 210)"] },
  { id: "cyan", label: "Cyber cyan", colors: ["oklch(0.8 0.14 205)", "oklch(0.68 0.24 300)"] },
  { id: "pink", label: "Hot pink", colors: ["oklch(0.72 0.22 350)", "oklch(0.68 0.24 300)"] },
];

const SHORTCUTS: [string, string][] = [
  ["/", "Focus the text box"],
  ["Enter / Space", "Copy a focused preview card"],
  ["Ctrl/Cmd + Z", "Undo in the Custom Designer"],
  ["Ctrl/Cmd + Shift + Z, Ctrl + Y", "Redo in the Custom Designer"],
  ["Tab / Shift + Tab", "Move between controls"],
  ["Esc", "Close dialogs and menus"],
];

export function SettingsView() {
  const s = useSettings();
  const set = (patch: Partial<S>) => actions.updateSettings(patch);
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const zalgoSample = applyLayers("Preview", [{ type: "zalgo", up: 30, mid: 4, down: 30, seed: 9, variance: 0 }], {
    maxMarksPerGrapheme: s.maxMarksPerGrapheme,
  });

  const download = () => {
    const blob = new Blob([exportData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `glyphx-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const upload = async (file: File) => {
    try {
      const res = importData(await file.text());
      toast.success("Backup imported", { description: `${res.presets} presets, ${res.texts} saved texts, ${res.favorites} favorites` });
    } catch (e) {
      toast.error("Import failed", { description: e instanceof Error ? e.message : "Invalid file" });
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader icon={<Settings className="size-5" />} title="Settings" description="Preferences are saved in this browser's local storage." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={<span className="flex items-center gap-2"><Palette className="size-4" /> Appearance</span>} bodyClassName="space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-medium">Accent</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Accent color">
              {ACCENTS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  role="radio"
                  aria-checked={s.accent === a.id}
                  onClick={() => set({ accent: a.id })}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border p-2 text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    s.accent === a.id ? "border-white/40 bg-white/5" : "border-white/10 hover:border-white/20",
                  )}
                >
                  <span className="h-6 w-full rounded-md" style={{ background: `linear-gradient(100deg, ${a.colors[0]}, ${a.colors[1]})` }} />
                  {a.label}
                </button>
              ))}
            </div>
          </div>
          <SelectField
            label="Preview font"
            value={s.previewFont}
            onChange={(previewFont) => set({ previewFont })}
            options={[
              { value: "system", label: "System UI (closest to real apps)" },
              { value: "inter", label: "Inter" },
              { value: "serif", label: "Serif" },
              { value: "mono", label: "Monospace" },
              { value: "math", label: "Noto Sans Math (best mark coverage)" },
            ]}
          />
          <SliderField label="Preview size" value={s.previewFontSize} min={14} max={44} onChange={(previewFontSize) => set({ previewFontSize })} format={(v) => `${v}px`} />
          <div className="rounded-xl bg-black/25 p-3">
            <GlyphText text={applyLayers("Preview G\u{20E4}A\u{20E4}N\u{20E4}G\u{20E4} \u{1F525}", [{ type: "font", font: "boldScript" }])} />
          </div>
          <SwitchField label="Reduce motion" hint="Turns off animations across the app." checked={s.reduceMotion} onChange={(reduceMotion) => set({ reduceMotion })} />
          <SwitchField label="Copy notifications" checked={s.copyToasts} onChange={(copyToasts) => set({ copyToasts })} />
          <SwitchField
            label="Compatibility indicators"
            hint="Show the coloured dot that flags effects which may render differently."
            checked={s.showCompatWarnings}
            onChange={(showCompatWarnings) => set({ showCompatWarnings })}
          />
        </Panel>

        <Panel title={<span className="flex items-center gap-2"><Shield className="size-4" /> Unicode engine</span>} bodyClassName="space-y-5">
          <SliderField
            label="Max combining marks per character"
            value={s.maxMarksPerGrapheme}
            min={4}
            max={64}
            onChange={(maxMarksPerGrapheme) => set({ maxMarksPerGrapheme })}
            hint="Caps zalgo and stacked overlays so huge inputs can't freeze the page or break apps you paste into."
          />
          <div className="rounded-xl bg-black/25 px-3 py-8">
            <GlyphText text={zalgoSample} size={24} />
          </div>
          <SelectField
            label="Input normalization"
            value={s.inputNormalization}
            onChange={(inputNormalization) => set({ inputNormalization })}
            options={[
              { value: "NFC", label: "NFC \u{2014} compose accents (recommended)" },
              { value: "NFD", label: "NFD \u{2014} decompose accents" },
              { value: "none", label: "None \u{2014} keep input exactly as typed" },
            ]}
          />
          <SelectField
            label="Output normalization"
            value={s.outputNormalization}
            onChange={(outputNormalization) => set({ outputNormalization })}
            options={[
              { value: "none", label: "None \u{2014} keep mark order exactly (recommended)" },
              { value: "NFC", label: "NFC \u{2014} compose where possible (may reorder stacked marks)" },
            ]}
          />
          <p className="text-[11px] text-muted-foreground">
            GlyphX never applies NFKC/NFKD: compatibility normalization would turn styled letters like {"\u{1D400}"} back into plain A.
            Grapheme segmentation: {hasNativeSegmenter() ? "Intl.Segmenter (native)" : "built-in fallback"}.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="sample-text">Sample text (used when the text box is empty)</Label>
            <Input id="sample-text" key={s.sampleText} defaultValue={s.sampleText} maxLength={200} onBlur={(e) => set({ sampleText: e.target.value })} />
          </div>
          <SelectField
            label="Batch copy separator"
            value={s.batchSeparator}
            onChange={(batchSeparator) => set({ batchSeparator })}
            options={[
              { value: "newline", label: "One per line" },
              { value: "blankline", label: "Blank line between" },
              { value: "space", label: "Spaces" },
            ]}
          />
        </Panel>

        <Panel title="Data" description="Back up or move your presets, favorites and history." bodyClassName="space-y-4">
          <SliderField label="Copy history size" value={s.historyLimit} min={10} max={200} step={10} onChange={(historyLimit) => set({ historyLimit })} />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={download}>
              <Download /> Export backup
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload /> Import backup
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
                e.target.value = "";
              }}
            />
            <Button variant="ghost" onClick={() => historyStore.reset()}>
              Clear copy history
            </Button>
            <Button variant="destructive" onClick={() => setConfirmClear(true)}>
              <Trash /> Reset everything
            </Button>
          </div>
        </Panel>

        <Panel title={<span className="flex items-center gap-2"><Keyboard className="size-4" /> Keyboard shortcuts</span>}>
          <dl className="space-y-2 text-sm">
            {SHORTCUTS.map(([k, d]) => (
              <div key={k} className="flex items-center justify-between gap-3">
                <dt>
                  <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-xs">{k}</kbd>
                </dt>
                <dd className="text-right text-muted-foreground">{d}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>

      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent className="glass-strong">
          <DialogHeader>
            <DialogTitle>Reset all GlyphX data?</DialogTitle>
            <DialogDescription>
              This removes your settings, favorites, saved texts, custom presets and history from this browser. It can{"\u{2019}"}t be undone
              {"\u{2014}"} export a backup first if you want to keep them.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmClear(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                clearAllData();
                setConfirmClear(false);
                toast.success("All local data cleared");
              }}
            >
              Reset everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

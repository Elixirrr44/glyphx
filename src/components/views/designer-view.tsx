"use client";

import {
  BookmarkPlus,
  ChevronDown,
  ChevronUp,
  Copy as CopyIcon,
  Dices,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  ScanSearch,
  Trash,
  Undo2,
  WandSparkles,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { use, useEffect, useMemo, useRef, useState } from "react";
import { browser } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FieldRegistryProvider, useActiveField } from "@/components/designer/field-registry";
import { ADDABLE, defaultLayer, LAYER_META, LayerEditor } from "@/components/designer/layer-editors";
import { CompatPanelFor } from "@/components/glyph/compat";
import { CharPicker } from "@/components/glyph/pickers";
import { CopyButton, GlyphText, IconAction, PageHeader, Panel, StatPill } from "@/components/glyph/primitives";
import { TextComposer, type TextComposerHandle } from "@/components/glyph/text-composer";
import { useHistoryState } from "@/hooks/use-history-state";
import { useHotkey } from "@/hooks/use-hotkey";
import { useCustomPresets, useEngineOptions } from "@/hooks/use-store";
import { takeDesignerDraft } from "@/lib/draft";
import { randomStyle } from "@/lib/generators";
import { openInspector } from "@/lib/inspector-store";
import { PRESET_BY_ID, PRESETS } from "@/lib/presets";
import { actions, customPresetsStore, workspaceStore } from "@/lib/storage";
import { type Layer, type LayerType, transform } from "@/lib/unicode/engine";
import { newSeed } from "@/lib/unicode/random";
import { cn } from "@/lib/utils";

interface EditableLayer {
  uid: string;
  enabled: boolean;
  layer: Layer;
}

interface Design {
  text: string;
  name: string;
  layers: EditableLayer[];
  /** Id of the custom preset being edited, if any. */
  sourceId?: string;
}

let uidCounter = 0;
const uid = () => `layer-${++uidCounter}`;
const wrapLayers = (layers: Layer[]): EditableLayer[] => layers.map((layer) => ({ uid: uid(), enabled: true, layer: structuredClone(layer) }));

const STARTER: Layer[] = [
  { type: "font", font: "sansBold" },
  { type: "marks", marks: "\u{20E4}", target: "nonspace" },
  { type: "wrap", prefix: "\u{2726} ", suffix: " \u{2726}" },
];

/** Build the starting design from ?preset= / ?draft=1, falling back to the starter stack. Client only. */
function designFromParams(params: URLSearchParams): Design {
  const text = workspaceStore.get();
  if (params.get("draft")) {
    const draft = takeDesignerDraft();
    if (draft) return { text: draft.text ?? text, name: draft.name, layers: wrapLayers(draft.layers) };
  }
  const presetId = params.get("preset");
  if (presetId) {
    const preset = PRESET_BY_ID.get(presetId) ?? customPresetsStore.get().find((p) => p.id === presetId);
    if (preset) {
      return {
        text,
        name: preset.custom ? preset.name : `${preset.name} remix`,
        layers: wrapLayers(preset.layers),
        sourceId: preset.custom ? preset.id : undefined,
      };
    }
  }
  return { text, name: "My style", layers: wrapLayers(STARTER) };
}

function PickerPanel({ onInsertMain }: { onInsertMain: (t: string) => void }) {
  const active = useActiveField();
  return (
    <Panel
      title="Character picker"
      description={
        <>
          Inserting into <span className="font-medium text-foreground">{active?.label ?? "Text"}</span>. Click a field to change target.
        </>
      }
      bodyClassName="p-3 sm:p-4"
    >
      <CharPicker onPick={(v) => (active ? active.insert(v) : onInsertMain(v))} height={220} />
    </Panel>
  );
}

export function DesignerView() {
  // The initial design is restored from local/session storage, which the server
  // can't see, so this subtree renders in the browser only (the Suspense fallback
  // is what gets prerendered).
  use(browser("The designer restores your text, draft and presets from browser storage."));
  const params = useSearchParams();
  const options = useEngineOptions();
  const custom = useCustomPresets();
  const composer = useRef<TextComposerHandle>(null);

  const history = useHistoryState<Design>(() => designFromParams(params));
  const { reset } = history;
  const design = history.value;
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDesc, setSaveDesc] = useState("");
  const [overwrite, setOverwrite] = useState(false);

  // Reload when the query changes while this view stays mounted (Next keeps routes alive).
  const loadedKey = useRef(params.toString());
  useEffect(() => {
    const key = params.toString();
    if (loadedKey.current === key) return;
    loadedKey.current = key;
    reset(designFromParams(params));
  }, [params, reset]);

  const activeLayers = useMemo(() => design.layers.filter((l) => l.enabled).map((l) => l.layer), [design.layers]);
  const result = useMemo(() => transform(design.text || "GlyphX", activeLayers, options), [design.text, activeLayers, options]);

  const update = (patch: Partial<Design>, key?: string) => {
    history.set({ ...design, ...patch }, key);
    // Share typed text with the other tools.
    if (patch.text !== undefined) workspaceStore.set(patch.text);
  };
  const updateLayer = (id: string, layer: Layer, key?: string) =>
    update({ layers: design.layers.map((l) => (l.uid === id ? { ...l, layer } : l)) }, key ? `${id}:${key}` : undefined);
  const toggleLayer = (id: string) => update({ layers: design.layers.map((l) => (l.uid === id ? { ...l, enabled: !l.enabled } : l)) });
  const removeLayer = (id: string) => update({ layers: design.layers.filter((l) => l.uid !== id) });
  const duplicateLayer = (id: string) => {
    const i = design.layers.findIndex((l) => l.uid === id);
    const copy = { ...design.layers[i], uid: uid(), layer: structuredClone(design.layers[i].layer) };
    update({ layers: [...design.layers.slice(0, i + 1), copy, ...design.layers.slice(i + 1)] });
  };
  const moveLayer = (id: string, dir: -1 | 1) => {
    const i = design.layers.findIndex((l) => l.uid === id);
    const j = i + dir;
    if (j < 0 || j >= design.layers.length) return;
    const next = [...design.layers];
    [next[i], next[j]] = [next[j], next[i]];
    update({ layers: next });
  };
  const addLayer = (type: LayerType) => {
    const layer = defaultLayer(type);
    if (layer.type === "zalgo" || layer.type === "glitchChars") layer.seed = newSeed();
    // Structural wrappers go last; everything else goes before the first wrapper.
    const wrapperAt = design.layers.findIndex((l) => ["wrap", "ansi", "linePrefix"].includes(l.layer.type));
    const at = ["wrap", "ansi", "linePrefix"].includes(type) || wrapperAt === -1 ? design.layers.length : wrapperAt;
    const entry = { uid: uid(), enabled: true, layer };
    update({ layers: [...design.layers.slice(0, at), entry, ...design.layers.slice(at)] });
  };
  const randomize = () => {
    const s = randomStyle(newSeed());
    update({ layers: wrapLayers(s.layers), name: s.name, sourceId: undefined });
  };

  useHotkey("mod+z", () => history.undo(), { allowInInputs: true });
  useHotkey("mod+shift+z", () => history.redo(), { allowInInputs: true });
  useHotkey("mod+y", () => history.redo(), { allowInInputs: true });

  const openSave = () => {
    setSaveName(design.name);
    setSaveDesc("");
    setOverwrite(!!design.sourceId);
    setSaveOpen(true);
  };
  const doSave = () => {
    const layers = activeLayers;
    if (layers.length === 0) {
      toast.error("Add at least one enabled layer first");
      return;
    }
    if (overwrite && design.sourceId) {
      actions.updateCustomPreset(design.sourceId, { name: saveName.trim() || design.name, description: saveDesc, layers: structuredClone(layers) });
      toast.success("Preset updated");
    } else {
      const p = actions.saveCustomPreset({ name: saveName, description: saveDesc, layers });
      update({ sourceId: p.id, name: p.name });
      toast.success(`Saved \u{201C}${p.name}\u{201D}`, { description: "Find it in Presets and the Text Generator." });
    }
    setSaveOpen(false);
  };

  const loadPreset = (id: string) => {
    const preset = PRESET_BY_ID.get(id) ?? custom.find((p) => p.id === id);
    if (!preset) return;
    update({ layers: wrapLayers(preset.layers), name: preset.custom ? preset.name : `${preset.name} remix`, sourceId: preset.custom ? preset.id : undefined });
  };

  return (
    <FieldRegistryProvider fallback={{ id: "main-text", label: "Text", insert: (t) => composer.current?.insert(t) }}>
      <div className="space-y-5">
        <PageHeader
          icon={<WandSparkles className="size-5" />}
          title="Custom Designer"
          description="Stack layers to build your own effect. Everything is undoable (Ctrl/Cmd + Z), and you can save the result as a preset."
          actions={
            <>
              <IconAction label="Undo (Ctrl+Z)" onClick={history.undo} disabled={!history.canUndo}>
                <Undo2 />
              </IconAction>
              <IconAction label="Redo (Ctrl+Shift+Z)" onClick={history.redo} disabled={!history.canRedo}>
                <Redo2 />
              </IconAction>
              <Button variant="outline" size="sm" onClick={randomize}>
                <Dices /> Random style
              </Button>
              <Button variant="ghost" size="sm" onClick={() => update({ layers: wrapLayers(STARTER), name: "My style", sourceId: undefined })}>
                <RotateCcw /> Reset
              </Button>
            </>
          }
        />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
          <div className="min-w-0 space-y-4">
            <TextComposer
              ref={composer}
              value={design.text}
              onChange={(text) => update({ text }, "text")}
              label="Text or emoji"
            />

            {/* Compact live preview for layouts where the output panel sits below the layers */}
            <div className="glass sticky top-16 z-10 flex items-center gap-2 rounded-2xl p-2 pl-3 xl:hidden">
              <GlyphText text={result.output} size={22} className="max-h-20 min-w-0 flex-1" />
              <CopyButton text={result.output} meta={{ label: design.name }} size="sm" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <h2 className="mr-auto text-base font-semibold">
                Layers <span className="text-sm font-normal text-muted-foreground">applied top to bottom</span>
              </h2>
              <Select value="" onValueChange={loadPreset}>
                <SelectTrigger size="sm" className="w-44" aria-label="Start from a preset">
                  <SelectValue placeholder={"Start from preset\u{2026}"} />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {custom.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>My presets</SelectLabel>
                      {custom.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  <SelectGroup>
                    <SelectLabel>Library</SelectLabel>
                    {PRESETS.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="neon-button border-0">
                    <Plus /> Add layer
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-96 w-72">
                  <DropdownMenuLabel>Add a layer</DropdownMenuLabel>
                  {ADDABLE.map((type) => (
                    <DropdownMenuItem key={type} onSelect={() => addLayer(type)} className="flex-col items-start gap-0">
                      <span className="font-medium">{LAYER_META[type].title}</span>
                      <span className="text-xs text-muted-foreground">{LAYER_META[type].description}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {design.layers.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-muted-foreground">
                No layers yet. Add one, pick a preset, or hit <span className="text-foreground">Random style</span>.
              </div>
            )}

            <ol className="space-y-3" aria-label="Layer stack">
              <AnimatePresence initial={false}>
                {design.layers.map((entry, i) => (
                  <motion.li
                    key={entry.uid}
                    layout="position"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    className={cn("glass rounded-2xl", !entry.enabled && "opacity-55")}
                  >
                    <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2">
                      <span className="grid size-6 place-items-center rounded-md bg-neon-1/15 font-mono text-xs text-neon-1">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{LAYER_META[entry.layer.type].title}</p>
                      </div>
                      <Switch
                        checked={entry.enabled}
                        onCheckedChange={() => toggleLayer(entry.uid)}
                        aria-label={`${entry.enabled ? "Disable" : "Enable"} ${LAYER_META[entry.layer.type].title} layer`}
                      />
                      <IconAction label="Move up" onClick={() => moveLayer(entry.uid, -1)} disabled={i === 0}>
                        <ChevronUp />
                      </IconAction>
                      <IconAction label="Move down" onClick={() => moveLayer(entry.uid, 1)} disabled={i === design.layers.length - 1}>
                        <ChevronDown />
                      </IconAction>
                      <IconAction label="Duplicate layer" onClick={() => duplicateLayer(entry.uid)}>
                        <CopyIcon />
                      </IconAction>
                      <IconAction label="Remove layer" onClick={() => removeLayer(entry.uid)} className="hover:text-destructive">
                        <Trash />
                      </IconAction>
                    </div>
                    <div className="p-3 sm:p-4">
                      <LayerEditor layer={entry.layer} onChange={(layer, key) => updateLayer(entry.uid, layer, key)} />
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ol>
          </div>

          <div className="min-w-0 space-y-4 xl:sticky xl:top-6 xl:self-start">
            <Panel
              title={
                <input
                  value={design.name}
                  onChange={(e) => update({ name: e.target.value.slice(0, 60) }, "name")}
                  aria-label="Style name"
                  className="w-full bg-transparent font-heading text-base font-semibold outline-none focus:underline"
                />
              }
              bodyClassName="space-y-3"
            >
              <div className="rounded-xl bg-black/30 px-4 py-6">
                <GlyphText text={result.output} size={30} className="max-h-72" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <StatPill value={result.output.length} label="UTF-16" />
                <StatPill value={activeLayers.length} label="active layers" />
                {result.cappedMarks && <StatPill value="!" label="mark cap" tone="warn" />}
                {result.cappedLength && <StatPill value="!" label="length cap" tone="warn" />}
              </div>
              <div className="flex flex-wrap gap-2">
                <CopyButton text={result.output} meta={{ label: design.name }} size="default" className="flex-1" />
                <Button variant="outline" onClick={openSave}>
                  <Save /> Save preset
                </Button>
                <IconAction
                  label="Save text to favorites"
                  onClick={() => {
                    actions.saveText(result.output, design.name);
                    toast.success("Saved to Favorites \u{2192} Saved texts");
                  }}
                >
                  <BookmarkPlus />
                </IconAction>
                <IconAction label="Inspect characters" onClick={() => openInspector(result.output, design.name)}>
                  <ScanSearch />
                </IconAction>
              </div>
            </Panel>
            <PickerPanel onInsertMain={(t) => composer.current?.insert(t)} />
            <Panel title="Compatibility">
              <CompatPanelFor text={result.output} compact />
            </Panel>
          </div>
        </div>
      </div>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="glass-strong sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save as preset</DialogTitle>
            <DialogDescription>Saved presets live in this browser and appear under Custom Effects.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="preset-name">Name</Label>
              <Input id="preset-name" value={saveName} maxLength={60} onChange={(e) => setSaveName(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="preset-desc">Description (optional)</Label>
              <Textarea id="preset-desc" value={saveDesc} maxLength={200} onChange={(e) => setSaveDesc(e.target.value)} rows={2} />
            </div>
            {design.sourceId && (
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={overwrite} onCheckedChange={setOverwrite} /> Update the existing preset instead of creating a new one
              </label>
            )}
            <div className="rounded-lg bg-black/30 p-3">
              <GlyphText text={result.output} size={22} className="max-h-24" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button className="neon-button border-0" onClick={doSave}>
              <Save /> {overwrite && design.sourceId ? "Update preset" : "Save preset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FieldRegistryProvider>
  );
}

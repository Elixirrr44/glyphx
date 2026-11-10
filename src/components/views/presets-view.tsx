"use client";

import { Download, Heart, Library, Pencil, Search, Trash, Upload, WandSparkles } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompatDot } from "@/components/glyph/compat";
import { Chip, CopyButton, EmptyState, GlyphText, IconAction, PageHeader } from "@/components/glyph/primitives";
import { useCustomPresets, useEngineOptions, useFavoriteSet, useSettings, useWorkspaceText } from "@/hooks/use-store";
import { CATEGORIES, type CategoryId, describeLayer, type Preset, PRESETS } from "@/lib/presets";
import { actions, asPresetArray, customPresetsStore, makeId } from "@/lib/storage";
import { applyLayers, type EngineOptions } from "@/lib/unicode/engine";
import { cn } from "@/lib/utils";

function PresetRow({ preset, text, options, favorite }: { preset: Preset; text: string; options: EngineOptions; favorite: boolean }) {
  const output = useMemo(() => applyLayers(text, preset.layers, options), [text, preset.layers, options]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(preset.name);
  return (
    <li className="cv-auto glass flex flex-col gap-3 rounded-2xl p-3 sm:flex-row sm:items-center">
      <div className="min-w-0 sm:w-56">
        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              actions.updateCustomPreset(preset.id, { name: name.trim() || preset.name });
              setEditing(false);
            }}
            className="flex gap-1"
          >
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoFocus aria-label="Preset name" />
            <Button type="submit" size="sm">
              Save
            </Button>
          </form>
        ) : (
          <div className="flex items-center gap-1.5">
            <p className="truncate font-semibold">{preset.name}</p>
            <CompatDot text={output} />
          </div>
        )}
        <p className="line-clamp-2 text-xs text-muted-foreground">{preset.description || "\u{2014}"}</p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {preset.layers.map((l, i) => (
            <Badge key={i} variant="outline" className="glyph max-w-full truncate font-normal">
              {describeLayer(l)}
            </Badge>
          ))}
        </div>
      </div>
      <div className="min-w-0 flex-1 rounded-xl bg-black/25 px-3 py-2">
        <GlyphText text={output} className="max-h-28" />
      </div>
      <div className="flex items-center gap-1 self-end sm:self-center">
        <IconAction label={favorite ? "Remove from favorites" : "Add to favorites"} active={favorite} onClick={() => actions.toggleFavorite(preset.id)}>
          <Heart className={cn(favorite && "fill-current")} />
        </IconAction>
        <Button asChild size="icon-sm" variant="ghost" className="text-muted-foreground hover:text-foreground">
          <Link href={`/designer?preset=${encodeURIComponent(preset.id)}`} aria-label={`Open ${preset.name} in designer`} title="Open in designer">
            <WandSparkles />
          </Link>
        </Button>
        {preset.custom && (
          <>
            <IconAction label="Rename" onClick={() => setEditing((v) => !v)}>
              <Pencil />
            </IconAction>
            <IconAction
              label="Delete preset"
              className="hover:text-destructive"
              onClick={() => {
                actions.deleteCustomPreset(preset.id);
                toast(`Deleted \u{201C}${preset.name}\u{201D}`, {
                  action: { label: "Undo", onClick: () => customPresetsStore.set((l) => [preset, ...l]) },
                });
              }}
            >
              <Trash />
            </IconAction>
          </>
        )}
        <CopyButton text={output} meta={{ label: preset.name, styleId: preset.id }} size="icon-sm" showLabel={false} />
      </div>
    </li>
  );
}

export function PresetsView() {
  const [text] = useWorkspaceText();
  const settings = useSettings();
  const deferred = useDeferredValue(text || settings.sampleText);
  const options = useEngineOptions();
  const favorites = useFavoriteSet();
  const custom = useCustomPresets();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryId | "all">("all");
  const fileRef = useRef<HTMLInputElement>(null);
  const q = useDeferredValue(query).trim().toLowerCase();

  const library = useMemo(
    () =>
      PRESETS.filter(
        (p) =>
          (category === "all" || p.category === category) &&
          (!q || `${p.name} ${p.description} ${(p.tags ?? []).join(" ")}`.toLowerCase().includes(q)),
      ),
    [category, q],
  );
  const grouped = useMemo(() => CATEGORIES.map((c) => ({ c, list: library.filter((p) => p.category === c.id) })).filter((g) => g.list.length), [library]);

  const exportMine = () => {
    const blob = new Blob([JSON.stringify({ app: "glyphx", version: 1, customPresets: custom }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "glyphx-presets.json";
    a.click();
    URL.revokeObjectURL(url);
  };
  const importFile = async (file: File) => {
    try {
      const raw = JSON.parse(await file.text()) as { customPresets?: unknown } | unknown[];
      const list = asPresetArray(Array.isArray(raw) ? raw : (raw as { customPresets?: unknown }).customPresets) ?? [];
      if (list.length === 0) throw new Error("No presets found");
      // Re-id imported presets so they never collide with existing ones.
      const fresh = list.map((p) => ({ ...p, id: makeId("custom"), createdAt: Date.now() }));
      customPresetsStore.set((l) => [...fresh, ...l]);
      toast.success(`Imported ${fresh.length} preset${fresh.length === 1 ? "" : "s"}`);
    } catch (e) {
      toast.error("Import failed", { description: e instanceof Error ? e.message : "Invalid file" });
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<Library className="size-5" />}
        title="Presets"
        description={`${PRESETS.length} built-in recipes plus your own. Each shows the exact layers it applies.`}
      />
      <Tabs defaultValue="library" className="gap-4">
        <TabsList>
          <TabsTrigger value="library">Library ({PRESETS.length})</TabsTrigger>
          <TabsTrigger value="mine">My presets ({custom.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search presets" aria-label="Search presets" className="pl-8" />
          </div>
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
            <Chip active={category === "all"} onClick={() => setCategory("all")}>
              All
            </Chip>
            {CATEGORIES.map((c) => (
              <Chip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>
                {c.emoji} {c.label}
              </Chip>
            ))}
          </div>
          {grouped.length === 0 && <EmptyState title="No presets match" />}
          {grouped.map(({ c, list }) => (
            <section key={c.id} className="space-y-2" aria-labelledby={`cat-${c.id}`}>
              <h2 id={`cat-${c.id}`} className="flex items-center gap-2 text-base font-semibold">
                <span aria-hidden>{c.emoji}</span> {c.label}
                <span className="text-xs font-normal text-muted-foreground">
                  {list.length} {"\u{00B7}"} {c.description}
                </span>
              </h2>
              <ul className="space-y-2">
                {list.map((p) => (
                  <PresetRow key={p.id} preset={p} text={deferred} options={options} favorite={favorites.has(p.id)} />
                ))}
              </ul>
            </section>
          ))}
        </TabsContent>

        <TabsContent value="mine" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button asChild className="neon-button border-0">
              <Link href="/designer">
                <WandSparkles /> Create in designer
              </Link>
            </Button>
            <Button variant="outline" onClick={exportMine} disabled={custom.length === 0}>
              <Download /> Export JSON
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload /> Import JSON
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importFile(f);
                e.target.value = "";
              }}
            />
          </div>
          {custom.length === 0 ? (
            <EmptyState icon={<WandSparkles className="size-6" />} title="No custom presets yet">
              Build a style in the Custom Designer and press <em>Save preset</em>, or save one from the random generator.
            </EmptyState>
          ) : (
            <ul className="space-y-2">
              {custom.map((p) => (
                <PresetRow key={p.id} preset={p} text={deferred} options={options} favorite={favorites.has(p.id)} />
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

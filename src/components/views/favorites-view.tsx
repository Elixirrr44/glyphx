"use client";

import { Clock, Heart, ScanSearch, Trash } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopyButton, EmptyState, GlyphText, IconAction, PageHeader } from "@/components/glyph/primitives";
import { ResultGrid, useGenerated } from "@/components/glyph/results";
import { TextComposer } from "@/components/glyph/text-composer";
import {
  useAllPresets,
  useEngineOptions,
  useFavorites,
  useHistory,
  useRecent,
  useSavedTexts,
  useSettings,
  useWorkspaceText,
} from "@/hooks/use-store";
import { openInspector } from "@/lib/inspector-store";
import { PRESET_BY_ID } from "@/lib/presets";
import { actions, historyStore, recentStore } from "@/lib/storage";

const timeFmt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

function TextRow({ text, label, at, onRemove }: { text: string; label: string; at: number; onRemove: () => void }) {
  return (
    <li className="cv-auto glass flex items-center gap-2 rounded-2xl p-2 pl-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] text-muted-foreground">
          {label || "Text"} {"\u{00B7}"} <time dateTime={new Date(at).toISOString()}>{timeFmt.format(at)}</time>
        </p>
        <GlyphText text={text} size={20} className="max-h-24" />
      </div>
      <IconAction label="Inspect" onClick={() => openInspector(text, label || "Saved text")}>
        <ScanSearch />
      </IconAction>
      <IconAction label="Remove" onClick={onRemove} className="hover:text-destructive">
        <Trash />
      </IconAction>
      <CopyButton text={text} meta={{ label: label || "text" }} size="icon-sm" showLabel={false} />
    </li>
  );
}

export function FavoritesView() {
  const [text, setText] = useWorkspaceText();
  const deferred = useDeferredValue(text);
  const settings = useSettings();
  const options = useEngineOptions();
  const all = useAllPresets();
  const favIds = useFavorites();
  const recentIds = useRecent();
  const history = useHistory();
  const saved = useSavedTexts();

  const byId = useMemo(() => new Map(all.map((p) => [p.id, p])), [all]);
  const favPresets = useMemo(() => favIds.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => !!p), [favIds, byId]);
  const recentPresets = useMemo(() => recentIds.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => !!p), [recentIds, byId]);
  const sample = deferred || settings.sampleText;
  const favItems = useGenerated(favPresets, sample, options);
  const recentItems = useGenerated(recentPresets, sample, options);

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<Heart className="size-5" />}
        title="Favorites"
        description="Your favorite styles, saved texts, recently used styles and copy history — all stored locally in this browser."
      />
      <TextComposer value={text} onChange={setText} label="Preview text" />
      <Tabs defaultValue="styles" className="gap-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="styles">Styles ({favPresets.length})</TabsTrigger>
          <TabsTrigger value="texts">Saved texts ({saved.length})</TabsTrigger>
          <TabsTrigger value="recent">Recent ({recentPresets.length})</TabsTrigger>
          <TabsTrigger value="history">Copy history ({history.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="styles">
          <ResultGrid
            items={favItems}
            emptyState={
              <EmptyState icon={<Heart className="size-6" />} title="No favorite styles yet">
                Tap the heart on any style in the <Link className="text-neon-1 underline" href="/generator">Text Generator</Link>.
              </EmptyState>
            }
          />
        </TabsContent>

        <TabsContent value="texts">
          {saved.length === 0 ? (
            <EmptyState title="No saved texts">Use the bookmark button in the Designer or Glitch Studio to keep a finished result.</EmptyState>
          ) : (
            <ul className="space-y-2">
              {saved.map((t) => (
                <TextRow key={t.id} text={t.text} label={t.label} at={t.createdAt} onRemove={() => actions.removeSavedText(t.id)} />
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="recent" className="space-y-3">
          {recentItems.length > 0 && (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => recentStore.reset()}>
                <Trash /> Clear recent
              </Button>
            </div>
          )}
          <ResultGrid items={recentItems} emptyState={<EmptyState icon={<Clock className="size-6" />} title="Nothing used yet">Styles you copy show up here.</EmptyState>} />
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          {history.length === 0 ? (
            <EmptyState title="Copy history is empty">Everything you copy is listed here (up to {settings.historyLimit} items).</EmptyState>
          ) : (
            <>
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={() => historyStore.reset()}>
                  <Trash /> Clear history
                </Button>
              </div>
              <ul className="space-y-2">
                {history.map((h) => (
                  <TextRow
                    key={h.id}
                    text={h.text}
                    label={h.styleId ? (PRESET_BY_ID.get(h.styleId)?.name ?? byId.get(h.styleId)?.name ?? h.label) : h.label}
                    at={h.at}
                    onRemove={() => actions.removeHistory(h.id)}
                  />
                ))}
              </ul>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

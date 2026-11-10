"use client";

import { Heart, ListChecks, ScanSearch, SquareCheck, WandSparkles, X } from "lucide-react";
import Link from "next/link";
import { memo, type ReactNode, useCallback, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useCopy } from "@/hooks/use-copy";
import { useFavoriteSet, useSettings } from "@/hooks/use-store";
import { joinBatch } from "@/lib/clipboard";
import { openInspector } from "@/lib/inspector-store";
import { CATEGORY_BY_ID, type CategoryId, type Preset } from "@/lib/presets";
import { actions } from "@/lib/storage";
import { applyLayers, type EngineOptions } from "@/lib/unicode/engine";
import { cn } from "@/lib/utils";
import { CompatDot } from "./compat";
import { DiscordPreview } from "./discord-preview";
import { CopyButton, EmptyState, GlyphText, IconAction } from "./primitives";

export interface ResultItem {
  id: string;
  name: string;
  category: CategoryId;
  description?: string;
  output: string;
  custom?: boolean;
}

/** Run every preset over the text. Memoised by the caller's inputs. */
export function useGenerated(presets: Preset[], text: string, options: EngineOptions): ResultItem[] {
  return useMemo(
    () =>
      presets.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        description: p.description,
        custom: p.custom,
        output: applyLayers(text, p.layers, options),
      })),
    [presets, text, options],
  );
}

interface CardProps {
  item: ResultItem;
  favorite: boolean;
  selectable: boolean;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  index: number;
  showDescription?: boolean;
}

export const ResultCard = memo(function ResultCard({
  item,
  favorite,
  selectable,
  selected,
  onToggleSelect,
  index,
  showDescription = true,
}: CardProps) {
  const copy = useCopy();
  const category = CATEGORY_BY_ID[item.category];
  const doCopy = () => copy(item.output, { label: item.name, styleId: item.id });

  return (
    <article
      style={index < 18 ? { animationDelay: `${index * 15}ms` } : undefined}
      className={cn(
        "cv-auto group glass animate-in fade-in fill-mode-backwards duration-300 relative flex flex-col rounded-2xl transition-[border-color,box-shadow] hover:border-neon-1/30 hover:shadow-[0_10px_40px_-20px_var(--neon-1)]",
        selected && "border-neon-1/60 shadow-[0_0_0_1px_var(--neon-1)]",
      )}
      aria-label={item.name}
    >
      <div className="flex items-center gap-2 px-3 pt-3">
        {selectable && (
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggleSelect(item.id)}
            aria-label={`Select ${item.name}`}
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-sm font-semibold">{item.name}</h3>
            <CompatDot text={item.output} />
          </div>
          <p className="truncate text-[11px] text-muted-foreground">
            {category?.label ?? item.category}
            {item.custom && " \u{00B7} yours"}
          </p>
        </div>
        <div className="flex items-center opacity-80 transition-opacity group-hover:opacity-100">
          <IconAction label={favorite ? "Remove from favorites" : "Add to favorites"} active={favorite} onClick={() => actions.toggleFavorite(item.id)}>
            <Heart className={cn(favorite && "fill-current")} />
          </IconAction>
          <IconAction label="Inspect characters" onClick={() => openInspector(item.output, item.name)}>
            <ScanSearch />
          </IconAction>
          <Button asChild size="icon-sm" variant="ghost" className="text-muted-foreground hover:text-foreground">
            <Link href={`/designer?preset=${encodeURIComponent(item.id)}`} aria-label={`Edit ${item.name} in the designer`} title="Open in designer">
              <WandSparkles />
            </Link>
          </Button>
        </div>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={doCopy}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            doCopy();
          }
        }}
        aria-label={`Copy ${item.name} output`}
        className="mx-3 mt-2 min-h-16 flex-1 cursor-copy rounded-xl bg-black/25 px-3 py-2.5 outline-none transition-colors hover:bg-black/35 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <GlyphText text={item.output} className="max-h-36" />
      </div>
      {item.category === "discord" && item.output && (
        <div className="mx-3 mt-2">
          <p className="mb-1 text-[10px] tracking-wide text-muted-foreground uppercase">Discord preview</p>
          <DiscordPreview text={item.output} />
        </div>
      )}

      <div className="flex items-center gap-2 px-3 pt-2 pb-3">
        {showDescription && item.description ? (
          <p className="line-clamp-1 flex-1 text-xs text-muted-foreground" title={item.description}>
            {item.description}
          </p>
        ) : (
          <span className="flex-1" />
        )}
        <CopyButton text={item.output} meta={{ label: item.name, styleId: item.id }} size="xs" />
      </div>
    </article>
  );
});

export function ResultGrid({
  items,
  emptyState,
  toolbarExtra,
  columns = "sm:grid-cols-2 xl:grid-cols-3",
}: {
  items: ResultItem[];
  emptyState?: ReactNode;
  toolbarExtra?: ReactNode;
  columns?: string;
}) {
  const favorites = useFavoriteSet();
  const settings = useSettings();
  const copy = useCopy();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const visibleSelected = items.filter((i) => selected.has(i.id));
  const copyMany = (list: ResultItem[], label: string) =>
    copy(
      joinBatch(
        list.map((i) => i.output),
        settings.batchSeparator,
      ),
      { label },
    );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {items.length} style{items.length === 1 ? "" : "s"}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {toolbarExtra}
          <Button
            size="sm"
            variant={selecting ? "secondary" : "outline"}
            onClick={() => {
              setSelecting((s) => !s);
              if (selecting) setSelected(new Set());
            }}
            aria-pressed={selecting}
          >
            {selecting ? <X /> : <ListChecks />} {selecting ? "Done" : "Select"}
          </Button>
          {selecting && (
            <>
              <Button size="sm" variant="outline" onClick={() => setSelected(new Set(items.map((i) => i.id)))}>
                <SquareCheck /> All
              </Button>
              <Button size="sm" className="neon-button border-0" disabled={visibleSelected.length === 0} onClick={() => copyMany(visibleSelected, `${visibleSelected.length} styles`)}>
                Copy selected ({visibleSelected.length})
              </Button>
            </>
          )}
          {!selecting && (
            <Button size="sm" variant="outline" disabled={items.length === 0} onClick={() => copyMany(items, `all ${items.length} styles`)}>
              Copy all
            </Button>
          )}
        </div>
      </div>
      {items.length === 0 ? (
        (emptyState ?? <EmptyState title="No styles match" />)
      ) : (
        <div className={cn("grid grid-cols-1 gap-3", columns)}>
          {items.map((item, i) => (
            <ResultCard
              key={item.id}
              item={item}
              index={i}
              favorite={favorites.has(item.id)}
              selectable={selecting}
              selected={selected.has(item.id)}
              onToggleSelect={toggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CategoryBadge({ category }: { category: CategoryId }) {
  const c = CATEGORY_BY_ID[category];
  return (
    <Badge variant="secondary" className="gap-1">
      <span aria-hidden>{c.emoji}</span>
      {c.label}
    </Badge>
  );
}

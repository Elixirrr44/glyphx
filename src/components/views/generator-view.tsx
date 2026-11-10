"use client";

import { Search, Type } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Chip, EmptyState, PageHeader } from "@/components/glyph/primitives";
import { ResultGrid, useGenerated } from "@/components/glyph/results";
import { TextComposer } from "@/components/glyph/text-composer";
import { useAllPresets, useEngineOptions, useFavoriteSet, useSettings, useWorkspaceText } from "@/hooks/use-store";
import { CATEGORIES, type CategoryId } from "@/lib/presets";

type Filter = "all" | "favorites" | "mine" | CategoryId;
type Sort = "default" | "name" | "length";

export function GeneratorView() {
  const params = useSearchParams();
  const router = useRouter();
  const initial = params.get("category");
  const [filter, setFilter] = useState<Filter>(
    initial && (CATEGORIES.some((c) => c.id === initial) || initial === "favorites" || initial === "mine") ? (initial as Filter) : "all",
  );
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("default");
  const [text, setText] = useWorkspaceText();
  const deferredText = useDeferredValue(text);
  const deferredQuery = useDeferredValue(query);
  const settings = useSettings();
  const options = useEngineOptions();
  const all = useAllPresets();
  const favorites = useFavoriteSet();

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return all.filter((p) => {
      if (filter === "favorites" && !favorites.has(p.id)) return false;
      if (filter === "mine" && !p.custom) return false;
      if (filter !== "all" && filter !== "favorites" && filter !== "mine" && p.category !== filter) return false;
      if (!q) return true;
      return `${p.name} ${p.description} ${p.category} ${(p.tags ?? []).join(" ")}`.toLowerCase().includes(q);
    });
  }, [all, filter, deferredQuery, favorites]);

  const generated = useGenerated(filtered, deferredText || settings.sampleText, options);
  const items = useMemo(() => {
    if (sort === "name") return [...generated].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "length") return [...generated].sort((a, b) => a.output.length - b.output.length);
    return generated;
  }, [generated, sort]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: all.length, favorites: 0, mine: 0 };
    for (const p of all) {
      c[p.category] = (c[p.category] ?? 0) + 1;
      if (favorites.has(p.id)) c.favorites++;
      if (p.custom) c.mine++;
    }
    return c;
  }, [all, favorites]);

  const selectFilter = (f: Filter) => {
    setFilter(f);
    router.replace(f === "all" ? "/generator" : `/generator?category=${f}`, { scroll: false });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<Type className="size-5" />}
        title="Text Generator"
        description="Every style in the library, generated live from your text. Search, filter, pick several and copy them in one go."
      />
      <TextComposer value={text} onChange={setText} />

      <div className="glass sticky top-14 z-20 -mx-1 space-y-2 rounded-2xl p-2 lg:top-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={"Search styles (triangle, gothic, bubble, discord\u{2026})"}
              aria-label="Search styles"
              className="pl-8"
            />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
            <SelectTrigger className="sm:w-44" aria-label="Sort styles">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Library order</SelectItem>
              <SelectItem value="name">Name A{"\u{2013}"}Z</SelectItem>
              <SelectItem value="length">Shortest output</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto" aria-label="Filter by category">
          <Chip active={filter === "all"} onClick={() => selectFilter("all")}>
            All <span className="opacity-60">{counts.all}</span>
          </Chip>
          <Chip active={filter === "favorites"} onClick={() => selectFilter("favorites")}>
            {"\u{2665}"} Favorites <span className="opacity-60">{counts.favorites}</span>
          </Chip>
          {CATEGORIES.map((c) => (
            <Chip key={c.id} active={filter === c.id} onClick={() => selectFilter(c.id)}>
              <span aria-hidden>{c.emoji}</span> {c.label} <span className="opacity-60">{counts[c.id] ?? 0}</span>
            </Chip>
          ))}
          <Chip active={filter === "mine"} onClick={() => selectFilter("mine")}>
            My presets <span className="opacity-60">{counts.mine}</span>
          </Chip>
        </div>
      </div>

      <ResultGrid
        items={items}
        emptyState={
          <EmptyState title={filter === "favorites" ? "No favorites yet" : filter === "mine" ? "No custom presets yet" : "No styles match your search"}>
            {filter === "favorites"
              ? "Tap the heart on any style to keep it here."
              : filter === "mine"
                ? "Build one in the Custom Designer and save it."
                : "Try another keyword or category."}
          </EmptyState>
        }
      />
    </div>
  );
}

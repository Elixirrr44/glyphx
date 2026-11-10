"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { PICKER_CATEGORIES, type PickerItem } from "@/lib/data/charsets";
import { EMOJI_CATEGORIES, flagRegion, SKIN_TONES, supportsSkinTone, withSkinTone } from "@/lib/data/emoji";
import { codePointName } from "@/lib/unicode/inspect";
import { cn } from "@/lib/utils";
import { useNameTable } from "./inspector-panel";
import { Chip } from "./primitives";

function itemName(item: PickerItem): string {
  if (item.label) return item.label;
  const cps = Array.from(item.value);
  return cps
    .filter((c) => c !== "\u{FE0F}" && c !== "\u{200D}")
    .map((c) => codePointName(c.codePointAt(0)!))
    .filter(Boolean)
    .join(" + ");
}

/** Unicode character picker with categories and name search. */
export function CharPicker({ onPick, className, height = 260 }: { onPick: (value: string) => void; className?: string; height?: number }) {
  const namesLoaded = useNameTable();
  const [category, setCategory] = useState(PICKER_CATEGORIES[0].id);
  const [query, setQuery] = useState("");

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PICKER_CATEGORIES.find((c) => c.id === category)?.items ?? [];
    const seen = new Set<string>();
    const out: PickerItem[] = [];
    for (const c of PICKER_CATEGORIES) {
      for (const it of c.items) {
        if (seen.has(it.value)) continue;
        const hay = `${itemName(it)} ${c.label} ${it.value}`.toLowerCase();
        if (hay.includes(q)) {
          seen.add(it.value);
          out.push(it);
        }
      }
    }
    return out.slice(0, 300);
  }, [category, query, namesLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={namesLoaded ? "Search symbols by name (star, arrow, triangle\u{2026})" : "Loading Unicode names\u{2026}"}
          aria-label="Search symbols"
          className="pl-8"
        />
      </div>
      {!query && (
        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Symbol categories">
          {PICKER_CATEGORIES.map((c) => (
            <Chip key={c.id} active={c.id === category} onClick={() => setCategory(c.id)}>
              {c.label}
            </Chip>
          ))}
        </div>
      )}
      <div className="scrollbar-thin overflow-y-auto rounded-xl border border-white/5 bg-black/20 p-2" style={{ maxHeight: height }}>
        {items.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">No symbols found.</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1">
            {items.map((it) => {
              const name = itemName(it);
              const multi = Array.from(it.display).length > 3;
              return (
                <button
                  key={it.value}
                  type="button"
                  onClick={() => onPick(it.value)}
                  title={name || it.value}
                  aria-label={`Insert ${name || it.value}`}
                  className={cn(
                    "glyph grid h-11 place-items-center overflow-hidden rounded-lg text-xl outline-none transition-colors hover:bg-neon-1/20 focus-visible:ring-2 focus-visible:ring-ring",
                    multi && "col-span-3 text-sm",
                    /^[A-Z]{2,4}$/.test(it.display) && "font-mono text-[10px] text-muted-foreground",
                  )}
                >
                  {it.display}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

let regionNames: Intl.DisplayNames | null | undefined;
function regionName(code: string): string {
  if (regionNames === undefined) {
    try {
      regionNames = new Intl.DisplayNames(["en"], { type: "region" });
    } catch {
      regionNames = null;
    }
  }
  try {
    return regionNames?.of(code) ?? code;
  } catch {
    return code;
  }
}

function emojiName(e: string): string {
  const region = flagRegion(e);
  if (region) return `flag ${regionName(region)} ${region}`;
  return Array.from(e)
    .filter((c) => !/[\u{FE0F}\u{200D}\u{E0020}-\u{E007F}]/u.test(c))
    .map((c) => codePointName(c.codePointAt(0)!))
    .filter(Boolean)
    .join(" + ")
    .toLowerCase();
}

/** Emoji picker with categories, name search and skin-tone variants. */
export function EmojiPicker({ onPick, className, height = 280 }: { onPick: (emoji: string) => void; className?: string; height?: number }) {
  const namesLoaded = useNameTable();
  const [category, setCategory] = useState(EMOJI_CATEGORIES[0].id);
  const [query, setQuery] = useState("");
  const [tone, setTone] = useState<string>("");

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return EMOJI_CATEGORIES.find((c) => c.id === category)?.emojis ?? [];
    const out: string[] = [];
    for (const c of EMOJI_CATEGORIES) for (const e of c.emojis) if (emojiName(e).includes(q) || c.label.toLowerCase().includes(q)) out.push(e);
    return Array.from(new Set(out)).slice(0, 300);
  }, [category, query, namesLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={namesLoaded ? "Search emoji (fire, heart, flag japan\u{2026})" : "Loading emoji names\u{2026}"}
            aria-label="Search emoji"
            className="pl-8"
          />
        </div>
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Skin tone">
          {SKIN_TONES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={tone === t.modifier}
              aria-label={`${t.label} skin tone`}
              title={t.label}
              onClick={() => setTone(t.modifier)}
              className={cn(
                "grid size-8 place-items-center rounded-lg text-lg outline-none focus-visible:ring-2 focus-visible:ring-ring",
                tone === t.modifier ? "bg-neon-1/25 ring-1 ring-neon-1/50" : "hover:bg-white/5",
              )}
            >
              {"\u{1F44B}" + t.modifier}
            </button>
          ))}
        </div>
      </div>
      {!query && (
        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" aria-label="Emoji categories">
          {EMOJI_CATEGORIES.map((c) => (
            <Chip key={c.id} active={c.id === category} onClick={() => setCategory(c.id)} title={c.label}>
              <span aria-hidden>{c.icon}</span>
              <span className="hidden sm:inline">{c.label}</span>
            </Chip>
          ))}
        </div>
      )}
      <div className="scrollbar-thin overflow-y-auto rounded-xl border border-white/5 bg-black/20 p-2" style={{ maxHeight: height }}>
        {list.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">No emoji found.</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-1">
            {list.map((e) => {
              const value = tone && supportsSkinTone(e) ? withSkinTone(e, tone) : e;
              const name = emojiName(e);
              return (
                <button
                  key={e}
                  type="button"
                  onClick={() => onPick(value)}
                  title={name}
                  aria-label={`Insert ${name || value}`}
                  className="grid h-10 place-items-center rounded-lg text-2xl outline-none transition-transform hover:scale-110 hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {value}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

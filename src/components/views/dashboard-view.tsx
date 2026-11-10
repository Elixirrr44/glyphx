"use client";

import { ArrowRight, Clock, Sparkles } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/glyph/primitives";
import { ResultGrid, useGenerated } from "@/components/glyph/results";
import { SmartTools } from "@/components/glyph/smart-tools";
import { TextComposer } from "@/components/glyph/text-composer";
import { useAllPresets, useEngineOptions, useRecent, useSettings, useWorkspaceText } from "@/hooks/use-store";
import { CATEGORIES, FEATURED_IDS } from "@/lib/presets";

export function DashboardView() {
  const [text, setText] = useWorkspaceText();
  const deferred = useDeferredValue(text);
  const settings = useSettings();
  const options = useEngineOptions();
  const all = useAllPresets();
  const recentIds = useRecent();
  const preview = deferred || settings.sampleText;

  const featured = useMemo(() => {
    const byId = new Map(all.map((p) => [p.id, p]));
    return FEATURED_IDS.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => !!p);
  }, [all]);
  const recent = useMemo(() => {
    const byId = new Map(all.map((p) => [p.id, p]));
    return recentIds.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => !!p).slice(0, 6);
  }, [all, recentIds]);

  const featuredItems = useGenerated(featured, preview, options);
  const recentItems = useGenerated(recent, preview, options);

  return (
    <div className="space-y-8">
      <section className="animate-in space-y-5 duration-500 fade-in slide-in-from-bottom-2">
        <div className="space-y-2">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-neon-1/30 bg-neon-1/10 px-3 py-1 text-xs text-neon-1">
            <Sparkles className="size-3.5" /> {all.length} real Unicode styles {"\u{00B7}"} no images, no sign-up
          </p>
          <h1 className="text-3xl leading-tight font-bold sm:text-5xl">
            Type it. <span className="neon-text">Style it.</span> Copy it.
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Triangle overlays, zalgo, fancy fonts and emoji combos generated instantly on your device {"\u{2014}"} paste them anywhere
            that accepts text.
          </p>
        </div>
        <TextComposer value={text} onChange={setText} label="Your text" />
        {!text && (
          <p className="-mt-2 text-xs text-muted-foreground">
            Showing previews for {"\u{201C}"}
            {settings.sampleText}
            {"\u{201D}"} {"\u{2014}"} start typing to see your own text.
          </p>
        )}
      </section>

      {recentItems.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Clock className="size-4 text-neon-2" /> Recently used
          </h2>
          <ResultGrid items={recentItems} />
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Featured styles</h2>
            <p className="text-sm text-muted-foreground">Click any preview to copy it.</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/generator">
              All {all.length} styles <ArrowRight />
            </Link>
          </Button>
        </div>
        <ResultGrid items={featuredItems} />
      </section>

      <Panel title="Smart generators" description="Random recipes, per-word mixes and nickname ideas built from your text.">
        <SmartTools text={deferred} />
      </Panel>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Browse by category</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {CATEGORIES.map((c) => (
            <Link
              key={c.id}
              href={`/generator?category=${c.id}`}
              className="glass group rounded-2xl p-3 outline-none transition-colors hover:border-neon-1/40 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <div className="glyph text-2xl" aria-hidden>
                {c.emoji}
              </div>
              <div className="mt-1 text-sm font-medium">{c.label}</div>
              <div className="line-clamp-2 text-xs text-muted-foreground">{c.description}</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

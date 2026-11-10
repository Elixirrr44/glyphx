import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/glyph/page-skeleton";
import { GeneratorView } from "@/components/views/generator-view";

export const metadata: Metadata = {
  title: "Text Generator",
  description: "Every GlyphX style generated live from your text, with search, filters and batch copy.",
};

export default function GeneratorPage() {
  // Reads ?query params on the client, so it renders inside a Suspense boundary.
  return (
    <Suspense fallback={<PageSkeleton />}>
      <GeneratorView />
    </Suspense>
  );
}

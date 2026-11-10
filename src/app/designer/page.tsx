import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/glyph/page-skeleton";
import { DesignerView } from "@/components/views/designer-view";

export const metadata: Metadata = {
  title: "Custom Designer",
  description: "Stack Unicode layers, undo and redo, and save your own presets.",
};

export default function DesignerPage() {
  // Reads ?query params on the client, so it renders inside a Suspense boundary.
  return (
    <Suspense fallback={<PageSkeleton />}>
      <DesignerView />
    </Suspense>
  );
}

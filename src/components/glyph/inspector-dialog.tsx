"use client";

import { useSyncExternalStore } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { inspectorStore } from "@/lib/inspector-store";
import { CompatPanelFor, FontPreviewGrid } from "./compat";
import { InspectorPanel } from "./inspector-panel";
import { CopyButton, GlyphText } from "./primitives";

/** Global dialog opened from any result card via openInspector(). */
export function InspectorDialog() {
  const state = useSyncExternalStore(inspectorStore.subscribe, inspectorStore.get, inspectorStore.getServerSnapshot);
  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && inspectorStore.close()}>
      <DialogContent className="glass-strong flex max-h-[90dvh] flex-col gap-3 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b border-white/5 px-5 pt-5 pb-3">
          <DialogTitle className="font-heading text-lg">{state.title}</DialogTitle>
          <DialogDescription>Code points, names, compatibility and font previews for this output.</DialogDescription>
          <div className="mt-3 flex items-start gap-3 rounded-xl bg-black/30 p-3">
            <GlyphText text={state.text} className="max-h-32 flex-1" size={24} />
            <CopyButton text={state.text} meta={{ label: state.title }} />
          </div>
        </DialogHeader>
        <Tabs defaultValue="chars" className="min-h-0 flex-1 px-5 pb-5">
          <TabsList>
            <TabsTrigger value="chars">Characters</TabsTrigger>
            <TabsTrigger value="compat">Compatibility</TabsTrigger>
            <TabsTrigger value="fonts">Fonts</TabsTrigger>
          </TabsList>
          <div className="scrollbar-thin mt-3 min-h-0 flex-1 overflow-y-auto pr-1" style={{ maxHeight: "52dvh" }}>
            <TabsContent value="chars">{state.open && <InspectorPanel text={state.text} />}</TabsContent>
            <TabsContent value="compat">{state.open && <CompatPanelFor text={state.text} />}</TabsContent>
            <TabsContent value="fonts">{state.open && <FontPreviewGrid text={state.text} />}</TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

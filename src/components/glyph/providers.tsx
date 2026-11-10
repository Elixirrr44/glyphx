"use client";

import { MotionConfig } from "motion/react";
import { type ReactNode, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSettings } from "@/hooks/use-store";
import { InspectorDialog } from "./inspector-dialog";

/** Applies persisted settings to the document and mounts global UI. */
export function Providers({ children }: { children: ReactNode }) {
  const settings = useSettings();

  useEffect(() => {
    const el = document.documentElement;
    el.dataset.accent = settings.accent;
    el.dataset.previewFont = settings.previewFont;
    el.dataset.reduceMotion = String(settings.reduceMotion);
  }, [settings.accent, settings.previewFont, settings.reduceMotion]);

  return (
    <MotionConfig reducedMotion={settings.reduceMotion ? "always" : "user"}>
      <TooltipProvider delayDuration={250}>
        {children}
        <InspectorDialog />
        <Toaster position="bottom-right" visibleToasts={3} />
      </TooltipProvider>
    </MotionConfig>
  );
}

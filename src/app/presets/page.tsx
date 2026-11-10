import type { Metadata } from "next";
import { PresetsView } from "@/components/views/presets-view";

export const metadata: Metadata = {
  title: "Presets",
  description: "Browse the preset library and manage your own presets.",
};

export default function PresetsPage() {
  return <PresetsView />;
}

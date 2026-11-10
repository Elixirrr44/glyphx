import type { Metadata } from "next";
import { GlitchStudioView } from "@/components/views/glitch-studio-view";

export const metadata: Metadata = {
  title: "Glitch Studio",
  description: "Tune zalgo and glitch text with safe limits.",
};

export default function GlitchStudioPage() {
  return <GlitchStudioView />;
}

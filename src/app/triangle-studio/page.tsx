import type { Metadata } from "next";
import { TriangleStudioView } from "@/components/views/triangle-studio-view";

export const metadata: Metadata = {
  title: "Triangle Studio",
  description: "Copyable U+20E4 combining enclosing triangle overlays for text and emoji.",
};

export default function TriangleStudioPage() {
  return <TriangleStudioView />;
}

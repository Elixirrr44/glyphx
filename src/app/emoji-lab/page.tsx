import type { Metadata } from "next";
import { EmojiLabView } from "@/components/views/emoji-lab-view";

export const metadata: Metadata = {
  title: "Emoji Lab",
  description: "Emoji combinations, emoji overlays and skin-tone sequences.",
};

export default function EmojiLabPage() {
  return <EmojiLabView />;
}

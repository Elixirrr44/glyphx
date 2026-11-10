import type { Metadata } from "next";
import { FavoritesView } from "@/components/views/favorites-view";

export const metadata: Metadata = {
  title: "Favorites",
  description: "Favorite styles, saved texts, recent styles and copy history.",
};

export default function FavoritesPage() {
  return <FavoritesView />;
}

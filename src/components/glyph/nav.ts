import {
  Heart,
  LayoutDashboard,
  Library,
  type LucideIcon,
  Settings,
  FaceGrinning,
  Triangle,
  Type,
  WandSparkles,
  Zap,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, description: "Type and copy instantly" },
  { href: "/generator", label: "Text Generator", icon: Type, description: "All styles, searchable" },
  { href: "/emoji-lab", label: "Emoji Lab", icon: FaceGrinning, description: "Emoji combos and overlays" },
  { href: "/triangle-studio", label: "Triangle Studio", icon: Triangle, description: "U+20E4 triangle overlays" },
  { href: "/glitch-studio", label: "Glitch Studio", icon: Zap, description: "Zalgo and corruption" },
  { href: "/designer", label: "Custom Designer", icon: WandSparkles, description: "Layer your own effects" },
  { href: "/presets", label: "Presets", icon: Library, description: "Browse and manage styles" },
  { href: "/favorites", label: "Favorites", icon: Heart, description: "Saved styles, texts, history" },
  { href: "/settings", label: "Settings", icon: Settings, description: "Preferences and data" },
];

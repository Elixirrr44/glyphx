import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Noto_Sans_Math, Noto_Sans_Symbols_2, Space_Grotesk } from "next/font/google";
import { AppShell } from "@/components/glyph/app-shell";
import { Providers } from "@/components/glyph/providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });
// Symbol fonts used as preview fallbacks; not preloaded so they never block first paint.
const notoMath = Noto_Sans_Math({ weight: "400", variable: "--font-noto-math", display: "swap" });
const notoSym2 = Noto_Sans_Symbols_2({
  weight: "400",
  subsets: ["symbols"],
  variable: "--font-noto-sym2",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: { default: "GlyphX — Unicode Text & Emoji Designer", template: "%s · GlyphX" },
  description:
    "Type anything and instantly generate hundreds of real Unicode text effects — triangle overlays, zalgo, fancy fonts and emoji combos — ready to copy into Discord, Instagram, TikTok and games.",
  applicationName: "GlyphX",
};

export const viewport: Viewport = {
  themeColor: "#0d0b14",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${grotesk.variable} ${mono.variable} ${notoMath.variable} ${notoSym2.variable} antialiased`}
      data-accent="violet"
      data-preview-font="system"
      suppressHydrationWarning
    >
      <body>
        <div className="app-backdrop" aria-hidden />
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}

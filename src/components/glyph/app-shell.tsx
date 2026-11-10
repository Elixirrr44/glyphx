"use client";

import { Menu } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCustomPresets, useFavorites } from "@/hooks/use-store";
import { PRESETS } from "@/lib/presets";
import { NAV_ITEMS } from "./nav";

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      <span
        aria-hidden
        className="neon-button grid size-9 place-items-center rounded-xl text-lg font-semibold shadow-lg transition-transform group-hover:scale-105"
      >
        <span className="glyph -mt-0.5 leading-none">{"G\u{20E4}"}</span>
      </span>
      <span className={cn("font-heading text-lg font-bold tracking-tight", compact && "text-base")}>
        Glyph<span className="neon-text">X</span>
      </span>
    </Link>
  );
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({ idPrefix, onNavigate }: { idPrefix: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium outline-none transition-colors",
              "focus-visible:ring-3 focus-visible:ring-ring/50",
              active ? "text-foreground" : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId={`${idPrefix}-nav-pill`}
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-neon-1/25 to-neon-2/10 ring-1 ring-neon-1/30"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <Icon className={cn("relative size-4.5 shrink-0", active ? "text-neon-1" : "opacity-80")} aria-hidden />
            <span className="relative">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter() {
  const favorites = useFavorites();
  const custom = useCustomPresets();
  return (
    <div className="mt-auto space-y-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-muted-foreground">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="font-heading text-base font-semibold text-foreground">{PRESETS.length}</div>
          styles
        </div>
        <div>
          <div className="font-heading text-base font-semibold text-foreground">{favorites.length}</div>
          favorites
        </div>
        <div>
          <div className="font-heading text-base font-semibold text-foreground">{custom.length}</div>
          custom
        </div>
      </div>
      <p className="leading-relaxed">
        Press <kbd className="rounded border border-white/10 bg-white/5 px-1 font-mono">/</kbd> to jump to the text box.
        Everything runs locally on your device.
      </p>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <aside className="glass fixed inset-y-0 left-0 z-40 hidden w-64 flex-col gap-6 border-y-0 border-l-0 px-4 py-5 lg:flex">
        <Brand />
        <div className="scrollbar-thin -mx-1 flex-1 overflow-y-auto px-1">
          <NavList idPrefix="desktop" />
        </div>
        <SidebarFooter />
      </aside>

      <header className="glass sticky top-0 z-40 flex h-14 items-center justify-between border-x-0 border-t-0 px-4 lg:hidden">
        <Brand compact />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open navigation">
              <Menu />
            </Button>
          </DialogTrigger>
          <DialogContent
            className="glass-strong top-0 left-0 h-dvh w-72 max-w-[85vw] translate-x-0 translate-y-0 content-start gap-6 rounded-none rounded-r-2xl p-5 sm:max-w-72 data-open:slide-in-from-left-8 data-open:zoom-in-100 data-closed:zoom-out-100"
          >
            <DialogTitle className="sr-only">Navigation</DialogTitle>
            <DialogDescription className="sr-only">Choose a GlyphX tool</DialogDescription>
            <Brand />
            <NavList idPrefix="mobile" onNavigate={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </header>

      <main id="main" tabIndex={-1} className="min-h-dvh outline-none lg:pl-64">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</div>
      </main>
    </>
  );
}

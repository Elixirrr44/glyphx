"use client";

import { Check, Copy } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type CopyMeta, useCopy } from "@/hooks/use-copy";
import { useSettings } from "@/hooks/use-store";
import { cn } from "@/lib/utils";

/** Renders generated Unicode with the user's preview font and size. */
export function GlyphText({
  text,
  className,
  size,
  placeholder = "\u{2014}",
  style,
  as: Tag = "div",
}: {
  text: string;
  className?: string;
  size?: number;
  placeholder?: string;
  style?: CSSProperties;
  /** Use "span" inside buttons (rendered as a block). */
  as?: "div" | "span";
}) {
  const settings = useSettings();
  const fontSize = size ?? settings.previewFontSize;
  return (
    <Tag className={cn("glyph glyph-clip", Tag === "span" && "block", className)} style={{ fontSize, ...style }} lang="und">
      {text || <span className="text-muted-foreground/60">{placeholder}</span>}
    </Tag>
  );
}

export function CopyButton({
  text,
  meta,
  label = "Copy",
  size = "sm",
  variant = "neon",
  className,
  showLabel = true,
}: {
  text: string;
  meta?: CopyMeta;
  label?: string;
  size?: "xs" | "sm" | "default" | "lg" | "icon-sm" | "icon";
  variant?: "neon" | "outline" | "ghost" | "secondary";
  className?: string;
  showLabel?: boolean;
}) {
  const copy = useCopy();
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const onClick = async () => {
    const ok = await copy(text, meta);
    if (ok) {
      setDone(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setDone(false), 1400);
    }
  };

  return (
    <Button
      type="button"
      size={size}
      variant={variant === "neon" ? "default" : variant}
      onClick={onClick}
      disabled={!text}
      aria-label={showLabel ? undefined : `${label}${meta?.label ? ` ${meta.label}` : ""}`}
      className={cn(variant === "neon" && "neon-button border-0", "relative", className)}
    >
      <span className="relative grid size-4 place-items-center">
        <AnimatePresence initial={false} mode="popLayout">
          {done ? (
            <motion.span key="check" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }}>
              <Check className="size-4" />
            </motion.span>
          ) : (
            <motion.span key="copy" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }}>
              <Copy className="size-4" />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      {showLabel && <span>{done ? "Copied" : label}</span>}
      <span className="sr-only" aria-live="polite">
        {done ? "Copied to clipboard" : ""}
      </span>
    </Button>
  );
}

export function IconAction({
  label,
  onClick,
  children,
  active,
  className,
  disabled,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  active?: boolean;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label={label}
          aria-pressed={active}
          disabled={disabled}
          onClick={onClick}
          className={cn("text-muted-foreground hover:text-foreground", active && "text-neon-1 hover:text-neon-1", className)}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function PageHeader({
  icon,
  title,
  description,
  actions,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex animate-in flex-col gap-4 duration-300 fade-in slide-in-from-bottom-1 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-neon-1/30 to-neon-2/20 text-neon-1 ring-1 ring-white/10">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("glass neon-border min-w-0 rounded-2xl", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/5 px-4 py-3 sm:px-5">
          <div>
            {title && <h2 className="text-base font-semibold">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function Chip({
  active,
  onClick,
  children,
  className,
  title,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all outline-none",
        "focus-visible:ring-3 focus-visible:ring-ring/50",
        active
          ? "border-neon-1/50 bg-neon-1/20 text-foreground shadow-[0_0_18px_-6px_var(--neon-1)]"
          : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/20 hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center">
      {icon && <div className="text-muted-foreground">{icon}</div>}
      <p className="font-medium">{title}</p>
      {children && <div className="max-w-md text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

export function StatPill({ label, value, tone }: { label: string; value: ReactNode; tone?: "warn" | "ok" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[11px] text-muted-foreground",
        tone === "warn" && "border-warning/30 text-warning",
        tone === "ok" && "border-success/30 text-success",
      )}
    >
      <span className="text-foreground/90">{value}</span> {label}
    </span>
  );
}

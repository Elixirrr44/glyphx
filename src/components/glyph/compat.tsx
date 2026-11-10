"use client";

import { CircleCheck, CircleExclamationPoint, Info, TriangleExclamationPoint } from "lucide-react";
import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useFontAvailability } from "@/hooks/use-font-availability";
import { useSettings } from "@/hooks/use-store";
import { analyzeCompatibility, type CompatLevel, type CompatReport, LEVEL_LABEL } from "@/lib/unicode/compat";
import { cn } from "@/lib/utils";

const LEVEL_STYLE: Record<CompatLevel, string> = {
  safe: "bg-success",
  caution: "bg-warning",
  risky: "bg-destructive",
};

/** Small coloured dot + tooltip summarising cross-platform risk. */
export function CompatDot({ text, className }: { text: string; className?: string }) {
  const settings = useSettings();
  const report = useMemo(() => (settings.showCompatWarnings && text ? analyzeCompatibility(text) : null), [text, settings.showCompatWarnings]);
  if (!report) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="img"
          tabIndex={0}
          aria-label={`Compatibility: ${LEVEL_LABEL[report.level]}`}
          className={cn("inline-block size-2.5 shrink-0 rounded-full ring-2 ring-black/30 outline-none focus-visible:ring-ring", LEVEL_STYLE[report.level], className)}
        />
      </TooltipTrigger>
      <TooltipContent className="max-w-64">
        <p className="font-medium">{LEVEL_LABEL[report.level]}</p>
        {report.issues
          .filter((i) => i.severity !== "info")
          .slice(0, 2)
          .map((i) => (
            <p key={i.id} className="mt-1 opacity-80">
              {i.title}
            </p>
          ))}
      </TooltipContent>
    </Tooltip>
  );
}

const ICON = {
  info: <Info className="size-4 shrink-0 text-neon-2" />,
  warn: <TriangleExclamationPoint className="size-4 shrink-0 text-warning" />,
  risk: <CircleExclamationPoint className="size-4 shrink-0 text-destructive" />,
};

export function CompatReportView({ report, compact = false }: { report: CompatReport; compact?: boolean }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <span className={cn("size-2.5 rounded-full", LEVEL_STYLE[report.level])} />
        <span className="font-medium">{LEVEL_LABEL[report.level]}</span>
      </div>
      {report.issues.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CircleCheck className="size-4 text-success" /> Plain characters with broad font support.
        </p>
      ) : (
        <ul className="space-y-2">
          {report.issues.map((issue) => (
            <li key={issue.id} className="flex gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-2.5 text-sm">
              {ICON[issue.severity]}
              <div>
                <p className="font-medium">{issue.title}</p>
                {!compact && <p className="mt-0.5 text-xs text-muted-foreground">{issue.detail}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
      {!compact && (
        <div>
          <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Length check (UTF-16 units)</p>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {report.platforms.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-md bg-white/[0.03] px-2.5 py-1.5 text-xs">
                <span className="text-muted-foreground">{p.label}</span>
                <span className={cn("font-mono", p.fits ? "text-success" : "text-destructive")}>
                  {p.length}/{p.limit}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Limits are approximate and platforms count characters differently; UTF-16 units are the strictest common count.
          </p>
        </div>
      )}
    </div>
  );
}

export function CompatPanelFor({ text, compact }: { text: string; compact?: boolean }) {
  const report = useMemo(() => analyzeCompatibility(text), [text]);
  return <CompatReportView report={report} compact={compact} />;
}

// ---------------------------------------------------------------------------
// Side-by-side font previews
// ---------------------------------------------------------------------------

interface FontStack {
  id: string;
  label: string;
  family: string;
  /** Local font to probe; omitted for web fonts and generic families. */
  probe?: string;
  note: string;
}

export const FONT_STACKS: FontStack[] = [
  { id: "system", label: "System UI", family: "system-ui, sans-serif", note: "This device's default UI font" },
  { id: "segoe", label: "Segoe UI Symbol", family: '"Segoe UI Symbol", "Segoe UI", sans-serif', probe: "Segoe UI Symbol", note: "Windows" },
  { id: "apple", label: "SF / Apple system", family: '-apple-system, "SF Pro Text", "Helvetica Neue", sans-serif', probe: "Helvetica Neue", note: "iOS & macOS" },
  { id: "roboto", label: "Roboto / Noto", family: 'Roboto, "Noto Sans", sans-serif', probe: "Roboto", note: "Android & ChromeOS" },
  { id: "noto-math", label: "Noto Sans Math", family: "var(--font-noto-math), sans-serif", note: "Web font bundled with GlyphX" },
  { id: "noto-sym2", label: "Noto Sans Symbols 2", family: "var(--font-noto-sym2), sans-serif", note: "Web font bundled with GlyphX" },
  { id: "cambria", label: "Cambria Math", family: '"Cambria Math", serif', probe: "Cambria Math", note: "Windows / Office" },
  { id: "dejavu", label: "DejaVu Sans", family: '"DejaVu Sans", sans-serif', probe: "DejaVu Sans", note: "Linux" },
  { id: "serif", label: "Serif", family: "Georgia, 'Times New Roman', serif", note: "Generic serif" },
  { id: "mono", label: "Monospace", family: "var(--font-jetbrains), ui-monospace, monospace", note: "Code blocks & terminals" },
  {
    id: "emoji",
    label: "Color emoji font",
    family: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
    note: "How emoji-first apps draw it",
  },
];

const PROBES = FONT_STACKS.flatMap((f) => (f.probe ? [f.probe] : []));

export function FontPreviewGrid({ text, size = 26, only }: { text: string; size?: number; only?: string[] }) {
  const available = useFontAvailability(PROBES);
  const stacks = only ? FONT_STACKS.filter((f) => only.includes(f.id)) : FONT_STACKS;
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {stacks.map((f) => {
        const installed = f.probe ? available?.[f.probe] : true;
        return (
          <div key={f.id} className="rounded-xl border border-white/5 bg-black/20 p-3">
            <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px]">
              <span className="truncate font-medium text-foreground/90">{f.label}</span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-1.5 py-0.5 whitespace-nowrap",
                  installed === undefined
                    ? "bg-white/5 text-muted-foreground"
                    : installed
                      ? "bg-success/15 text-success"
                      : "bg-white/5 text-muted-foreground",
                )}
                title={f.note}
              >
                {f.probe ? (installed === undefined ? "checking\u{2026}" : installed ? "installed" : "not installed") : f.note}
              </span>
            </div>
            <div
              className="glyph glyph-clip min-h-10"
              style={{ fontFamily: f.family, fontSize: size, opacity: installed === false ? 0.45 : 1 }}
              lang="und"
            >
              {text || "\u{2014}"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

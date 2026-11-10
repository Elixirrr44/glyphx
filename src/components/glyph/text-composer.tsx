"use client";

import { ClipboardPaste, Eraser, Sparkles } from "lucide-react";
import { forwardRef, type ReactNode, useImperativeHandle, useMemo, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useHotkey } from "@/hooks/use-hotkey";
import { useSettings } from "@/hooks/use-store";
import { readClipboardText } from "@/lib/clipboard";
import { ENGINE_DEFAULTS } from "@/lib/unicode/engine";
import { segmentGraphemes } from "@/lib/unicode/segment";
import { cn } from "@/lib/utils";
import { StatPill } from "./primitives";

export interface TextComposerHandle {
  focus(): void;
  insert(text: string): void;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  rows?: number;
  /** Register the "/" shortcut to focus this box. */
  hotkey?: boolean;
  autoFocus?: boolean;
  className?: string;
  extra?: ReactNode;
  id?: string;
  maxLength?: number;
}

/** The main text input used by every tool. */
export const TextComposer = forwardRef<TextComposerHandle, Props>(function TextComposer(
  {
    value,
    onChange,
    label = "Your text",
    placeholder = "Type anything \u{2014} text, emoji, or both\u{2026}",
    rows = 2,
    hotkey = true,
    autoFocus,
    className,
    extra,
    id = "composer",
    maxLength = 5000,
  },
  ref,
) {
  const settings = useSettings();
  const taRef = useRef<HTMLTextAreaElement>(null);

  const insert = (text: string) => {
    const ta = taRef.current;
    if (!ta) {
      onChange(value + text);
      return;
    }
    const start = ta.selectionStart ?? value.length;
    const end = ta.selectionEnd ?? value.length;
    const next = value.slice(0, start) + text + value.slice(end);
    onChange(next.slice(0, maxLength));
    requestAnimationFrame(() => {
      ta.focus();
      const pos = Math.min(start + text.length, maxLength);
      ta.setSelectionRange(pos, pos);
    });
  };

  useImperativeHandle(ref, () => ({ focus: () => taRef.current?.focus(), insert }));
  useHotkey("/", () => taRef.current?.focus(), { enabled: hotkey });

  const stats = useMemo(() => {
    const graphemes = segmentGraphemes(value).length;
    return { graphemes, codePoints: Array.from(value).length, units: value.length };
  }, [value]);
  const overLimit = stats.graphemes > ENGINE_DEFAULTS.maxInputGraphemes;

  const paste = async () => {
    try {
      const text = await readClipboardText();
      if (text) insert(text);
    } catch {
      toast.error("Clipboard read was blocked", { description: "Paste with Ctrl/Cmd + V instead." });
    }
  };

  return (
    <div className={cn("glass neon-border min-w-0 rounded-2xl p-3 sm:p-4", className)}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <label htmlFor={id} className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </label>
        <div className="flex flex-wrap items-center gap-1">
          {extra}
          <Button type="button" variant="ghost" size="xs" onClick={() => onChange(settings.sampleText)} title="Use sample text">
            <Sparkles /> Sample
          </Button>
          <Button type="button" variant="ghost" size="xs" onClick={paste} title="Paste from clipboard">
            <ClipboardPaste /> Paste
          </Button>
          <Button type="button" variant="ghost" size="xs" onClick={() => onChange("")} disabled={!value} title="Clear text">
            <Eraser /> Clear
          </Button>
        </div>
      </div>
      <textarea
        id={id}
        ref={taRef}
        value={value}
        rows={rows}
        maxLength={maxLength}
        autoFocus={autoFocus}
        spellCheck={false}
        autoComplete="off"
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="glyph w-full resize-y rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-lg outline-none transition-shadow placeholder:text-muted-foreground/50 focus:border-neon-1/50 focus:shadow-[0_0_0_3px_color-mix(in_oklch,var(--neon-1)_25%,transparent)] sm:text-xl"
      />
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <StatPill value={stats.graphemes} label="chars" tone={overLimit ? "warn" : undefined} />
        <StatPill value={stats.codePoints} label="code points" />
        <StatPill value={stats.units} label="UTF-16" />
        {overLimit && (
          <span className="text-xs text-warning">
            Previews use the first {ENGINE_DEFAULTS.maxInputGraphemes} characters.
          </span>
        )}
        <span className="ml-auto hidden text-[11px] text-muted-foreground sm:inline">
          <kbd className="rounded border border-white/10 bg-white/5 px-1 font-mono">/</kbd> to focus
        </span>
      </div>
    </div>
  );
});

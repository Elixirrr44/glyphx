"use client";

import { createContext, type ReactNode, type RefObject, useContext, useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Tracks the last focused text field in the designer so the character picker
 * can insert symbols at that field's cursor position.
 */
export interface ActiveField {
  id: string;
  label: string;
  insert: (text: string) => void;
}

interface Registry {
  active: ActiveField | null;
  setActive: (f: ActiveField) => void;
}

const FieldContext = createContext<Registry | null>(null);

export function FieldRegistryProvider({ children, fallback }: { children: ReactNode; fallback: ActiveField }) {
  const [active, setActive] = useState<ActiveField | null>(null);
  return <FieldContext.Provider value={{ active: active ?? fallback, setActive }}>{children}</FieldContext.Provider>;
}

export function useActiveField(): ActiveField | null {
  return useContext(FieldContext)?.active ?? null;
}

export function useRegisterField() {
  return useContext(FieldContext)?.setActive ?? (() => undefined);
}

export function insertAtCursor(
  el: HTMLInputElement | HTMLTextAreaElement | null,
  current: string,
  text: string,
  onChange: (v: string) => void,
  maxLength = 200,
) {
  const start = el?.selectionStart ?? current.length;
  const end = el?.selectionEnd ?? current.length;
  const next = (current.slice(0, start) + text + current.slice(end)).slice(0, maxLength);
  onChange(next);
  requestAnimationFrame(() => {
    if (!el) return;
    el.focus();
    const pos = Math.min(start + text.length, next.length);
    el.setSelectionRange(pos, pos);
  });
}

/** Text input that registers itself as an insertion target for the picker. */
export function FieldInput({
  label,
  value,
  onChange,
  placeholder,
  maxLength = 64,
  className,
  hideLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  hideLabel?: boolean;
}) {
  const register = useRegisterField();
  const id = useId();
  const ref = useRef<HTMLInputElement>(null);
  const latest = useRef({ value, onChange });
  useEffect(() => {
    latest.current = { value, onChange };
  });
  const active = useActiveField();

  return (
    <label className={cn("block space-y-1", className)}>
      {!hideLabel && <span className="text-xs text-muted-foreground">{label}</span>}
      <Input
        ref={ref as RefObject<HTMLInputElement>}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-label={hideLabel ? label : undefined}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() =>
          register({
            id,
            label,
            insert: (t) => insertAtCursor(ref.current, latest.current.value, t, latest.current.onChange, maxLength),
          })
        }
        className={cn("glyph text-base", active?.id === id && "border-neon-1/50")}
      />
    </label>
  );
}

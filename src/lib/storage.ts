/**
 * Local persistence (localStorage) with an external-store interface that plugs
 * into React's useSyncExternalStore. Everything degrades to in-memory state if
 * storage is unavailable (private mode, blocked cookies, quota errors).
 */

import type { Preset } from "./presets";
import type { EngineOptions, Layer } from "./unicode/engine";

const PREFIX = "glyphx:v1:";

export interface PersistentStore<T> {
  readonly key: string;
  get(): T;
  getServerSnapshot(): T;
  set(next: T | ((prev: T) => T)): void;
  subscribe(listener: () => void): () => void;
  reset(): void;
  /** Re-read from storage (used after imports and cross-tab events). */
  reload(): void;
}

function safeStorage(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const probe = PREFIX + "__probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

export function createPersistentStore<T>(key: string, defaults: T, validate: (raw: unknown) => T | null): PersistentStore<T> {
  const fullKey = PREFIX + key;
  let value: T = defaults;
  let loaded = false;
  const listeners = new Set<() => void>();
  let storageListenerAttached = false;

  const read = (): T => {
    const storage = safeStorage();
    if (!storage) return defaults;
    try {
      const raw = storage.getItem(fullKey);
      if (raw == null) return defaults;
      const parsed = validate(JSON.parse(raw));
      return parsed ?? defaults;
    } catch {
      return defaults;
    }
  };

  const ensureLoaded = () => {
    if (!loaded && typeof window !== "undefined") {
      value = read();
      loaded = true;
    }
  };

  const notify = () => listeners.forEach((l) => l());

  const onStorage = (e: StorageEvent) => {
    if (e.key === fullKey || e.key === null) {
      value = read();
      notify();
    }
  };

  return {
    key: fullKey,
    get() {
      ensureLoaded();
      return value;
    },
    getServerSnapshot() {
      return defaults;
    },
    set(next) {
      ensureLoaded();
      const resolved = typeof next === "function" ? (next as (prev: T) => T)(value) : next;
      if (Object.is(resolved, value)) return;
      value = resolved;
      const storage = safeStorage();
      if (storage) {
        try {
          storage.setItem(fullKey, JSON.stringify(resolved));
        } catch {
          // Quota exceeded or blocked — keep the in-memory value.
        }
      }
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      if (!storageListenerAttached && typeof window !== "undefined") {
        window.addEventListener("storage", onStorage);
        storageListenerAttached = true;
      }
      return () => {
        listeners.delete(listener);
      };
    },
    reset() {
      value = defaults;
      loaded = true;
      try {
        safeStorage()?.removeItem(fullKey);
      } catch {
        // ignore
      }
      notify();
    },
    reload() {
      value = read();
      loaded = true;
      notify();
    },
  };
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string";

export function asStringArray(raw: unknown, max = 500): string[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.filter(isStr).slice(0, max);
}

const LAYER_TYPES = new Set([
  "font", "case", "marks", "zalgo", "charWrap", "separator", "wordSeparator", "wrap", "reverse", "flip",
  "replace", "emoji", "glitchChars", "ansi", "linePrefix",
]);

export function isLayer(v: unknown): v is Layer {
  return isObj(v) && isStr(v.type) && LAYER_TYPES.has(v.type);
}

export function asPresetArray(raw: unknown): Preset[] | null {
  if (!Array.isArray(raw)) return null;
  return raw
    .filter(
      (p): p is Preset =>
        isObj(p) && isStr(p.id) && isStr(p.name) && Array.isArray(p.layers) && (p.layers as unknown[]).every(isLayer),
    )
    .map((p) => ({ ...p, category: "custom" as const, custom: true, description: isStr(p.description) ? p.description : "" }))
    .slice(0, 300);
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export type PreviewFont = "system" | "inter" | "serif" | "mono" | "math";
export type Accent = "violet" | "blue" | "cyan" | "pink";
export type BatchSeparator = "newline" | "blankline" | "space";

export interface Settings {
  previewFontSize: number;
  previewFont: PreviewFont;
  showCompatWarnings: boolean;
  maxMarksPerGrapheme: number;
  inputNormalization: "none" | "NFC" | "NFD";
  outputNormalization: "none" | "NFC";
  accent: Accent;
  reduceMotion: boolean;
  copyToasts: boolean;
  historyLimit: number;
  sampleText: string;
  batchSeparator: BatchSeparator;
}

export const DEFAULT_SETTINGS: Settings = {
  previewFontSize: 22,
  previewFont: "system",
  showCompatWarnings: true,
  maxMarksPerGrapheme: 24,
  inputNormalization: "NFC",
  outputNormalization: "none",
  accent: "violet",
  reduceMotion: false,
  copyToasts: true,
  historyLimit: 50,
  sampleText: "GlyphX",
  batchSeparator: "newline",
};

const clamp = (n: unknown, lo: number, hi: number, d: number) =>
  typeof n === "number" && Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : d;
const oneOf = <T extends string>(v: unknown, opts: readonly T[], d: T): T => (opts.includes(v as T) ? (v as T) : d);

export function validateSettings(raw: unknown): Settings | null {
  if (!isObj(raw)) return null;
  const d = DEFAULT_SETTINGS;
  return {
    previewFontSize: clamp(raw.previewFontSize, 14, 44, d.previewFontSize),
    previewFont: oneOf(raw.previewFont, ["system", "inter", "serif", "mono", "math"] as const, d.previewFont),
    showCompatWarnings: typeof raw.showCompatWarnings === "boolean" ? raw.showCompatWarnings : d.showCompatWarnings,
    maxMarksPerGrapheme: clamp(raw.maxMarksPerGrapheme, 4, 64, d.maxMarksPerGrapheme),
    inputNormalization: oneOf(raw.inputNormalization, ["none", "NFC", "NFD"] as const, d.inputNormalization),
    outputNormalization: oneOf(raw.outputNormalization, ["none", "NFC"] as const, d.outputNormalization),
    accent: oneOf(raw.accent, ["violet", "blue", "cyan", "pink"] as const, d.accent),
    reduceMotion: typeof raw.reduceMotion === "boolean" ? raw.reduceMotion : d.reduceMotion,
    copyToasts: typeof raw.copyToasts === "boolean" ? raw.copyToasts : d.copyToasts,
    historyLimit: clamp(raw.historyLimit, 10, 200, d.historyLimit),
    sampleText: isStr(raw.sampleText) && raw.sampleText.trim() ? raw.sampleText.slice(0, 200) : d.sampleText,
    batchSeparator: oneOf(raw.batchSeparator, ["newline", "blankline", "space"] as const, d.batchSeparator),
  };
}

export function engineOptionsFromSettings(s: Settings): EngineOptions {
  return {
    maxMarksPerGrapheme: s.maxMarksPerGrapheme,
    inputNormalization: s.inputNormalization,
    outputNormalization: s.outputNormalization,
  };
}

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface HistoryEntry {
  id: string;
  text: string;
  label: string;
  styleId?: string;
  at: number;
}

export interface SavedText {
  id: string;
  text: string;
  label: string;
  createdAt: number;
}

function asHistory(raw: unknown): HistoryEntry[] | null {
  if (!Array.isArray(raw)) return null;
  return raw
    .filter((e): e is HistoryEntry => isObj(e) && isStr(e.id) && isStr(e.text) && typeof e.at === "number")
    .map((e) => ({ ...e, label: isStr(e.label) ? e.label : "" }))
    .slice(0, 200);
}

function asSavedTexts(raw: unknown): SavedText[] | null {
  if (!Array.isArray(raw)) return null;
  return raw
    .filter((e): e is SavedText => isObj(e) && isStr(e.id) && isStr(e.text) && typeof e.createdAt === "number")
    .map((e) => ({ ...e, label: isStr(e.label) ? e.label : "" }))
    .slice(0, 500);
}

export const MAX_RECENT = 12;

export const settingsStore = createPersistentStore<Settings>("settings", DEFAULT_SETTINGS, validateSettings);
export const favoritesStore = createPersistentStore<string[]>("favorites", [], (r) => asStringArray(r));
export const recentStore = createPersistentStore<string[]>("recent", [], (r) => asStringArray(r, MAX_RECENT));
export const historyStore = createPersistentStore<HistoryEntry[]>("history", [], asHistory);
export const savedTextsStore = createPersistentStore<SavedText[]>("saved-texts", [], asSavedTexts);
export const customPresetsStore = createPersistentStore<Preset[]>("custom-presets", [], asPresetArray);
export const workspaceStore = createPersistentStore<string>("workspace-text", "", (r) => (isStr(r) ? r.slice(0, 5000) : null));

export function makeId(prefix = "id"): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.floor(Math.random() * 1e8).toString(36);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

// ---------------------------------------------------------------------------
// Pure list operations (unit tested)
// ---------------------------------------------------------------------------

export function toggleInList(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [id, ...list];
}

export function pushRecent(list: string[], id: string, max = MAX_RECENT): string[] {
  return [id, ...list.filter((x) => x !== id)].slice(0, max);
}

export function pushHistory(list: HistoryEntry[], entry: HistoryEntry, limit: number): HistoryEntry[] {
  // Collapse an immediate duplicate copy of the same text.
  const rest = list[0]?.text === entry.text ? list.slice(1) : list;
  return [entry, ...rest].slice(0, limit);
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export const actions = {
  toggleFavorite(id: string) {
    favoritesStore.set((l) => toggleInList(l, id));
  },
  recordRecent(id: string) {
    recentStore.set((l) => pushRecent(l, id));
  },
  addHistory(text: string, label: string, styleId?: string) {
    const limit = settingsStore.get().historyLimit;
    historyStore.set((l) => pushHistory(l, { id: makeId("h"), text, label, styleId, at: Date.now() }, limit));
  },
  removeHistory(id: string) {
    historyStore.set((l) => l.filter((e) => e.id !== id));
  },
  saveText(text: string, label: string): SavedText {
    const entry: SavedText = { id: makeId("t"), text, label, createdAt: Date.now() };
    savedTextsStore.set((l) => [entry, ...l]);
    return entry;
  },
  removeSavedText(id: string) {
    savedTextsStore.set((l) => l.filter((e) => e.id !== id));
  },
  saveCustomPreset(input: { name: string; description?: string; layers: Layer[] }): Preset {
    const preset: Preset = {
      id: makeId("custom"),
      name: input.name.trim().slice(0, 60) || "Untitled style",
      description: (input.description ?? "").slice(0, 200),
      category: "custom",
      layers: structuredClone(input.layers),
      custom: true,
      createdAt: Date.now(),
    };
    customPresetsStore.set((l) => [preset, ...l]);
    return preset;
  },
  updateCustomPreset(id: string, patch: Partial<Pick<Preset, "name" | "description" | "layers">>) {
    customPresetsStore.set((l) => l.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  },
  deleteCustomPreset(id: string) {
    customPresetsStore.set((l) => l.filter((p) => p.id !== id));
    favoritesStore.set((l) => l.filter((x) => x !== id));
    recentStore.set((l) => l.filter((x) => x !== id));
  },
  updateSettings(patch: Partial<Settings>) {
    settingsStore.set((s) => validateSettings({ ...s, ...patch }) ?? s);
  },
};

// ---------------------------------------------------------------------------
// Export / import
// ---------------------------------------------------------------------------

export interface ExportBundle {
  app: "glyphx";
  version: 1;
  exportedAt: string;
  settings: Settings;
  favorites: string[];
  recent: string[];
  history: HistoryEntry[];
  savedTexts: SavedText[];
  customPresets: Preset[];
}

export function exportData(): string {
  const bundle: ExportBundle = {
    app: "glyphx",
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: settingsStore.get(),
    favorites: favoritesStore.get(),
    recent: recentStore.get(),
    history: historyStore.get(),
    savedTexts: savedTextsStore.get(),
    customPresets: customPresetsStore.get(),
  };
  return JSON.stringify(bundle, null, 2);
}

/** Merge an exported bundle into local data. Returns counts of imported records. */
export function importData(json: string): { presets: number; texts: number; favorites: number } {
  const raw = JSON.parse(json) as unknown;
  if (!isObj(raw) || raw.app !== "glyphx") throw new Error("Not a GlyphX export file");
  const presets = asPresetArray(raw.customPresets) ?? [];
  const texts = asSavedTexts(raw.savedTexts) ?? [];
  const favs = asStringArray(raw.favorites) ?? [];
  const settings = validateSettings(raw.settings);

  customPresetsStore.set((l) => {
    const ids = new Set(l.map((p) => p.id));
    return [...presets.filter((p) => !ids.has(p.id)), ...l];
  });
  savedTextsStore.set((l) => {
    const ids = new Set(l.map((t) => t.id));
    return [...texts.filter((t) => !ids.has(t.id)), ...l];
  });
  favoritesStore.set((l) => Array.from(new Set([...l, ...favs])));
  if (settings) settingsStore.set(settings);
  return { presets: presets.length, texts: texts.length, favorites: favs.length };
}

export function clearAllData() {
  [settingsStore, favoritesStore, recentStore, historyStore, savedTextsStore, customPresetsStore, workspaceStore].forEach((s) =>
    s.reset(),
  );
}

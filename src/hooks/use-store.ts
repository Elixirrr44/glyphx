"use client";

import { useMemo, useSyncExternalStore } from "react";
import { PRESETS, type Preset } from "@/lib/presets";
import {
  customPresetsStore,
  engineOptionsFromSettings,
  favoritesStore,
  historyStore,
  type PersistentStore,
  recentStore,
  savedTextsStore,
  settingsStore,
  workspaceStore,
} from "@/lib/storage";
import type { EngineOptions } from "@/lib/unicode/engine";

export function useStore<T>(store: PersistentStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.getServerSnapshot);
}

export const useSettings = () => useStore(settingsStore);
export const useFavorites = () => useStore(favoritesStore);
export const useRecent = () => useStore(recentStore);
export const useHistory = () => useStore(historyStore);
export const useSavedTexts = () => useStore(savedTextsStore);
export const useCustomPresets = () => useStore(customPresetsStore);

/** Shared working text, so every tool starts from what the user last typed. */
export function useWorkspaceText(): [string, (v: string) => void] {
  const value = useStore(workspaceStore);
  return [value, workspaceStore.set];
}

export function useEngineOptions(): EngineOptions {
  const settings = useSettings();
  return useMemo(() => engineOptionsFromSettings(settings), [settings]);
}

/** Built-in presets followed by the user's own presets. */
export function useAllPresets(): Preset[] {
  const custom = useCustomPresets();
  return useMemo(() => [...PRESETS, ...custom], [custom]);
}

export function useFavoriteSet(): Set<string> {
  const favs = useFavorites();
  return useMemo(() => new Set(favs), [favs]);
}

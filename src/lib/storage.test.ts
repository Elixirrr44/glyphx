// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PRESETS } from "./presets";
import {
  actions,
  clearAllData,
  createPersistentStore,
  customPresetsStore,
  DEFAULT_SETTINGS,
  exportData,
  favoritesStore,
  historyStore,
  importData,
  pushHistory,
  pushRecent,
  recentStore,
  settingsStore,
  toggleInList,
  validateSettings,
} from "./storage";
import { applyLayers } from "./unicode/engine";

beforeEach(() => {
  localStorage.clear();
  clearAllData();
});

describe("pure list helpers", () => {
  it("toggles favorites", () => {
    expect(toggleInList([], "a")).toEqual(["a"]);
    expect(toggleInList(["a", "b"], "a")).toEqual(["b"]);
  });

  it("keeps recent styles unique and capped", () => {
    let list: string[] = [];
    for (let i = 0; i < 20; i++) list = pushRecent(list, `s${i % 15}`, 12);
    expect(list).toHaveLength(12);
    expect(new Set(list).size).toBe(12);
    expect(list[0]).toBe("s4");
  });

  it("caps history and collapses an immediate duplicate", () => {
    const e = (id: string, text: string) => ({ id, text, label: "", at: 0 });
    let h = pushHistory([], e("1", "a"), 3);
    h = pushHistory(h, e("2", "a"), 3);
    expect(h.map((x) => x.id)).toEqual(["2"]);
    for (let i = 0; i < 5; i++) h = pushHistory(h, e(`n${i}`, `t${i}`), 3);
    expect(h).toHaveLength(3);
  });
});

describe("persistent store", () => {
  it("persists, reloads and notifies subscribers", () => {
    const store = createPersistentStore<number[]>("test-nums", [], (r) => (Array.isArray(r) ? (r as number[]) : null));
    const listener = vi.fn();
    const unsub = store.subscribe(listener);
    store.set([1, 2]);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem(store.key)!)).toEqual([1, 2]);
    localStorage.setItem(store.key, "[3]");
    store.reload();
    expect(store.get()).toEqual([3]);
    unsub();
  });

  it("falls back to defaults on corrupted JSON or invalid shapes", () => {
    localStorage.setItem("glyphx:v1:test-corrupt", "{not json");
    const a = createPersistentStore("test-corrupt", ["default"], (r) => (Array.isArray(r) ? (r as string[]) : null));
    expect(a.get()).toEqual(["default"]);
    localStorage.setItem("glyphx:v1:test-shape", JSON.stringify({ nope: true }));
    const b = createPersistentStore("test-shape", ["default"], (r) => (Array.isArray(r) ? (r as string[]) : null));
    expect(b.get()).toEqual(["default"]);
  });

  it("keeps working in memory when storage throws", () => {
    const store = createPersistentStore<string>("test-quota", "", (r) => (typeof r === "string" ? r : null));
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    expect(() => store.set("value")).not.toThrow();
    expect(store.get()).toBe("value");
    spy.mockRestore();
  });

  it("syncs from other tabs through the storage event", () => {
    favoritesStore.get();
    const listener = vi.fn();
    favoritesStore.subscribe(listener);
    localStorage.setItem(favoritesStore.key, JSON.stringify(["from-other-tab"]));
    window.dispatchEvent(new StorageEvent("storage", { key: favoritesStore.key }));
    expect(favoritesStore.get()).toEqual(["from-other-tab"]);
    expect(listener).toHaveBeenCalled();
  });
});

describe("settings", () => {
  it("clamps and repairs invalid values", () => {
    const s = validateSettings({ previewFontSize: 999, accent: "neon-green", maxMarksPerGrapheme: -5, sampleText: "  " })!;
    expect(s.previewFontSize).toBe(44);
    expect(s.accent).toBe(DEFAULT_SETTINGS.accent);
    expect(s.maxMarksPerGrapheme).toBe(4);
    expect(s.sampleText).toBe(DEFAULT_SETTINGS.sampleText);
  });

  it("updates through actions", () => {
    actions.updateSettings({ accent: "pink", previewFontSize: 30 });
    expect(settingsStore.get().accent).toBe("pink");
    expect(settingsStore.get().previewFontSize).toBe(30);
  });
});

describe("actions", () => {
  it("toggles favorites and records history and recent styles", () => {
    actions.toggleFavorite("tri-classic");
    expect(favoritesStore.get()).toEqual(["tri-classic"]);
    actions.toggleFavorite("tri-classic");
    expect(favoritesStore.get()).toEqual([]);
    actions.addHistory("G\u{20E4}", "Triangle Overlay", "tri-classic");
    actions.recordRecent("tri-classic");
    expect(historyStore.get()[0].text).toBe("G\u{20E4}");
    expect(recentStore.get()).toEqual(["tri-classic"]);
  });

  it("saves custom presets that render identically to their source", () => {
    const source = PRESETS.find((p) => p.id === "tri-circle")!;
    const saved = actions.saveCustomPreset({ name: "  My Triangle  ", layers: source.layers });
    expect(saved.name).toBe("My Triangle");
    expect(saved.custom).toBe(true);
    expect(customPresetsStore.get()[0].id).toBe(saved.id);
    expect(applyLayers("Hi", saved.layers)).toBe(applyLayers("Hi", source.layers));
    actions.toggleFavorite(saved.id);
    actions.deleteCustomPreset(saved.id);
    expect(customPresetsStore.get()).toHaveLength(0);
    expect(favoritesStore.get()).not.toContain(saved.id);
  });

  it("round-trips data through export and import", () => {
    actions.saveCustomPreset({ name: "Exported", layers: [{ type: "font", font: "bold" }] });
    actions.saveText("saved \u{2728}", "label");
    actions.toggleFavorite("cx-slash");
    const json = exportData();
    clearAllData();
    expect(customPresetsStore.get()).toHaveLength(0);
    const res = importData(json);
    expect(res).toEqual({ presets: 1, texts: 1, favorites: 1 });
    expect(customPresetsStore.get()[0].name).toBe("Exported");
    expect(favoritesStore.get()).toContain("cx-slash");
    // Importing again does not duplicate records.
    importData(json);
    expect(customPresetsStore.get()).toHaveLength(1);
  });

  it("rejects foreign import files", () => {
    expect(() => importData(JSON.stringify({ hello: "world" }))).toThrow();
    expect(() => importData("not json")).toThrow();
  });

  it("drops invalid layers from imported presets", () => {
    const bad = JSON.stringify({ app: "glyphx", customPresets: [{ id: "x", name: "Bad", layers: [{ type: "evil" }] }] });
    expect(importData(bad).presets).toBe(0);
  });
});

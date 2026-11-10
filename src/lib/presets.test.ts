import { describe, expect, it } from "vitest";
import { CATEGORIES, FEATURED_IDS, PRESET_BY_ID, PRESETS, describeLayer } from "./presets";
import { applyLayers, transform } from "./unicode/engine";
import { segmentGraphemes } from "./unicode/segment";

const SAMPLES = [
  "Hello World 123",
  "GlyphX",
  "a\u{1F525}b \u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467} \u{1F1FA}\u{1F1F8} 1\u{FE0F}\u{20E3}",
];

const HOSTILE_INPUTS = [
  "",
  " ",
  "\n\n",
  "\u{00DC}n\u{00EF}c\u{00F6}d\u{00E9} caf\u{00E9}",
  "e\u{0301}\u{0302}\u{0303}",
  "line one\nline two",
  String.fromCharCode(0xd83d) + "lone surrogate",
  "\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}\u{1F44D}\u{1F3FF}",
  "\u{0627}\u{0644}\u{0639}\u{0631}\u{0628}\u{064A}\u{0629} \u{0939}\u{093F}\u{0928}\u{094D}\u{0926}\u{0940}",
  "x".repeat(3000),
];

const isWellFormed = (s: string) => (s as string & { isWellFormed(): boolean }).isWellFormed();

describe("preset library", () => {
  it("has at least 100 presets with unique ids and names", () => {
    expect(PRESETS.length).toBeGreaterThanOrEqual(100);
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(PRESETS.length);
    expect(new Set(PRESETS.map((p) => p.name)).size).toBe(PRESETS.length);
  });

  it("covers all ten categories with at least 8 presets each", () => {
    expect(CATEGORIES).toHaveLength(10);
    for (const cat of CATEGORIES) {
      expect(PRESETS.filter((p) => p.category === cat.id).length, cat.id).toBeGreaterThanOrEqual(8);
    }
    const ids = new Set(CATEGORIES.map((c) => c.id));
    for (const p of PRESETS) expect(ids.has(p.category)).toBe(true);
  });

  it("contains no duplicate transformations (every preset output is unique)", () => {
    for (const sample of SAMPLES) {
      const outputs = new Map<string, string>();
      for (const p of PRESETS) {
        const out = applyLayers(sample, p.layers);
        expect(out, `${p.id} should change the text`).not.toBe(sample);
        const clash = outputs.get(out);
        expect(clash, `${p.id} duplicates ${clash}`).toBeUndefined();
        outputs.set(out, p.id);
      }
    }
  });

  it("has unique layer recipes", () => {
    const recipes = new Set(PRESETS.map((p) => JSON.stringify(p.layers)));
    expect(recipes.size).toBe(PRESETS.length);
  });

  it("handles hostile and complex inputs without throwing and returns well-formed strings", () => {
    for (const p of PRESETS) {
      for (const input of HOSTILE_INPUTS) {
        const res = transform(input, p.layers);
        expect(isWellFormed(res.output), `${p.id}`).toBe(true);
      }
    }
  });

  it("keeps emoji clusters intact in every preset", () => {
    const family = "\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}";
    for (const p of PRESETS) {
      const out = applyLayers(`hi ${family}`, p.layers);
      if (p.layers.some((l) => l.type === "replace")) continue;
      expect(out.includes(family), p.id).toBe(true);
      const clusters = segmentGraphemes(out).filter((g) => g.includes("\u{200D}\u{1F469}"));
      expect(clusters.length, p.id).toBe(1);
    }
  });

  it("puts a real U+20E4 in every triangle preset", () => {
    for (const p of PRESETS.filter((x) => x.category === "triangle")) {
      expect(applyLayers("abc", p.layers).includes("\u{20E4}"), p.id).toBe(true);
    }
  });

  it("serializes layers losslessly (needed for saving custom presets)", () => {
    for (const p of PRESETS) {
      const roundTrip = JSON.parse(JSON.stringify(p.layers));
      expect(applyLayers("Round trip", roundTrip)).toBe(applyLayers("Round trip", p.layers));
    }
  });

  it("references only existing presets in the featured list", () => {
    for (const id of FEATURED_IDS) expect(PRESET_BY_ID.has(id), id).toBe(true);
  });

  it("describes every layer", () => {
    for (const p of PRESETS) for (const l of p.layers) expect(describeLayer(l).length).toBeGreaterThan(0);
  });
});

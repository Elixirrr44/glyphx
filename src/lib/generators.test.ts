import { describe, expect, it } from "vitest";
import { historyReducer } from "@/hooks/use-history-state";
import { emojiCombos, generateNicknames, graphemeBreakdown, mixEffects, NICK_THEMES, randomStyle, triangleVariants } from "./generators";
import { isLayer } from "./storage";
import { applyLayers } from "./unicode/engine";
import { MK } from "./unicode/marks";
import { segmentGraphemes } from "./unicode/segment";

describe("randomStyle", () => {
  it("is deterministic per seed and always produces valid, visible layers", () => {
    expect(randomStyle(42)).toEqual(randomStyle(42));
    const outputs = new Set<string>();
    for (let seed = 1; seed <= 200; seed++) {
      const s = randomStyle(seed);
      expect(s.layers.length).toBeGreaterThan(0);
      expect(s.layers.every(isLayer)).toBe(true);
      const out = applyLayers("Sample", s.layers);
      expect(out).not.toBe("Sample");
      outputs.add(out);
    }
    expect(outputs.size).toBeGreaterThan(150);
  });
});

describe("mixEffects", () => {
  it("styles each word while keeping whitespace", () => {
    const out = mixEffects("one two  three", 7);
    expect(out.split(/\s+/u)).toHaveLength(3);
    expect(out).toContain("  ");
    expect(out).not.toBe("one two  three");
    expect(mixEffects("one two", 7)).toBe(mixEffects("one two", 7));
  });
});

describe("generateNicknames", () => {
  it("creates unique, deterministic names for every theme", () => {
    for (const theme of Object.keys(NICK_THEMES) as (keyof typeof NICK_THEMES)[]) {
      const a = generateNicknames("", theme, 99, 12);
      expect(a.length).toBeGreaterThanOrEqual(8);
      expect(new Set(a.map((n) => n.text)).size).toBe(a.length);
      expect(generateNicknames("", theme, 99, 12)).toEqual(a);
    }
  });

  it("uses the base name when given", () => {
    const names = generateNicknames("Nova", "gamer", 1, 6);
    expect(names.every((n) => n.plain === "Nova")).toBe(true);
  });
});

describe("emojiCombos", () => {
  it("returns distinct combinations containing the text", () => {
    const combos = emojiCombos("Hi there", ["\u{1F525}", "\u{2728}", "\u{1F480}"], 3);
    expect(combos.length).toBeGreaterThan(6);
    expect(new Set(combos.map((c) => c.text)).size).toBe(combos.length);
  });

  it("returns nothing without emoji", () => {
    expect(emojiCombos("Hi", [], 1)).toEqual([]);
  });
});

describe("triangleVariants", () => {
  const FAMILY = "\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}";

  it("attaches the triangle after whole emoji sequences", () => {
    const vars = triangleVariants(`A${FAMILY}`, MK.triangle, "all");
    const each = vars.find((v) => v.id === "each")!;
    expect(each.text).toBe(`A\u{20E4}${FAMILY}\u{20E4}`);
    expect(segmentGraphemes(each.text)).toHaveLength(2);
  });

  it("respects the emoji-only and text-only scopes", () => {
    expect(triangleVariants("a\u{1F525}", MK.triangle, "emoji").find((v) => v.id === "each")!.text).toBe("a\u{1F525}\u{20E4}");
    expect(triangleVariants("a\u{1F525}", MK.triangle, "text").find((v) => v.id === "each")!.text).toBe("a\u{20E4}\u{1F525}");
  });

  it("supports custom overlay combinations and the last-character variant", () => {
    const vars = triangleVariants("abc", MK.triangle + MK.circle, "all");
    expect(vars.find((v) => v.id === "each")!.text).toBe("a\u{20E4}\u{20DD}b\u{20E4}\u{20DD}c\u{20E4}\u{20DD}");
    expect(vars.find((v) => v.id === "last")!.text).toBe("abc\u{20E4}\u{20DD}");
    expect(new Set(vars.map((v) => v.text)).size).toBe(vars.length);
  });

  it("breaks text down into emoji, text and spaces", () => {
    expect(graphemeBreakdown(`ab ${FAMILY}`)).toEqual({ emoji: 1, text: 2, spaces: 1 });
  });
});

describe("undo/redo reducer", () => {
  it("supports set, coalesced set, undo, redo and reset", () => {
    let s = { past: [] as number[], present: 0, future: [] as number[] };
    s = historyReducer(s, { type: "set", value: 1, coalesce: false });
    s = historyReducer(s, { type: "set", value: 2, coalesce: true });
    expect(s).toEqual({ past: [0], present: 2, future: [] });
    s = historyReducer(s, { type: "undo" });
    expect(s.present).toBe(0);
    s = historyReducer(s, { type: "redo" });
    expect(s.present).toBe(2);
    s = historyReducer(s, { type: "undo" });
    s = historyReducer(s, { type: "set", value: 5, coalesce: false });
    expect(s.future).toEqual([]);
    expect(historyReducer(s, { type: "reset", value: 9 })).toEqual({ past: [], present: 9, future: [] });
    // No-ops at the edges.
    const empty = { past: [], present: 1, future: [] };
    expect(historyReducer(empty, { type: "undo" })).toBe(empty);
    expect(historyReducer(empty, { type: "redo" })).toBe(empty);
  });
});

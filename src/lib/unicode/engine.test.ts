import { describe, expect, it } from "vitest";
import { unstyle } from "./alphabets";
import { applyLayers, type Layer, stripAnsi, stripDecorativeMarks, toWellFormed, transform } from "./engine";
import { MK } from "./marks";
import { countMarks, segmentGraphemes } from "./segment";

const FAMILY = "\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}";
const THUMB_MEDIUM = "\u{1F44D}\u{1F3FD}";
const US = "\u{1F1FA}\u{1F1F8}";
const KEYCAP_1 = "1\u{FE0F}\u{20E3}";
const marks = (m: string, extra: Partial<Extract<Layer, { type: "marks" }>> = {}): Layer => ({ type: "marks", marks: m, ...extra });

describe("combining overlays", () => {
  it("attaches the enclosing triangle to every character", () => {
    expect(applyLayers("GANG", [marks(MK.triangle)])).toBe("G\u{20E4}A\u{20E4}N\u{20E4}G\u{20E4}");
  });

  it("produces the classic slashed, circled and squared examples", () => {
    expect(applyLayers("HELLO", [marks(MK.slash)])).toBe("H\u{0337}E\u{0337}L\u{0337}L\u{0337}O\u{0337}");
    expect(applyLayers("TEXT", [marks(MK.circle)])).toBe("T\u{20DD}E\u{20DD}X\u{20DD}T\u{20DD}");
    expect(applyLayers("TEXT", [marks(MK.square)])).toBe("T\u{20DE}E\u{20DE}X\u{20DE}T\u{20DE}");
  });

  it("skips spaces by default but can target them", () => {
    expect(applyLayers("A B", [marks(MK.triangle)])).toBe("A\u{20E4} B\u{20E4}");
    expect(applyLayers("A B", [marks(MK.underline, { target: "all" })])).toBe("A\u{0332} \u{0332}B\u{0332}");
  });

  it("never splits emoji sequences when attaching marks", () => {
    for (const e of [FAMILY, THUMB_MEDIUM, US, KEYCAP_1]) {
      const out = applyLayers(`${e}x`, [marks(MK.triangle)]);
      expect(out).toBe(`${e}\u{20E4}x\u{20E4}`);
      const segs = segmentGraphemes(out);
      expect(segs).toHaveLength(2);
      expect(segs[0].startsWith(e)).toBe(true);
    }
  });

  it("stacks multiple marks in order", () => {
    expect(applyLayers("a", [marks(MK.triangle + MK.circle)])).toBe("a\u{20E4}\u{20DD}");
    expect(applyLayers("a", [marks(MK.triangle), marks(MK.circle)])).toBe("a\u{20E4}\u{20DD}");
  });

  it("ignores non-mark characters in a marks layer", () => {
    expect(applyLayers("ab", [marks("x" + MK.triangle + "y")])).toBe("a\u{20E4}b\u{20E4}");
  });

  it("supports every-Nth and emoji-only targeting", () => {
    expect(applyLayers("abcd", [marks(MK.triangle, { every: 2 })])).toBe("a\u{20E4}bc\u{20E4}d");
    expect(applyLayers("a\u{1F525}b", [marks(MK.triangle, { target: "emoji" })])).toBe("a\u{1F525}\u{20E4}b");
    expect(applyLayers("a\u{1F525}b", [marks(MK.triangle, { target: "text" })])).toBe("a\u{20E4}\u{1F525}b\u{20E4}");
  });
});

describe("fonts", () => {
  it("maps to mathematical alphanumerics including the reserved holes", () => {
    expect(applyLayers("Az9", [{ type: "font", font: "bold" }])).toBe("\u{1D400}\u{1D433}\u{1D7D7}");
    expect(applyLayers("h", [{ type: "font", font: "italic" }])).toBe("\u{210E}");
    expect(applyLayers("BEe", [{ type: "font", font: "script" }])).toBe("\u{212C}\u{2130}\u{212F}");
    expect(applyLayers("CHz", [{ type: "font", font: "fraktur" }])).toBe("\u{212D}\u{210C}\u{1D537}");
    expect(applyLayers("R", [{ type: "font", font: "doubleStruck" }])).toBe("\u{211D}");
  });

  it("keeps accents when styling accented letters", () => {
    expect(applyLayers("\u{00E9}", [{ type: "font", font: "bold" }])).toBe("\u{1D41E}\u{0301}");
    expect(applyLayers("e\u{0301}", [{ type: "font", font: "bold" }], { inputNormalization: "none" })).toBe("\u{1D41E}\u{0301}");
  });

  it("does not touch emoji (keycaps stay valid)", () => {
    expect(applyLayers(KEYCAP_1, [{ type: "font", font: "bold" }])).toBe(KEYCAP_1);
    expect(applyLayers(US, [{ type: "font", font: "bold" }])).toBe(US);
  });

  it("styles the base letter of a grapheme that already has marks", () => {
    expect(applyLayers("A", [marks(MK.triangle), { type: "font", font: "bold" }])).toBe("\u{1D400}\u{20E4}");
  });

  it("maps fullwidth including spaces and punctuation", () => {
    expect(applyLayers("Hi !", [{ type: "font", font: "fullwidth" }])).toBe("\u{FF28}\u{FF49}\u{3000}\u{FF01}");
  });

  it("can be reversed with unstyle", () => {
    const styled = applyLayers("Hello World 42", [{ type: "font", font: "boldScript" }]);
    expect(unstyle(styled)).toBe("Hello World 42");
    expect(unstyle(applyLayers("Hello", [{ type: "font", font: "script" }]))).toBe("Hello");
  });
});

describe("zalgo", () => {
  const z = (seed: number, up = 6, mid = 1, down = 6): Layer => ({ type: "zalgo", up, mid, down, seed, variance: 0.5 });

  it("is deterministic for the same seed and differs between seeds", () => {
    expect(applyLayers("glitch", [z(1)])).toBe(applyLayers("glitch", [z(1)]));
    expect(applyLayers("glitch", [z(1)])).not.toBe(applyLayers("glitch", [z(2)]));
  });

  it("keeps earlier characters stable while typing", () => {
    const short = segmentGraphemes(applyLayers("ab", [z(5)]));
    const long = segmentGraphemes(applyLayers("abc", [z(5)]));
    expect(long.slice(0, 2)).toEqual(short);
  });

  it("caps marks per grapheme", () => {
    const res = transform("abc", [z(9, 100, 100, 100)], { maxMarksPerGrapheme: 24 });
    for (const g of segmentGraphemes(res.output)) expect(countMarks(g)).toBeLessThanOrEqual(24);
    expect(res.cappedMarks).toBe(true);
  });

  it("stays fast and bounded on huge input", () => {
    const start = performance.now();
    const res = transform("x".repeat(20000), [z(3, 100, 100, 100)], { maxOutputLength: 12000 });
    expect(performance.now() - start).toBeLessThan(2000);
    expect(res.truncatedInput).toBe(true);
    expect(res.cappedLength).toBe(true);
    expect(res.output.length).toBeLessThanOrEqual(24000);
  });
});

describe("structural layers", () => {
  it("adds separators while skipping spaces", () => {
    expect(applyLayers("ab cd", [{ type: "separator", value: "\u{00B7}" }])).toBe("a\u{00B7}b c\u{00B7}d");
    expect(applyLayers("ab cd", [{ type: "separator", value: "-", skipSpaces: false }])).toBe("a-b- -c-d");
  });

  it("keeps per-character wraps grouped when adding separators", () => {
    expect(
      applyLayers("ab", [{ type: "charWrap", left: "\u{3010}", right: "\u{3011}" }, { type: "separator", value: "-" }]),
    ).toBe("\u{3010}a\u{3011}-\u{3010}b\u{3011}");
  });

  it("does not attach later marks to decorations", () => {
    expect(applyLayers("ab", [{ type: "wrap", prefix: "[", suffix: "]" }, marks(MK.triangle)])).toBe("[a\u{20E4}b\u{20E4}]");
  });

  it("reverses by grapheme so emoji stay intact", () => {
    expect(applyLayers(`a${THUMB_MEDIUM}b${US}`, [{ type: "reverse" }])).toBe(`${US}b${THUMB_MEDIUM}a`);
  });

  it("flips text upside down", () => {
    expect(applyLayers("Hello!", [{ type: "flip" }])).toBe("\u{00A1}oll\u{01DD}H");
  });

  it("changes case", () => {
    expect(applyLayers("hello", [{ type: "case", mode: "alternate" }])).toBe("hElLo");
    expect(applyLayers("hello world", [{ type: "case", mode: "title" }])).toBe("Hello World");
    expect(applyLayers("Hello", [{ type: "case", mode: "inverse" }])).toBe("hELLO");
  });

  it("adds emoji between letters, between words and around words", () => {
    expect(applyLayers("ab c", [{ type: "emoji", emojis: ["\u{1F525}"], mode: "between" }])).toBe("a\u{1F525}b c");
    expect(applyLayers("hi yo", [{ type: "emoji", emojis: ["\u{2B50}"], mode: "words" }])).toBe("hi \u{2B50} yo");
    expect(applyLayers("hi yo", [{ type: "emoji", emojis: ["\u{1F338}"], mode: "wordWrap" }])).toBe(
      "\u{1F338}hi\u{1F338} \u{1F338}yo\u{1F338}",
    );
  });

  it("prefixes every line", () => {
    expect(applyLayers("a\nb", [{ type: "linePrefix", prefix: "> " }])).toBe("> a\n> b");
  });

  it("builds Discord ANSI code blocks", () => {
    const out = applyLayers("Hi", [{ type: "ansi", fg: "red", bold: true }]);
    expect(out).toBe("```ansi\n\u{1B}[1;31mHi\u{1B}[0m\n```");
    expect(stripAnsi(out)).toBe("```ansi\nHi\n```");
  });

  it("injects glitch characters deterministically", () => {
    const layer: Layer = { type: "glitchChars", amount: 50, charset: "\u{2591}\u{2592}", seed: 4 };
    const a = applyLayers("corrupted", [layer]);
    expect(a).toBe(applyLayers("corrupted", [layer]));
    expect(a.length).toBeGreaterThan("corrupted".length);
  });
});

describe("robustness", () => {
  it("does not mutate the layer list", () => {
    const layers: Layer[] = [marks(MK.triangle), { type: "wrap", prefix: "<", suffix: ">" }];
    const snapshot = JSON.stringify(layers);
    applyLayers("abc", layers);
    expect(JSON.stringify(layers)).toBe(snapshot);
  });

  it("repairs lone surrogates instead of throwing", () => {
    const broken = String.fromCharCode(0xd83d) + "ab";
    expect(toWellFormed(broken)).toBe("\u{FFFD}ab");
    const out = applyLayers(broken, [marks(MK.triangle)]);
    expect(out.startsWith("\u{FFFD}")).toBe(true);
    expect((out as string & { isWellFormed(): boolean }).isWellFormed()).toBe(true);
  });

  it("skips malformed layers gracefully", () => {
    const bogus = { type: "font", font: "doesNotExist" } as unknown as Layer;
    expect(applyLayers("ok", [bogus, marks(MK.triangle)])).toBe("o\u{20E4}k\u{20E4}");
  });

  it("applies optional NFC output normalization", () => {
    expect(applyLayers("e", [marks("\u{0301}")])).toBe("e\u{0301}");
    expect(applyLayers("e", [marks("\u{0301}")], { outputNormalization: "NFC" })).toBe("\u{00E9}");
  });

  it("never attaches marks to newlines", () => {
    expect(applyLayers("a\nb", [marks(MK.triangle, { target: "all" })])).toBe("a\u{20E4}\nb\u{20E4}");
  });
});

describe("stripDecorativeMarks", () => {
  it("removes zalgo and overlays but keeps composed accents and emoji", () => {
    const zalgo = applyLayers("hello", [{ type: "zalgo", up: 8, mid: 2, down: 8, seed: 3 }]);
    expect(stripDecorativeMarks(zalgo).length).toBeLessThanOrEqual(zalgo.length);
    expect(stripDecorativeMarks(applyLayers("TEXT", [marks(MK.triangle)]))).toBe("TEXT");
    expect(stripDecorativeMarks("caf\u{00E9}")).toBe("caf\u{00E9}");
    expect(stripDecorativeMarks(KEYCAP_1)).toBe(KEYCAP_1);
    expect(stripDecorativeMarks("\u{1F525}\u{20E4}")).toBe("\u{1F525}");
  });
});

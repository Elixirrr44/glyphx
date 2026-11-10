import { describe, expect, it } from "vitest";
import { countGraphemes, fallbackSegment, hasNativeSegmenter, isEmojiGrapheme, segmentGraphemes } from "./segment";

const FAMILY = "\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}\u{200D}\u{1F466}";
const THUMB_MEDIUM = "\u{1F44D}\u{1F3FD}";
const THUMB = "\u{1F44D}";
const US = "\u{1F1FA}\u{1F1F8}";
const JP = "\u{1F1EF}\u{1F1F5}";
const KEYCAP_1 = "1\u{FE0F}\u{20E3}";
const SCOTLAND = "\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}";
const HEART_ON_FIRE = "\u{2764}\u{FE0F}\u{200D}\u{1F525}";
const RAINBOW_FLAG = "\u{1F3F3}\u{FE0F}\u{200D}\u{1F308}";
const E_ACUTE_NFD = "e\u{0301}";
const ZALGO_A = "a" + "\u{0300}\u{0301}\u{0316}\u{0317}\u{0334}".repeat(6);
const HANGUL_JAMO = "\u{1100}\u{1161}\u{11A8}";
const PERSON_HANDSHAKE_TONES = "\u{1F9D1}\u{1F3FB}\u{200D}\u{1F91D}\u{200D}\u{1F9D1}\u{1F3FF}";

const CASES: [string, string, string[]][] = [
  ["ascii", "Hello", ["H", "e", "l", "l", "o"]],
  ["combining accent", `${E_ACUTE_NFD}x`, [E_ACUTE_NFD, "x"]],
  ["enclosing triangle", "G\u{20E4}A\u{20E4}", ["G\u{20E4}", "A\u{20E4}"]],
  ["ZWJ family", `${FAMILY}!`, [FAMILY, "!"]],
  ["skin tone", THUMB_MEDIUM + THUMB, [THUMB_MEDIUM, THUMB]],
  ["flags", US + JP, [US, JP]],
  ["odd regional indicator", US + "\u{1F1EF}", [US, "\u{1F1EF}"]],
  ["keycap", `${KEYCAP_1}#`, [KEYCAP_1, "#"]],
  ["tag sequence flag", `${SCOTLAND}x`, [SCOTLAND, "x"]],
  ["heart on fire", `a${HEART_ON_FIRE}b`, ["a", HEART_ON_FIRE, "b"]],
  ["rainbow flag", RAINBOW_FLAG, [RAINBOW_FLAG]],
  ["multi-tone ZWJ", PERSON_HANDSHAKE_TONES, [PERSON_HANDSHAKE_TONES]],
  ["CRLF", "a\r\nb", ["a", "\r\n", "b"]],
  ["hangul jamo", HANGUL_JAMO, [HANGUL_JAMO]],
  ["heavy zalgo", `${ZALGO_A}b`, [ZALGO_A, "b"]],
  ["emoji + enclosing mark", `\u{1F525}\u{20E4}x`, ["\u{1F525}\u{20E4}", "x"]],
  ["empty", "", []],
];

describe("segmentGraphemes", () => {
  it("uses Intl.Segmenter in this runtime", () => {
    expect(hasNativeSegmenter()).toBe(true);
  });

  it.each(CASES)("native: %s", (_name, input, expected) => {
    expect(segmentGraphemes(input)).toEqual(expected);
  });

  it.each(CASES)("fallback: %s", (_name, input, expected) => {
    expect(fallbackSegment(input)).toEqual(expected);
    expect(segmentGraphemes(input, { forceFallback: true })).toEqual(expected);
  });

  it("joining the segments always reproduces the input", () => {
    for (const [, input] of CASES) {
      expect(segmentGraphemes(input).join("")).toBe(input);
      expect(fallbackSegment(input).join("")).toBe(input);
    }
  });

  it("counts graphemes", () => {
    expect(countGraphemes(`${FAMILY}${US}ab`)).toBe(4);
    expect(countGraphemes("")).toBe(0);
  });
});

describe("isEmojiGrapheme", () => {
  it("detects emoji clusters", () => {
    for (const e of [FAMILY, THUMB_MEDIUM, US, KEYCAP_1, SCOTLAND, HEART_ON_FIRE, "\u{1F525}", "\u{2764}\u{FE0F}"]) {
      expect(isEmojiGrapheme(e)).toBe(true);
    }
  });

  it("does not treat letters, marks or text keycaps as emoji", () => {
    for (const t of ["A", E_ACUTE_NFD, "G\u{20E4}", "A\u{20E3}", "\u{2605}", " "]) {
      expect(isEmojiGrapheme(t)).toBe(false);
    }
  });
});

/**
 * Grapheme cluster segmentation.
 *
 * Uses `Intl.Segmenter` (full UAX #29 support) when the runtime provides it and
 * falls back to a compact rule-based segmenter that covers the cases GlyphX
 * relies on: combining marks, emoji ZWJ sequences, skin-tone modifiers,
 * variation selectors, keycaps, regional-indicator flags, emoji tag sequences
 * and Hangul syllables.
 */

type SegmenterLike = { segment(input: string): Iterable<{ segment: string }> };

let cachedSegmenter: SegmenterLike | null | undefined;

function getSegmenter(): SegmenterLike | null {
  if (cachedSegmenter !== undefined) return cachedSegmenter;
  try {
    const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: { granularity: string }) => SegmenterLike }).Segmenter;
    cachedSegmenter = Seg ? new Seg(undefined, { granularity: "grapheme" }) : null;
  } catch {
    cachedSegmenter = null;
  }
  return cachedSegmenter;
}

export function hasNativeSegmenter(): boolean {
  return getSegmenter() !== null;
}

export interface SegmentOptions {
  /** Force the built-in fallback segmenter (used by tests and old browsers). */
  forceFallback?: boolean;
}

/** Split text into user-perceived characters (extended grapheme clusters). */
export function segmentGraphemes(text: string, options: SegmentOptions = {}): string[] {
  if (!text) return [];
  const segmenter = options.forceFallback ? null : getSegmenter();
  if (segmenter) {
    const out: string[] = [];
    for (const s of segmenter.segment(text)) out.push(s.segment);
    return out;
  }
  return fallbackSegment(text);
}

/** Count graphemes without allocating the full array when possible. */
export function countGraphemes(text: string): number {
  if (!text) return 0;
  const segmenter = getSegmenter();
  if (!segmenter) return fallbackSegment(text).length;
  let n = 0;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const _ of segmenter.segment(text)) n++;
  return n;
}

// ---------------------------------------------------------------------------
// Fallback segmenter
// ---------------------------------------------------------------------------

const RE_EXTEND = /^[\p{M}\u{200C}\u{FE00}-\u{FE0F}\u{1F3FB}-\u{1F3FF}\u{E0020}-\u{E007F}\u{E0100}-\u{E01EF}]$/u;
const RE_CONTROL = /^[\p{Cc}\p{Zl}\p{Zp}]$/u;
const RE_PICTO = /^\p{Extended_Pictographic}$/u;
const RE_RI = /^[\u{1F1E6}-\u{1F1FF}]$/u;
const ZWJ = "\u{200D}";

type HangulType = "L" | "V" | "T" | "LV" | "LVT" | null;

function hangulType(cp: number): HangulType {
  if ((cp >= 0x1100 && cp <= 0x115f) || (cp >= 0xa960 && cp <= 0xa97c)) return "L";
  if ((cp >= 0x1160 && cp <= 0x11a7) || (cp >= 0xd7b0 && cp <= 0xd7c6)) return "V";
  if ((cp >= 0x11a8 && cp <= 0x11ff) || (cp >= 0xd7cb && cp <= 0xd7fb)) return "T";
  if (cp >= 0xac00 && cp <= 0xd7a3) return (cp - 0xac00) % 28 === 0 ? "LV" : "LVT";
  return null;
}

function hangulJoins(prev: HangulType, next: HangulType): boolean {
  if (!prev || !next) return false;
  if (prev === "L") return next === "L" || next === "V" || next === "LV" || next === "LVT";
  if (prev === "LV" || prev === "V") return next === "V" || next === "T";
  if (prev === "LVT" || prev === "T") return next === "T";
  return false;
}

export function fallbackSegment(text: string): string[] {
  const cps = Array.from(text);
  const clusters: string[] = [];
  let current = "";
  let prev = "";
  let riCount = 0; // regional indicators in the current cluster
  let hasPicto = false; // current cluster contains an Extended_Pictographic base
  let lastWasZwj = false;

  for (const ch of cps) {
    if (current === "") {
      current = ch;
      prev = ch;
      riCount = RE_RI.test(ch) ? 1 : 0;
      hasPicto = RE_PICTO.test(ch);
      lastWasZwj = ch === ZWJ;
      continue;
    }

    let join = false;
    if (prev === "\r" && ch === "\n") join = true; // GB3
    else if (RE_CONTROL.test(prev) || RE_CONTROL.test(ch)) join = false; // GB4/5
    else if (hangulJoins(hangulType(prev.codePointAt(0)!), hangulType(ch.codePointAt(0)!))) join = true; // GB6-8
    else if (ch === ZWJ || RE_EXTEND.test(ch)) join = true; // GB9 / GB9a
    else if (lastWasZwj && hasPicto && RE_PICTO.test(ch)) join = true; // GB11
    else if (RE_RI.test(ch) && RE_RI.test(prev) && riCount % 2 === 1) join = true; // GB12/13

    if (join) {
      current += ch;
      if (RE_RI.test(ch)) riCount++;
      if (RE_PICTO.test(ch)) hasPicto = true;
    } else {
      clusters.push(current);
      current = ch;
      riCount = RE_RI.test(ch) ? 1 : 0;
      hasPicto = RE_PICTO.test(ch);
    }
    lastWasZwj = ch === ZWJ;
    prev = ch;
  }
  if (current) clusters.push(current);
  return clusters;
}

// ---------------------------------------------------------------------------
// Grapheme classification helpers
// ---------------------------------------------------------------------------

const RE_SPACE = /^\s+$/u;
const RE_EMOJI_MARKERS = /[\p{Emoji_Presentation}\p{Emoji_Modifier}\u{FE0F}\u{20E3}\p{Regional_Indicator}]/u;
const RE_PICTO_ANY = /\p{Extended_Pictographic}/u;
const RE_LETTER = /\p{Alphabetic}/u;
const RE_ALNUM = /[\p{Alphabetic}\p{Nd}]/u;
const RE_INVISIBLE_ONLY = /^[\p{Cc}\p{Cf}\u{3164}\u{115F}\u{1160}\u{2800}]+$/u;
const RE_MARK = /\p{M}/gu;

export function isSpaceGrapheme(g: string): boolean {
  return RE_SPACE.test(g);
}

/** True for emoji (presentation emoji, VS16 sequences, ZWJ sequences, flags, keycaps). */
export function isEmojiGrapheme(g: string): boolean {
  if (RE_EMOJI_MARKERS.test(g)) {
    // A text character followed by U+20E3 is only an emoji keycap for 0-9 # *
    if (g.includes("\u{20E3}") && !/^[0-9#*]\u{FE0F}?\u{20E3}/u.test(g) && !RE_PICTO_ANY.test(g)) return false;
    return true;
  }
  return RE_PICTO_ANY.test(g) && g.includes("\u{200D}");
}

export function isLetterGrapheme(g: string): boolean {
  return RE_LETTER.test(g);
}

export function isAlnumGrapheme(g: string): boolean {
  return RE_ALNUM.test(g);
}

/** Graphemes that should never receive combining marks (controls, invisibles, newlines). */
export function isInertGrapheme(g: string): boolean {
  return g === "\n" || g === "\r\n" || g === "\r" || g === "\t" || RE_INVISIBLE_ONLY.test(g);
}

export function countMarks(g: string): number {
  const m = g.match(RE_MARK);
  return m ? m.length : 0;
}

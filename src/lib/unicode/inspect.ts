/**
 * Unicode character inspector: code points, official names, general
 * categories, blocks, encodings and text statistics.
 */

import { styledCharName } from "./alphabets";
import { utf8Length } from "./compat";
import { MARK_BY_CHAR } from "./marks";
import { isEmojiGrapheme, segmentGraphemes } from "./segment";

export interface CodePointInfo {
  char: string;
  cp: number;
  hex: string;
  name: string;
  category: string;
  categoryLabel: string;
  block: string;
  isMark: boolean;
  utf16: string;
  utf8: string;
  html: string;
}

export interface GraphemeInfo {
  text: string;
  isEmoji: boolean;
  codePoints: CodePointInfo[];
}

export interface TextStats {
  graphemes: number;
  codePoints: number;
  utf16: number;
  utf8Bytes: number;
  combiningMarks: number;
  emoji: number;
  words: number;
  lines: number;
  nfcStable: boolean;
  nfkcStable: boolean;
}

// ---------------------------------------------------------------------------
// Names (lazy-loaded table generated from the Unicode Character Database)
// ---------------------------------------------------------------------------

let nameTable: Map<number, string> | null = null;
let loadingNames: Promise<Map<number, string>> | null = null;

export function loadNameTable(): Promise<Map<number, string>> {
  if (nameTable) return Promise.resolve(nameTable);
  if (!loadingNames) {
    loadingNames = import("./names.generated").then((mod) => {
      const map = new Map<number, string>();
      for (const entry of mod.NAME_TABLE.split("|")) {
        const i = entry.indexOf(":");
        map.set(parseInt(entry.slice(0, i), 16), entry.slice(i + 1));
      }
      nameTable = map;
      return map;
    });
  }
  return loadingNames;
}

export function isNameTableLoaded(): boolean {
  return nameTable !== null;
}

export function codePointName(cp: number): string {
  const ch = String.fromCodePoint(cp);
  const fromTable = nameTable?.get(cp);
  if (fromTable) return fromTable;
  const mark = MARK_BY_CHAR.get(ch);
  if (mark) return mark.name;
  const styled = styledCharName(ch);
  if (styled) return styled;
  if (cp >= 0x4e00 && cp <= 0x9fff) return `CJK UNIFIED IDEOGRAPH-${cp.toString(16).toUpperCase()}`;
  if (cp >= 0xac00 && cp <= 0xd7a3) return "HANGUL SYLLABLE";
  if (cp >= 0x1f1e6 && cp <= 0x1f1ff) return `REGIONAL INDICATOR SYMBOL LETTER ${String.fromCharCode(65 + cp - 0x1f1e6)}`;
  if (cp >= 0x41 && cp <= 0x5a) return `LATIN CAPITAL LETTER ${ch}`;
  if (cp >= 0x61 && cp <= 0x7a) return `LATIN SMALL LETTER ${ch.toUpperCase()}`;
  if (cp >= 0x30 && cp <= 0x39) return `DIGIT ${["ZERO", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE"][cp - 0x30]}`;
  if (cp === 0x20) return "SPACE";
  if (cp === 0x0a) return "LINE FEED";
  if (cp === 0x1b) return "ESCAPE";
  if (cp === 0x200d) return "ZERO WIDTH JOINER";
  if (cp === 0xfe0f) return "VARIATION SELECTOR-16";
  return "";
}

// ---------------------------------------------------------------------------
// General category
// ---------------------------------------------------------------------------

const CATEGORIES: [string, string, RegExp][] = [
  ["Lu", "Uppercase letter", /^\p{Lu}$/u],
  ["Ll", "Lowercase letter", /^\p{Ll}$/u],
  ["Lt", "Titlecase letter", /^\p{Lt}$/u],
  ["Lm", "Modifier letter", /^\p{Lm}$/u],
  ["Lo", "Other letter", /^\p{Lo}$/u],
  ["Mn", "Non-spacing mark", /^\p{Mn}$/u],
  ["Mc", "Spacing mark", /^\p{Mc}$/u],
  ["Me", "Enclosing mark", /^\p{Me}$/u],
  ["Nd", "Decimal digit", /^\p{Nd}$/u],
  ["Nl", "Letter number", /^\p{Nl}$/u],
  ["No", "Other number", /^\p{No}$/u],
  ["Pc", "Connector punctuation", /^\p{Pc}$/u],
  ["Pd", "Dash punctuation", /^\p{Pd}$/u],
  ["Ps", "Open punctuation", /^\p{Ps}$/u],
  ["Pe", "Close punctuation", /^\p{Pe}$/u],
  ["Pi", "Initial quote", /^\p{Pi}$/u],
  ["Pf", "Final quote", /^\p{Pf}$/u],
  ["Po", "Other punctuation", /^\p{Po}$/u],
  ["Sm", "Math symbol", /^\p{Sm}$/u],
  ["Sc", "Currency symbol", /^\p{Sc}$/u],
  ["Sk", "Modifier symbol", /^\p{Sk}$/u],
  ["So", "Other symbol", /^\p{So}$/u],
  ["Zs", "Space separator", /^\p{Zs}$/u],
  ["Zl", "Line separator", /^\p{Zl}$/u],
  ["Zp", "Paragraph separator", /^\p{Zp}$/u],
  ["Cc", "Control", /^\p{Cc}$/u],
  ["Cf", "Format", /^\p{Cf}$/u],
  ["Co", "Private use", /^\p{Co}$/u],
];

export function generalCategory(ch: string): { code: string; label: string } {
  for (const [code, label, re] of CATEGORIES) if (re.test(ch)) return { code, label };
  return { code: "Cn", label: "Unassigned" };
}

// ---------------------------------------------------------------------------
// Blocks (subset relevant to decorative text)
// ---------------------------------------------------------------------------

const BLOCKS: [number, number, string][] = [
  [0x0000, 0x007f, "Basic Latin"],
  [0x0080, 0x00ff, "Latin-1 Supplement"],
  [0x0100, 0x017f, "Latin Extended-A"],
  [0x0180, 0x024f, "Latin Extended-B"],
  [0x0250, 0x02af, "IPA Extensions"],
  [0x02b0, 0x02ff, "Spacing Modifier Letters"],
  [0x0300, 0x036f, "Combining Diacritical Marks"],
  [0x0370, 0x03ff, "Greek and Coptic"],
  [0x0400, 0x04ff, "Cyrillic"],
  [0x0500, 0x052f, "Cyrillic Supplement"],
  [0x0590, 0x05ff, "Hebrew"],
  [0x0600, 0x06ff, "Arabic"],
  [0x0900, 0x097f, "Devanagari"],
  [0x0e00, 0x0e7f, "Thai"],
  [0x10a0, 0x10ff, "Georgian"],
  [0x1100, 0x11ff, "Hangul Jamo"],
  [0x1200, 0x137f, "Ethiopic"],
  [0x13a0, 0x13ff, "Cherokee"],
  [0x1400, 0x167f, "Unified Canadian Aboriginal Syllabics"],
  [0x16a0, 0x16ff, "Runic"],
  [0x1800, 0x18af, "Mongolian"],
  [0x1ab0, 0x1aff, "Combining Diacritical Marks Extended"],
  [0x1d00, 0x1d7f, "Phonetic Extensions"],
  [0x1d80, 0x1dbf, "Phonetic Extensions Supplement"],
  [0x1dc0, 0x1dff, "Combining Diacritical Marks Supplement"],
  [0x1e00, 0x1eff, "Latin Extended Additional"],
  [0x1f00, 0x1fff, "Greek Extended"],
  [0x2000, 0x206f, "General Punctuation"],
  [0x2070, 0x209f, "Superscripts and Subscripts"],
  [0x20a0, 0x20cf, "Currency Symbols"],
  [0x20d0, 0x20ff, "Combining Diacritical Marks for Symbols"],
  [0x2100, 0x214f, "Letterlike Symbols"],
  [0x2150, 0x218f, "Number Forms"],
  [0x2190, 0x21ff, "Arrows"],
  [0x2200, 0x22ff, "Mathematical Operators"],
  [0x2300, 0x23ff, "Miscellaneous Technical"],
  [0x2460, 0x24ff, "Enclosed Alphanumerics"],
  [0x2500, 0x257f, "Box Drawing"],
  [0x2580, 0x259f, "Block Elements"],
  [0x25a0, 0x25ff, "Geometric Shapes"],
  [0x2600, 0x26ff, "Miscellaneous Symbols"],
  [0x2700, 0x27bf, "Dingbats"],
  [0x27c0, 0x27ef, "Miscellaneous Mathematical Symbols-A"],
  [0x27f0, 0x27ff, "Supplemental Arrows-A"],
  [0x2800, 0x28ff, "Braille Patterns"],
  [0x2900, 0x297f, "Supplemental Arrows-B"],
  [0x2980, 0x29ff, "Miscellaneous Mathematical Symbols-B"],
  [0x2a00, 0x2aff, "Supplemental Mathematical Operators"],
  [0x2b00, 0x2bff, "Miscellaneous Symbols and Arrows"],
  [0x2c60, 0x2c7f, "Latin Extended-C"],
  [0x2e00, 0x2e7f, "Supplemental Punctuation"],
  [0x3000, 0x303f, "CJK Symbols and Punctuation"],
  [0x3040, 0x309f, "Hiragana"],
  [0x30a0, 0x30ff, "Katakana"],
  [0x3100, 0x312f, "Bopomofo"],
  [0x3130, 0x318f, "Hangul Compatibility Jamo"],
  [0x4e00, 0x9fff, "CJK Unified Ideographs"],
  [0xa4d0, 0xa4ff, "Lisu"],
  [0xa720, 0xa7ff, "Latin Extended-D"],
  [0xab30, 0xab6f, "Latin Extended-E"],
  [0xac00, 0xd7af, "Hangul Syllables"],
  [0xe000, 0xf8ff, "Private Use Area"],
  [0xfe00, 0xfe0f, "Variation Selectors"],
  [0xfe20, 0xfe2f, "Combining Half Marks"],
  [0xff00, 0xffef, "Halfwidth and Fullwidth Forms"],
  [0xfff0, 0xffff, "Specials"],
  [0x10780, 0x107bf, "Latin Extended-F"],
  [0x1d400, 0x1d7ff, "Mathematical Alphanumeric Symbols"],
  [0x1df00, 0x1dfff, "Latin Extended-G"],
  [0x1f000, 0x1f02f, "Mahjong Tiles"],
  [0x1f0a0, 0x1f0ff, "Playing Cards"],
  [0x1f100, 0x1f1ff, "Enclosed Alphanumeric Supplement"],
  [0x1f200, 0x1f2ff, "Enclosed Ideographic Supplement"],
  [0x1f300, 0x1f5ff, "Miscellaneous Symbols and Pictographs"],
  [0x1f600, 0x1f64f, "Emoticons"],
  [0x1f680, 0x1f6ff, "Transport and Map Symbols"],
  [0x1f780, 0x1f7ff, "Geometric Shapes Extended"],
  [0x1f900, 0x1f9ff, "Supplemental Symbols and Pictographs"],
  [0x1fa70, 0x1faff, "Symbols and Pictographs Extended-A"],
  [0xe0000, 0xe007f, "Tags"],
  [0xe0100, 0xe01ef, "Variation Selectors Supplement"],
];

export function blockName(cp: number): string {
  let lo = 0;
  let hi = BLOCKS.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const [a, b, name] = BLOCKS[mid];
    if (cp < a) hi = mid - 1;
    else if (cp > b) lo = mid + 1;
    else return name;
  }
  return "Other";
}

// ---------------------------------------------------------------------------
// Encoding helpers
// ---------------------------------------------------------------------------

export function formatCodePoint(cp: number): string {
  return "U+" + cp.toString(16).toUpperCase().padStart(4, "0");
}

function utf16Escape(ch: string): string {
  let s = "";
  for (let i = 0; i < ch.length; i++) s += "\\u" + ch.charCodeAt(i).toString(16).toUpperCase().padStart(4, "0");
  return s;
}

function utf8Hex(ch: string): string {
  return Array.from(new TextEncoder().encode(ch), (b) => b.toString(16).toUpperCase().padStart(2, "0")).join(" ");
}

export function describeCodePoint(ch: string): CodePointInfo {
  const cp = ch.codePointAt(0)!;
  const cat = generalCategory(ch);
  return {
    char: ch,
    cp,
    hex: formatCodePoint(cp),
    name: codePointName(cp),
    category: cat.code,
    categoryLabel: cat.label,
    block: blockName(cp),
    isMark: cat.code.startsWith("M"),
    utf16: utf16Escape(ch),
    utf8: utf8Hex(ch),
    html: `&#x${cp.toString(16).toUpperCase()};`,
  };
}

/** Inspect text grapheme by grapheme. `limit` caps the number of graphemes analysed. */
export function inspectText(text: string, limit = 300): { graphemes: GraphemeInfo[]; truncated: boolean } {
  const all = segmentGraphemes(text);
  const graphemes = all.slice(0, limit).map((g) => ({
    text: g,
    isEmoji: isEmojiGrapheme(g),
    codePoints: Array.from(g, describeCodePoint),
  }));
  return { graphemes, truncated: all.length > limit };
}

const RE_MARK_G = /\p{M}/gu;

export function textStats(text: string): TextStats {
  const graphemes = segmentGraphemes(text);
  let emoji = 0;
  for (const g of graphemes) if (isEmojiGrapheme(g)) emoji++;
  const trimmed = text.trim();
  return {
    graphemes: graphemes.length,
    codePoints: Array.from(text).length,
    utf16: text.length,
    utf8Bytes: utf8Length(text),
    combiningMarks: text.match(RE_MARK_G)?.length ?? 0,
    emoji,
    words: trimmed ? trimmed.split(/\s+/u).length : 0,
    lines: text ? text.split("\n").length : 0,
    nfcStable: text === text.normalize("NFC"),
    nfkcStable: text === text.normalize("NFKC"),
  };
}

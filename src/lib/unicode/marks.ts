/**
 * Catalog of combining marks used by GlyphX. Every entry is a real Unicode
 * combining character; it attaches to the grapheme that precedes it.
 */

export type MarkPosition = "enclose" | "overlay" | "above" | "below";

export interface CombiningMark {
  id: string;
  char: string;
  name: string; // official Unicode character name
  label: string; // friendly label for the UI
  position: MarkPosition;
}

const m = (id: string, cp: number, name: string, label: string, position: MarkPosition): CombiningMark => ({
  id,
  char: String.fromCodePoint(cp),
  name,
  label,
  position,
});

export const MARKS: CombiningMark[] = [
  // Enclosing marks (General Category Me)
  m("triangle", 0x20e4, "COMBINING ENCLOSING UPWARD POINTING TRIANGLE", "Triangle", "enclose"),
  m("circle", 0x20dd, "COMBINING ENCLOSING CIRCLE", "Circle", "enclose"),
  m("square", 0x20de, "COMBINING ENCLOSING SQUARE", "Square", "enclose"),
  m("diamond", 0x20df, "COMBINING ENCLOSING DIAMOND", "Diamond", "enclose"),
  m("noEntry", 0x20e0, "COMBINING ENCLOSING CIRCLE BACKSLASH", "Circle backslash", "enclose"),
  m("screen", 0x20e2, "COMBINING ENCLOSING SCREEN", "Screen", "enclose"),
  m("keycap", 0x20e3, "COMBINING ENCLOSING KEYCAP", "Keycap", "enclose"),

  // Overlays / strikethrough
  m("strike", 0x0336, "COMBINING LONG STROKE OVERLAY", "Strikethrough", "overlay"),
  m("shortStrike", 0x0335, "COMBINING SHORT STROKE OVERLAY", "Short stroke", "overlay"),
  m("slash", 0x0337, "COMBINING SHORT SOLIDUS OVERLAY", "Slash", "overlay"),
  m("longSlash", 0x0338, "COMBINING LONG SOLIDUS OVERLAY", "Long slash", "overlay"),
  m("tildeOverlay", 0x0334, "COMBINING TILDE OVERLAY", "Tilde overlay", "overlay"),
  m("reverseSlash", 0x20e5, "COMBINING REVERSE SOLIDUS OVERLAY", "Backslash", "overlay"),
  m("doubleSlash", 0x20eb, "COMBINING LONG DOUBLE SOLIDUS OVERLAY", "Double slash", "overlay"),
  m("ringOverlay", 0x20d8, "COMBINING RING OVERLAY", "Ring overlay", "overlay"),
  m("verticalOverlay", 0x20d2, "COMBINING LONG VERTICAL LINE OVERLAY", "Vertical line", "overlay"),
  m("doubleVerticalOverlay", 0x20e6, "COMBINING DOUBLE VERTICAL STROKE OVERLAY", "Double vertical", "overlay"),

  // Above
  m("overline", 0x0305, "COMBINING OVERLINE", "Overline", "above"),
  m("doubleOverline", 0x033f, "COMBINING DOUBLE OVERLINE", "Double overline", "above"),
  m("xAbove", 0x033d, "COMBINING X ABOVE", "X above", "above"),
  m("ringAbove", 0x030a, "COMBINING RING ABOVE", "Ring above", "above"),
  m("dotAbove", 0x0307, "COMBINING DOT ABOVE", "Dot above", "above"),
  m("diaeresis", 0x0308, "COMBINING DIAERESIS", "Umlaut", "above"),
  m("tilde", 0x0303, "COMBINING TILDE", "Tilde", "above"),
  m("caron", 0x030c, "COMBINING CARON", "Caron", "above"),
  m("breve", 0x0306, "COMBINING BREVE", "Breve", "above"),
  m("invertedBreve", 0x0311, "COMBINING INVERTED BREVE", "Arch", "above"),
  m("acute", 0x0301, "COMBINING ACUTE ACCENT", "Acute", "above"),
  m("grave", 0x0300, "COMBINING GRAVE ACCENT", "Grave", "above"),
  m("circumflex", 0x0302, "COMBINING CIRCUMFLEX ACCENT", "Circumflex", "above"),
  m("verticalAbove", 0x030d, "COMBINING VERTICAL LINE ABOVE", "Tick above", "above"),
  m("zigzag", 0x035b, "COMBINING ZIGZAG ABOVE", "Zigzag", "above"),
  m("fermata", 0x0352, "COMBINING FERMATA", "Fermata", "above"),
  m("bridgeAbove", 0x0346, "COMBINING BRIDGE ABOVE", "Bridge above", "above"),
  m("arrowRightAbove", 0x20d7, "COMBINING RIGHT ARROW ABOVE", "Arrow above", "above"),
  m("arrowLeftRightAbove", 0x20e1, "COMBINING LEFT RIGHT ARROW ABOVE", "Two-way arrow", "above"),
  m("threeDots", 0x20db, "COMBINING THREE DOTS ABOVE", "Three dots", "above"),
  m("fourDots", 0x20dc, "COMBINING FOUR DOTS ABOVE", "Four dots", "above"),
  m("clockwiseArrow", 0x20d5, "COMBINING CLOCKWISE ARROW ABOVE", "Clockwise", "above"),
  m("almostEqual", 0x034c, "COMBINING ALMOST EQUAL TO ABOVE", "Wave above", "above"),

  // Below
  m("underline", 0x0332, "COMBINING LOW LINE", "Underline", "below"),
  m("doubleUnderline", 0x0333, "COMBINING DOUBLE LOW LINE", "Double underline", "below"),
  m("tildeBelow", 0x0330, "COMBINING TILDE BELOW", "Wavy underline", "below"),
  m("dotBelow", 0x0323, "COMBINING DOT BELOW", "Dot below", "below"),
  m("diaeresisBelow", 0x0324, "COMBINING DIAERESIS BELOW", "Two dots below", "below"),
  m("ringBelow", 0x0325, "COMBINING RING BELOW", "Ring below", "below"),
  m("verticalBelow", 0x0329, "COMBINING VERTICAL LINE BELOW", "Drip", "below"),
  m("seagull", 0x033c, "COMBINING SEAGULL BELOW", "Seagull", "below"),
  m("squareBelow", 0x033b, "COMBINING SQUARE BELOW", "Square below", "below"),
  m("bridgeBelow", 0x032a, "COMBINING BRIDGE BELOW", "Bridge below", "below"),
  m("asteriskBelow", 0x0359, "COMBINING ASTERISK BELOW", "Asterisk below", "below"),
  m("xBelow", 0x0353, "COMBINING X BELOW", "X below", "below"),
  m("plusBelow", 0x031f, "COMBINING PLUS SIGN BELOW", "Plus below", "below"),
  m("upArrowBelow", 0x034e, "COMBINING UPWARDS ARROW BELOW", "Arrow below", "below"),
  m("tripleUnderdot", 0x20e8, "COMBINING TRIPLE UNDERDOT", "Triple underdot", "below"),
];

export const MARK_BY_ID: Record<string, CombiningMark> = Object.fromEntries(MARKS.map((mk) => [mk.id, mk]));
export const MARK_BY_CHAR: Map<string, CombiningMark> = new Map(MARKS.map((mk) => [mk.char, mk]));

export const POSITION_LABELS: Record<MarkPosition, string> = {
  enclose: "Enclosing",
  overlay: "Overlay & strike",
  above: "Above",
  below: "Below",
};

/** Convenient constants for the most used marks. */
export const MK = {
  triangle: "\u{20E4}",
  circle: "\u{20DD}",
  square: "\u{20DE}",
  diamond: "\u{20DF}",
  noEntry: "\u{20E0}",
  screen: "\u{20E2}",
  keycap: "\u{20E3}",
  strike: "\u{336}",
  shortStrike: "\u{335}",
  slash: "\u{337}",
  longSlash: "\u{338}",
  tildeOverlay: "\u{334}",
  underline: "\u{332}",
  doubleUnderline: "\u{333}",
  overline: "\u{305}",
  doubleOverline: "\u{33F}",
  xAbove: "\u{33D}",
  ringAbove: "\u{30A}",
  dotAbove: "\u{307}",
  diaeresis: "\u{308}",
  tildeBelow: "\u{330}",
  dotBelow: "\u{323}",
  verticalBelow: "\u{329}",
  arrowRightAbove: "\u{20D7}",
  squareBelow: "\u{33B}",
  seagull: "\u{33C}",
  threeDots: "\u{20DB}",
  zigzag: "\u{35B}",
  reverseSlash: "\u{20E5}",
  ringOverlay: "\u{20D8}",
} as const;

// ---------------------------------------------------------------------------
// Zalgo mark pools (classic up / middle / down sets)
// ---------------------------------------------------------------------------

const range = (from: number, to: number): string[] => {
  const out: string[] = [];
  for (let cp = from; cp <= to; cp++) out.push(String.fromCodePoint(cp));
  return out;
};

export const ZALGO_UP: string[] = [
  ...range(0x0300, 0x0314),
  ...range(0x033d, 0x0344),
  "\u{346}",
  ...range(0x034a, 0x034c),
  ...range(0x0350, 0x0352),
  "\u{357}",
  "\u{35B}",
  ...range(0x0363, 0x036f),
];

export const ZALGO_MID: string[] = ["\u{315}", "\u{31B}", "\u{358}", "\u{321}", "\u{322}", "\u{327}", "\u{328}", ...range(0x0334, 0x0338), "\u{35C}", "\u{35E}", "\u{35F}", "\u{360}", "\u{362}"];

export const ZALGO_DOWN: string[] = [
  ...range(0x0316, 0x0319),
  ...range(0x031c, 0x0320),
  ...range(0x0323, 0x0326),
  ...range(0x0329, 0x0333),
  ...range(0x0339, 0x033c),
  "\u{345}",
  ...range(0x0347, 0x0349),
  "\u{34D}",
  "\u{34E}",
  ...range(0x0353, 0x0356),
  "\u{359}",
  "\u{35A}",
];

export const ENCLOSING_MARK_RE = /[\u{20DD}-\u{20E0}\u{20E2}-\u{20E4}]/u;

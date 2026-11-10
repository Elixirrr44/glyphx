/**
 * Character maps ("fonts") built from real Unicode blocks: Mathematical
 * Alphanumeric Symbols, Enclosed Alphanumerics, Halfwidth/Fullwidth forms,
 * phonetic small capitals, super/subscripts and look-alike letter sets.
 */

export type FontId =
  | "bold"
  | "italic"
  | "boldItalic"
  | "script"
  | "boldScript"
  | "fraktur"
  | "boldFraktur"
  | "doubleStruck"
  | "sans"
  | "sansBold"
  | "sansItalic"
  | "sansBoldItalic"
  | "monospace"
  | "fullwidth"
  | "smallCaps"
  | "superscript"
  | "subscript"
  | "circled"
  | "negativeCircled"
  | "squared"
  | "negativeSquared"
  | "parenthesized"
  | "regional"
  | "upsideDown"
  | "mirror"
  | "fauxCyrillic"
  | "runic"
  | "currency"
  | "kanjiStyle"
  | "ethiopicStyle"
  | "greekStyle";

export interface FontDef {
  id: FontId;
  label: string;
  /** Short description of where the glyphs come from. */
  source: string;
  map: Map<string, string>;
  /** Unicode names for generated characters (used by the inspector). */
  names?: Map<string, string>;
}

const RE_MARK = /^\p{M}$/u;
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";

function mathAlphabet(
  label: string,
  styleName: string,
  upperStart: number,
  lowerStart: number,
  holes: Record<string, number> = {},
  digitStart?: number,
): Omit<FontDef, "id"> {
  const map = new Map<string, string>();
  const names = new Map<string, string>();
  for (let i = 0; i < 26; i++) {
    const U = UPPER[i];
    const L = LOWER[i];
    const uc = String.fromCodePoint(holes[U] ?? upperStart + i);
    const lc = String.fromCodePoint(holes[L] ?? lowerStart + i);
    map.set(U, uc);
    map.set(L, lc);
    if (holes[U] === undefined) names.set(uc, `MATHEMATICAL ${styleName} CAPITAL ${U}`);
    if (holes[L] === undefined) names.set(lc, `MATHEMATICAL ${styleName} SMALL ${U}`);
  }
  if (digitStart !== undefined) {
    const digitNames = ["ZERO", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE"];
    for (let d = 0; d < 10; d++) {
      const ch = String.fromCodePoint(digitStart + d);
      map.set(DIGITS[d], ch);
      names.set(ch, `MATHEMATICAL ${styleName} DIGIT ${digitNames[d]}`);
    }
  }
  return { label, source: "Mathematical Alphanumeric Symbols", map, names };
}

function fromPairs(label: string, source: string, from: string, to: string, caseInsensitive = false): Omit<FontDef, "id"> {
  const map = new Map<string, string>();
  const src = Array.from(from);
  const dst = Array.from(to);
  if (src.length !== dst.length) throw new Error(`Font ${label}: length mismatch ${src.length} vs ${dst.length}`);
  src.forEach((ch, i) => {
    map.set(ch, dst[i]);
    if (caseInsensitive) {
      const other = ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase();
      if (!map.has(other)) map.set(other, dst[i]);
    }
  });
  return { label, source, map };
}

function offsetRange(
  label: string,
  source: string,
  chars: string,
  start: number,
  extra: Record<string, string> = {},
  caseInsensitive = false,
): Omit<FontDef, "id"> {
  const map = new Map<string, string>();
  Array.from(chars).forEach((ch, i) => {
    const out = String.fromCodePoint(start + i);
    map.set(ch, out);
    if (caseInsensitive) map.set(ch.toLowerCase(), out);
  });
  for (const [k, v] of Object.entries(extra)) map.set(k, v);
  return { label, source, map };
}

const defs: Record<FontId, Omit<FontDef, "id">> = {
  bold: mathAlphabet("Bold Serif", "BOLD", 0x1d400, 0x1d41a, {}, 0x1d7ce),
  italic: mathAlphabet("Italic Serif", "ITALIC", 0x1d434, 0x1d44e, { h: 0x210e }),
  boldItalic: mathAlphabet("Bold Italic Serif", "BOLD ITALIC", 0x1d468, 0x1d482),
  script: mathAlphabet("Script", "SCRIPT", 0x1d49c, 0x1d4b6, {
    B: 0x212c, E: 0x2130, F: 0x2131, H: 0x210b, I: 0x2110, L: 0x2112, M: 0x2133, R: 0x211b,
    e: 0x212f, g: 0x210a, o: 0x2134,
  }),
  boldScript: mathAlphabet("Bold Script", "BOLD SCRIPT", 0x1d4d0, 0x1d4ea),
  fraktur: mathAlphabet("Fraktur", "FRAKTUR", 0x1d504, 0x1d51e, { C: 0x212d, H: 0x210c, I: 0x2111, R: 0x211c, Z: 0x2128 }),
  boldFraktur: mathAlphabet("Bold Fraktur", "BOLD FRAKTUR", 0x1d56c, 0x1d586),
  doubleStruck: mathAlphabet(
    "Double-Struck",
    "DOUBLE-STRUCK",
    0x1d538,
    0x1d552,
    { C: 0x2102, H: 0x210d, N: 0x2115, P: 0x2119, Q: 0x211a, R: 0x211d, Z: 0x2124 },
    0x1d7d8,
  ),
  sans: mathAlphabet("Sans", "SANS-SERIF", 0x1d5a0, 0x1d5ba, {}, 0x1d7e2),
  sansBold: mathAlphabet("Sans Bold", "SANS-SERIF BOLD", 0x1d5d4, 0x1d5ee, {}, 0x1d7ec),
  sansItalic: mathAlphabet("Sans Italic", "SANS-SERIF ITALIC", 0x1d608, 0x1d622),
  sansBoldItalic: mathAlphabet("Sans Bold Italic", "SANS-SERIF BOLD ITALIC", 0x1d63c, 0x1d656),
  monospace: mathAlphabet("Monospace", "MONOSPACE", 0x1d670, 0x1d68a, {}, 0x1d7f6),
  fullwidth: (() => {
    const map = new Map<string, string>();
    for (let cp = 0x21; cp <= 0x7e; cp++) map.set(String.fromCharCode(cp), String.fromCodePoint(cp + 0xfee0));
    map.set(" ", "\u{3000}");
    return { label: "Fullwidth", source: "Halfwidth and Fullwidth Forms", map };
  })(),
  smallCaps: fromPairs(
    "Small Caps",
    "IPA / Phonetic Extensions",
    LOWER,
    "ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢ",
    true,
  ),
  superscript: (() => {
    const base = fromPairs("Superscript", "Spacing Modifier Letters & Superscripts", LOWER + DIGITS + "+-=()", "ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖqʳˢᵗᵘᵛʷˣʸᶻ⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾");
    const upper = fromPairs("", "", "ABDEGHIJKLMNOPRTUVW", "ᴬᴮᴰᴱᴳᴴᴵᴶᴷᴸᴹᴺᴼᴾᴿᵀᵁⱽᵂ");
    for (const [k, v] of upper.map) base.map.set(k, v);
    for (const ch of UPPER) if (!base.map.has(ch)) base.map.set(ch, base.map.get(ch.toLowerCase())!);
    return base;
  })(),
  subscript: fromPairs("Subscript", "Superscripts and Subscripts", "aehijklmnoprstuvx0123456789+-=()", "ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓ₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎", true),
  circled: offsetRange("Circled", "Enclosed Alphanumerics", UPPER, 0x24b6, {
    ...Object.fromEntries(Array.from(LOWER).map((c, i) => [c, String.fromCodePoint(0x24d0 + i)])),
    "0": "⓪",
    ...Object.fromEntries(Array.from("123456789").map((c, i) => [c, String.fromCodePoint(0x2460 + i)])),
  }),
  negativeCircled: offsetRange(
    "Negative Circled",
    "Enclosed Alphanumeric Supplement",
    UPPER,
    0x1f150,
    { "0": "⓿", ...Object.fromEntries(Array.from("123456789").map((c, i) => [c, String.fromCodePoint(0x2776 + i)])) },
    true,
  ),
  squared: offsetRange("Squared", "Enclosed Alphanumeric Supplement", UPPER, 0x1f130, {}, true),
  negativeSquared: offsetRange("Negative Squared", "Enclosed Alphanumeric Supplement", UPPER, 0x1f170, {}, true),
  parenthesized: offsetRange("Parenthesized", "Enclosed Alphanumerics", LOWER, 0x249c, {
    ...Object.fromEntries(Array.from(UPPER).map((c, i) => [c, String.fromCodePoint(0x1f110 + i)])),
    ...Object.fromEntries(Array.from("123456789").map((c, i) => [c, String.fromCodePoint(0x2474 + i)])),
  }),
  regional: offsetRange("Regional Indicator", "Enclosed Alphanumeric Supplement", UPPER, 0x1f1e6, {}, true),
  upsideDown: fromPairs(
    "Upside Down",
    "IPA, Lisu and Letterlike look-alikes",
    LOWER + UPPER + "0123456789.,'?!\"()[]{}<>&_;",
    "ɐqɔpǝɟƃɥᴉɾʞlɯuodbɹsʇnʌʍxʎz" + "∀ꓭƆꓷƎℲ⅁HIſꓘ˥WNOԀΌꓤS⊥∩ΛMX⅄Z" + "0ƖᄅƐㄣϛ9ㄥ86˙'‚¿¡„)(][}{><⅋‾؛",
  ),
  mirror: fromPairs(
    "Mirror",
    "Latin, Cyrillic and Letterlike look-alikes",
    "ABCDEFGJKLNPQRSZbdegjkpqrsyz?",
    "AᙠƆᗡƎꟻᎮႱꓘ⅃ИꟼϘЯƧƸdbɘϱꞁʞqpɿƨʏƹ⸮",
  ),
  fauxCyrillic: fromPairs(
    "Faux Cyrillic",
    "Cyrillic look-alikes",
    UPPER + LOWER,
    "ДБҀↁЄҒБНЇЈЌГМИФРǪЯЅГЦѴЩЖЧЗ" + "двсↁєғбнїјкгмифрǫяѕтцѵщжчз",
  ),
  runic: fromPairs("Runic", "Runic block (Elder Futhark)", UPPER, "ᚨᛒᚲᛞᛖᚠᚷᚺᛁᛃᚲᛚᛗᚾᛟᛈᚲᚱᛊᛏᚢᚡᚹᛪᛃᛉ", true),
  currency: fromPairs("Currency", "Currency Symbols & Latin", UPPER, "₳฿₵ĐɆ₣₲ⱧłJ₭Ⱡ₥₦Ø₱QⱤ₴₮ɄV₩ӾɎⱫ", true),
  kanjiStyle: fromPairs("Kanji Style", "CJK & Bopomofo look-alikes", UPPER, "卂乃匚ᗪ乇千Ꮆ卄丨ﾌҜㄥ爪几ㄖ卩Ɋ尺丂ㄒㄩᐯ山乂ㄚ乙", true),
  ethiopicStyle: fromPairs("Ethiopic Style", "Ethiopic look-alikes", UPPER, "ልጌርዕቿቻኗዘጎጋጕረጠክዐየዒዪነፕሁሀሠሸሃጊ", true),
  greekStyle: fromPairs("Greek Style", "Greek, Hebrew & Letterlike look-alikes", LOWER, "αв¢∂єƒgнιנкℓмησρqяѕтυνωχуz", true),
};

export const FONTS: Record<FontId, FontDef> = Object.fromEntries(
  (Object.keys(defs) as FontId[]).map((id) => [id, { id, ...defs[id] }]),
) as Record<FontId, FontDef>;

export const FONT_IDS = Object.keys(FONTS) as FontId[];

/** Fonts that are pure visual restyles of letters and safe to combine with marks. */
export const LETTER_FONTS: FontId[] = [
  "bold", "italic", "boldItalic", "script", "boldScript", "fraktur", "boldFraktur", "doubleStruck",
  "sans", "sansBold", "sansItalic", "sansBoldItalic", "monospace", "fullwidth", "smallCaps",
  "greekStyle", "currency", "fauxCyrillic",
];

/** Reverse lookup used to "unstyle" text and by the inspector. */
const reverseMap = new Map<string, string>();
const nameMap = new Map<string, string>();
for (const f of Object.values(FONTS)) {
  if (f.id === "upsideDown" || f.id === "mirror") continue;
  for (const [plain, styled] of f.map) {
    if (styled !== plain && !reverseMap.has(styled)) reverseMap.set(styled, plain);
  }
  if (f.names) for (const [ch, n] of f.names) nameMap.set(ch, n);
}

export function styledCharName(ch: string): string | undefined {
  return nameMap.get(ch);
}

/** Convert styled characters back to plain ASCII where a mapping exists. */
export function unstyle(text: string): string {
  let out = "";
  for (const ch of text) out += reverseMap.get(ch) ?? ch;
  return out;
}

/**
 * Map one grapheme through a font. Accented letters are decomposed (NFD) so
 * the base letter is styled and the original accents are preserved.
 */
export function mapGrapheme(g: string, font: FontDef): string {
  const direct = font.map.get(g);
  if (direct !== undefined) return direct;
  const cps = Array.from(g);
  // Grapheme already carries combining marks (e.g. from an earlier layer): style the base only.
  if (cps.length > 1) {
    const first = font.map.get(cps[0]);
    if (first !== undefined && cps.slice(1).every((c) => RE_MARK.test(c))) return first + cps.slice(1).join("");
  }
  // Precomposed accented letter: decompose, style the base, keep the accents.
  const nfdCps = Array.from(g.normalize("NFD"));
  if (nfdCps.length > 1) {
    const base = font.map.get(nfdCps[0]);
    if (base !== undefined && nfdCps.slice(1).every((c) => RE_MARK.test(c))) return base + nfdCps.slice(1).join("");
  }
  return g;
}

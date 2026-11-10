/**
 * The GlyphX preset library. Each preset is a distinct, ordered recipe of
 * engine layers — tests assert that no two presets produce the same output.
 */

import type { FontId } from "./unicode/alphabets";
import type { AnsiBg, AnsiColor, CaseMode, Layer, Target } from "./unicode/engine";
import { MK } from "./unicode/marks";

export type CategoryId =
  | "triangle"
  | "emoji"
  | "glitch"
  | "gothic"
  | "gaming"
  | "aesthetic"
  | "symbol"
  | "enclosed"
  | "discord"
  | "custom";

export interface Category {
  id: CategoryId;
  label: string;
  emoji: string;
  description: string;
}

export const CATEGORIES: Category[] = [
  { id: "triangle", label: "Triangle Effects", emoji: "\u{25B3}", description: "Combining enclosing triangle (U+20E4) overlays" },
  { id: "emoji", label: "Emoji Effects", emoji: "\u{2728}", description: "Emoji trails, frames and letter tiles" },
  { id: "glitch", label: "Glitch / Zalgo", emoji: "\u{26A1}", description: "Stacked combining marks and corruption" },
  { id: "gothic", label: "Gothic & Dark", emoji: "\u{271E}", description: "Blackletter, runes and dark ornaments" },
  { id: "gaming", label: "Gaming Nicknames", emoji: "\u{1F3AE}", description: "Clan tags and gamer name frames" },
  { id: "aesthetic", label: "Aesthetic Text", emoji: "\u{2601}", description: "Vaporwave, tiny text and soft scripts" },
  { id: "symbol", label: "Symbol Decorations", emoji: "\u{2605}", description: "Separators, brackets and borders" },
  { id: "enclosed", label: "Enclosed Characters", emoji: "\u{24B6}", description: "Circled, squared and enclosing marks" },
  { id: "discord", label: "Discord Text", emoji: "\u{1F4AC}", description: "Markdown and ANSI color code blocks" },
  { id: "custom", label: "Custom Effects", emoji: "\u{1F9EA}", description: "Strikes, flips, mirrors and experiments" },
];

export const CATEGORY_BY_ID: Record<CategoryId, Category> = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<
  CategoryId,
  Category
>;

export interface Preset {
  id: string;
  name: string;
  category: CategoryId;
  description: string;
  layers: Layer[];
  tags?: string[];
  /** Marked true for presets created by the user (stored locally). */
  custom?: boolean;
  createdAt?: number;
}

// ---------------------------------------------------------------------------
// Layer builders
// ---------------------------------------------------------------------------

const font = (f: FontId): Layer => ({ type: "font", font: f });
const marks = (m: string, target?: Target, every?: number): Layer => ({ type: "marks", marks: m, target, every });
const wrap = (prefix: string, suffix: string): Layer => ({ type: "wrap", prefix, suffix });
const sep = (value: string, skipSpaces = true): Layer => ({ type: "separator", value, skipSpaces });
const words = (value: string): Layer => ({ type: "wordSeparator", value });
const charWrap = (left: string, right: string): Layer => ({ type: "charWrap", left, right });
const caseL = (mode: CaseMode, seed?: number): Layer => ({ type: "case", mode, seed });
const zalgo = (up: number, mid: number, down: number, seed = 7, variance = 0.5): Layer => ({
  type: "zalgo", up, mid, down, seed, variance,
});
const emoji = (emojis: string[], mode: "between" | "words" | "wordWrap", random = false, seed = 3): Layer => ({
  type: "emoji", emojis, mode, random, seed,
});
const glitch = (amount: number, charset: string, seed = 11): Layer => ({ type: "glitchChars", amount, charset, seed });
const ansi = (fg: AnsiColor | "rainbow", opts: { bg?: AnsiBg; bold?: boolean; underline?: boolean } = {}): Layer => ({
  type: "ansi", fg, ...opts,
});
const line = (prefix: string): Layer => ({ type: "linePrefix", prefix });
const replace = (w: string, target?: Target): Layer => ({ type: "replace", with: w, target });
const REVERSE: Layer = { type: "reverse" };
const FLIP: Layer = { type: "flip" };

const NBSP = "\u{00A0}";
const ZWSP = "\u{200B}";

const p = (id: string, name: string, category: CategoryId, description: string, layers: Layer[], tags: string[] = []): Preset => ({
  id, name, category, description, layers, tags,
});

// ---------------------------------------------------------------------------
// Library
// ---------------------------------------------------------------------------

export const PRESETS: Preset[] = [
  // 1. Triangle Effects --------------------------------------------------------
  p("tri-classic", "Triangle Overlay", "triangle", "U+20E4 enclosing triangle on every character", [marks(MK.triangle)], ["gang", "pyramid"]),
  p("tri-bold", "Bold Pyramid", "triangle", "Bold serif letters inside triangles", [font("sansBold"), marks(MK.triangle)]),
  p("tri-silhouette", "Triangle Silhouette", "triangle", "Hides the text, leaving only a row of triangles", [replace(" "), marks(MK.triangle, "all")], ["hidden"]),
  p("tri-spaced", "Spaced Triangles", "triangle", "Triangles with breathing room between letters", [marks(MK.triangle), sep(" ")]),
  p("tri-double", "Double Triangle", "triangle", "Two stacked triangle marks per character", [marks(MK.triangle + MK.triangle)]),
  p("tri-circle", "Triangle in Circle", "triangle", "Triangle and circle enclosures combined", [marks(MK.triangle + MK.circle)]),
  p("tri-strike", "Struck Triangle", "triangle", "Strikethrough plus triangle overlay", [marks(MK.strike + MK.triangle)]),
  p("tri-smallcaps", "Small Caps Delta", "triangle", "Small capitals wrapped in triangles", [font("smallCaps"), marks(MK.triangle)]),
  p("tri-frame", "Triangle Frame", "triangle", "A border of standalone triangles around the text", [wrap(`${NBSP}${MK.triangle}${NBSP}${MK.triangle} `, ` ${NBSP}${MK.triangle}${NBSP}${MK.triangle}`)]),
  p("tri-alternate", "Alternating Triangles", "triangle", "Triangle on every other character", [marks(MK.triangle, "nonspace", 2)]),
  p("tri-fullwidth", "Wide Pyramid", "triangle", "Fullwidth letters fill the triangle better", [font("fullwidth"), marks(MK.triangle)]),
  p("tri-eye", "All-Seeing", "triangle", "Dotted triangles framed by eye symbols", [marks(MK.dotAbove + MK.triangle), wrap("\u{25EC} ", " \u{25EC}")]),
  p("tri-mono-dots", "Delta Circuit", "triangle", "Monospace triangles joined with dots", [font("monospace"), marks(MK.triangle), sep("\u{00B7}")]),

  // 2. Emoji Effects -----------------------------------------------------------
  p("emoji-sparkle", "Sparkle Wrap", "emoji", "Wrapped in sparkles", [wrap("\u{2728} ", " \u{2728}")]),
  p("emoji-fire", "Fire Trail", "emoji", "A flame between every character", [emoji(["\u{1F525}"], "between")]),
  p("emoji-hearts", "Heart Chain", "emoji", "Cycling hearts between characters", [emoji(["\u{1F496}", "\u{1F49C}", "\u{1F499}"], "between")]),
  p("emoji-star-words", "Star Words", "emoji", "Stars between words and at both ends", [words(" \u{2B50} "), wrap("\u{2B50} ", " \u{2B50}")]),
  p("emoji-tiles", "Letter Tiles", "emoji", "Regional indicator letter tiles (spaced to avoid flags)", [font("regional"), sep(ZWSP)]),
  p("emoji-clap", "Clap Back", "emoji", "Uppercase with claps between words", [caseL("upper"), words(" \u{1F44F} ")]),
  p("emoji-royal", "Royal Crown", "emoji", "Bold script framed by crowns", [font("boldScript"), wrap("\u{1F451} ", " \u{1F451}")]),
  p("emoji-skull", "Skull Tag", "emoji", "Spooky skull frame with small caps", [font("smallCaps"), wrap("\u{1F480} ", " \u{1F480}")]),
  p("emoji-blossom", "Blossom Words", "emoji", "Every word wrapped in blossoms", [emoji(["\u{1F338}"], "wordWrap")]),
  p("emoji-rain", "Emoji Rain", "emoji", "Random sparkles sprinkled through the text", [glitch(45, "\u{2728}\u{1F4AB}\u{2B50}\u{1F31F}", 5)]),
  p("emoji-gamer", "Gamer Tag", "emoji", "Controller-framed monospace", [font("monospace"), wrap("\u{1F3AE} ", " \u{1F579}\u{FE0F}")]),
  p("emoji-launch", "Launch Sequence", "emoji", "Rocket launch with italic caps", [caseL("upper"), font("sansItalic"), wrap("\u{1F680} ", " \u{1F4A8}")]),
  p("emoji-mixed-words", "Party Words", "emoji", "Party emoji between words and around the text", [emoji(["\u{1F389}", "\u{1F973}", "\u{1F38A}", "\u{1F37E}"], "words", true, 9), wrap("\u{1F973} ", " \u{1F389}")]),

  // 3. Glitch / Zalgo ----------------------------------------------------------
  p("zalgo-light", "Light Glitch", "glitch", "Subtle marks above and below", [zalgo(2, 0, 2, 3)]),
  p("zalgo-medium", "Medium Zalgo", "glitch", "Classic cursed text", [zalgo(5, 1, 5, 13)]),
  p("zalgo-heavy", "Heavy Zalgo", "glitch", "Tall towers of combining marks", [zalgo(12, 2, 12, 21, 0.3)]),
  p("zalgo-chaos", "Chaos", "glitch", "Maximum corruption (capped for safety)", [zalgo(20, 4, 20, 99, 0.2)]),
  p("zalgo-ascend", "Ascend", "glitch", "Marks rising only above", [zalgo(8, 0, 0, 5)]),
  p("zalgo-descend", "Descend", "glitch", "Marks dripping only below", [zalgo(0, 0, 8, 6)]),
  p("zalgo-static", "Static", "glitch", "Overlay marks only, like signal noise", [zalgo(0, 3, 0, 17, 0.2)]),
  p("glitch-blocks", "Block Corruption", "glitch", "Shade blocks injected between characters", [glitch(35, "\u{2591}\u{2592}\u{2593}\u{2588}", 4)]),
  p("glitch-corrupt", "Corrupted File", "glitch", "Random case, light zalgo and broken bars", [caseL("random", 8), zalgo(2, 1, 2, 31), glitch(25, "\u{00A6}|_\u{2584}", 8)]),
  p("glitch-terminal", "Terminal Glitch", "glitch", "Monospace with medium zalgo", [font("monospace"), zalgo(4, 0, 4, 44)]),
  p("glitch-signal", "Signal Loss", "glitch", "Slashed letters with marks dripping down", [marks(MK.slash), zalgo(0, 0, 3, 12)]),
  p("glitch-error", "System Error", "glitch", "Random case under tilde noise with warnings", [caseL("random", 3), marks(MK.tildeOverlay), wrap("\u{26A0} ", " \u{26A0}")]),
  p("glitch-vapor", "Torn Vapor", "glitch", "Fullwidth letters torn by overlay marks", [font("fullwidth"), zalgo(0, 2, 1, 55, 0.4)]),

  // 4. Gothic & Dark -----------------------------------------------------------
  p("gothic-fraktur", "Blackletter", "gothic", "Mathematical Fraktur", [font("fraktur")]),
  p("gothic-bold", "Bold Blackletter", "gothic", "Bold Fraktur", [font("boldFraktur")]),
  p("gothic-cross", "Holy Cross", "gothic", "Bold Fraktur between crosses", [font("boldFraktur"), wrap("\u{271E} ", " \u{271E}")]),
  p("gothic-runic", "Elder Runes", "gothic", "Elder Futhark rune look-alikes", [font("runic")]),
  p("gothic-blood", "Bloodline", "gothic", "Bold Fraktur with drips below", [font("boldFraktur"), marks(MK.verticalBelow + MK.dotBelow)]),
  p("gothic-coffin", "Coffin", "gothic", "Spaced small caps in coffins", [font("smallCaps"), sep(" "), wrap("\u{26B0} ", " \u{26B0}")]),
  p("gothic-occult", "Occult", "gothic", "Fraktur flanked by pentagrams", [font("fraktur"), wrap("\u{26E7} ", " \u{26E7}")]),
  p("gothic-cyrillic", "Iron Curtain", "gothic", "Faux Cyrillic with an orthodox cross", [font("fauxCyrillic"), wrap("\u{2629} ", " \u{2629}")]),
  p("gothic-hex", "Hexed", "gothic", "Bold script under a tilde curse", [font("boldScript"), marks(MK.tildeOverlay)]),
  p("gothic-shadow", "Shadow Script", "gothic", "Spaced Fraktur between daggers", [font("fraktur"), sep(" "), wrap("\u{2020} ", " \u{2020}")]),
  p("gothic-web", "Spider Web", "gothic", "Bold italic caught in webs", [font("boldItalic"), wrap("\u{1F578}\u{FE0F} ", " \u{1F578}\u{FE0F}")]),

  // 5. Gaming Nicknames --------------------------------------------------------
  p("game-kobra", "Royal Clan", "gaming", "Classic ornate clan frame", [font("boldScript"), wrap("\u{A9C1}\u{0F12}\u{262C}", "\u{262C}\u{0F12}\u{A9C2}")], ["nickname"]),
  p("game-sniper", "Sniper", "gaming", "Rifle-framed sans bold", [font("sansBold"), wrap("\u{2584}\u{FE3B}\u{30C7}", "\u{2550}\u{2550}\u{2501}\u{4E00}")], ["nickname"]),
  p("game-ninja", "Ninja", "gaming", "Small caps between crossed swords", [font("smallCaps"), wrap("\u{4E42}", "\u{4E42}")], ["nickname"]),
  p("game-pro", "Pro Player", "gaming", "PRO tag before sans bold caps", [caseL("upper"), font("sansBold"), wrap("\u{1D3E}\u{1D3F}\u{1D3C}\u{00D7}", "")], ["nickname"]),
  p("game-dead", "Dead Eyes", "gaming", "×\u{35C}× face before italic name", [font("italic"), wrap("\u{00D7}\u{035C}\u{00D7} ", "")], ["nickname"]),
  p("game-star", "Shooting Star", "gaming", "Fullwidth name between shooting stars", [font("fullwidth"), wrap("\u{2605}\u{5F61}", "\u{5F61}\u{2605}")], ["nickname"]),
  p("game-clan", "Kanji Clan", "gaming", "Kanji-style letters in corner brackets", [font("kanjiStyle"), wrap("\u{300E}", "\u{300F}")], ["nickname"]),
  p("game-god", "God Mode", "gaming", "God tag with sans bold italic", [font("sansBoldItalic"), wrap("\u{1D33}\u{1D52}\u{1D48}\u{4E5B}", "")], ["nickname"]),
  p("game-lightning", "Lightning", "gaming", "Double-struck between bolts", [font("doubleStruck"), wrap("\u{26A1}", "\u{26A1}")], ["nickname"]),
  p("game-sword", "Duelist", "gaming", "Bold caps between crossed swords", [caseL("upper"), font("bold"), wrap("\u{2694}\u{FE0F} ", " \u{2694}\u{FE0F}")], ["nickname"]),
  p("game-wings", "Angel Wings", "gaming", "Script between ornate wings", [font("script"), wrap("\u{A9C1}", "\u{A9C2}")], ["nickname"]),
  p("game-legend", "Legend", "gaming", "Currency letters between legend marks", [font("currency"), wrap("\u{4E97}", "\u{4E97}")], ["nickname"]),
  p("game-op", "Overpowered", "gaming", "OP tag with Greek-style letters", [font("greekStyle"), wrap("OP\u{4E5B}", "")], ["nickname"]),

  // 6. Aesthetic Text ----------------------------------------------------------
  p("aes-vapor", "Vaporwave", "aesthetic", "Fullwidth letters", [font("fullwidth")]),
  p("aes-spaced", "S p a c e d", "aesthetic", "A space between every letter", [sep(" ")]),
  p("aes-tiny", "Tiny Text", "aesthetic", "Superscript letters", [font("superscript")]),
  p("aes-subscript", "Subscript", "aesthetic", "Subscript letters where available", [font("subscript")]),
  p("aes-smallcaps", "Small Caps", "aesthetic", "Phonetic small capitals", [font("smallCaps")]),
  p("aes-cursive", "Cursive", "aesthetic", "Mathematical script", [font("script")]),
  p("aes-bold-cursive", "Bold Cursive", "aesthetic", "Mathematical bold script", [font("boldScript")]),
  p("aes-sparkle", "Soft Sparkle", "aesthetic", "Lowercase framed with soft sparkles", [caseL("lower"), wrap("\u{02DA}\u{208A}\u{2027}\u{A4B0}\u{10D0} ", " \u{0ED2}\u{A4B1} \u{2027}\u{208A}\u{02DA}")]),
  p("aes-cloud", "Daydream", "aesthetic", "Sans italic between clouds", [font("sansItalic"), wrap("\u{2601}\u{FE0E} ", " \u{2601}\u{FE0E}")]),
  p("aes-greek", "Greek Chic", "aesthetic", "Greek-style look-alike letters", [font("greekStyle")]),
  p("aes-butterfly", "Butterfly", "aesthetic", "Sans letters between butterfly wings", [font("sans"), wrap("\u{029A} ", " \u{025E}")]),
  p("aes-dotted", "Dotted", "aesthetic", "Middle dots between letters", [sep("\u{00B7}")]),
  p("aes-ethiopic", "Ethereal", "aesthetic", "Ethiopic look-alike letters", [font("ethiopicStyle")]),
  p("aes-kanji", "Kanji Style", "aesthetic", "CJK look-alike letters", [font("kanjiStyle")]),
  p("aes-italic", "Soft Italic", "aesthetic", "Mathematical italic", [font("italic")]),
  p("aes-statement", "Statement", "aesthetic", "Bold italic serif", [font("boldItalic")]),
  p("aes-moon", "Moonlit", "aesthetic", "Spaced small caps under the moon", [caseL("lower"), font("sansItalic"), sep(" "), wrap("\u{263E} ", " \u{22C6}")]),

  // 7. Symbol Decorations ------------------------------------------------------
  p("sym-stars", "Star Chain", "symbol", "Stars between letters", [sep("\u{2605}")]),
  p("sym-hearts", "Heart Links", "symbol", "Hearts between letters", [sep("\u{2661}")]),
  p("sym-arrows", "Arrow Frame", "symbol", "Arrow-feather frame", [wrap("\u{00BB}\u{00BB}\u{2014}\u{2014} ", " \u{2014}\u{2014}\u{00AB}\u{00AB}")]),
  p("sym-lenticular", "Lenticular", "symbol", "Each letter in black lenticular brackets", [charWrap("\u{3010}", "\u{3011}")]),
  p("sym-corner", "Corner Quotes", "symbol", "Each letter in corner brackets", [charWrap("\u{300C}", "\u{300D}")]),
  p("sym-flowers", "Flower Field", "symbol", "Flowers between words and around the text", [words(" \u{273F} "), wrap("\u{273F} ", " \u{273F}")]),
  p("sym-music", "Melody", "symbol", "Musical notes frame", [wrap("\u{266A}\u{266B} ", " \u{266B}\u{266A}")]),
  p("sym-diamonds", "Diamond Chain", "symbol", "Diamonds between letters", [sep("\u{25C6}")]),
  p("sym-wavy", "Wavy", "symbol", "Wavy underline with wave frame", [marks(MK.tildeBelow), wrap("\u{224B} ", " \u{224B}")]),
  p("sym-white-square", "White Brackets", "symbol", "Each letter in white square brackets", [charWrap("\u{27E6}", "\u{27E7}")]),
  p("sym-chevron", "Chevrons", "symbol", "Chevrons between letters", [sep("\u{203A}")]),
  p("sym-sparkle", "Twinkle", "symbol", "Four-pointed stars between letters", [sep("\u{2727}")]),
  p("sym-banner", "Banner", "symbol", "Box-drawing banner frame", [caseL("upper"), wrap("\u{2554}\u{2550}\u{2550} ", " \u{2550}\u{2550}\u{255D}")]),

  // 8. Enclosed Characters -----------------------------------------------------
  p("enc-circled", "Bubble", "enclosed", "Circled letters and digits", [font("circled")]),
  p("enc-neg-circled", "Dark Bubble", "enclosed", "Negative circled letters", [font("negativeCircled")]),
  p("enc-squared", "Squared", "enclosed", "Squared letters", [font("squared")]),
  p("enc-neg-squared", "Dark Squared", "enclosed", "Negative squared letters", [font("negativeSquared")]),
  p("enc-paren", "Parenthesized", "enclosed", "Parenthesized letters and digits", [font("parenthesized")]),
  p("enc-ring", "Combining Circle", "enclosed", "U+20DD enclosing circle on every character", [marks(MK.circle)], ["circle"]),
  p("enc-box", "Combining Square", "enclosed", "U+20DE enclosing square on every character", [marks(MK.square)], ["square"]),
  p("enc-diamond", "Combining Diamond", "enclosed", "U+20DF enclosing diamond on every character", [marks(MK.diamond)]),
  p("enc-keycap", "Keycaps", "enclosed", "U+20E3 enclosing keycap on every character", [marks(MK.keycap)]),
  p("enc-prohibited", "Prohibited", "enclosed", "U+20E0 circle backslash on every character", [marks(MK.noEntry)]),
  p("enc-screen", "Screen", "enclosed", "U+20E2 enclosing screen on every character", [marks(MK.screen)]),
  p("enc-bold-ring", "Bold Rings", "enclosed", "Bold letters with enclosing circles", [font("bold"), marks(MK.circle)]),
  p("enc-nested", "Nested Frames", "enclosed", "Square inside circle enclosures", [marks(MK.square + MK.circle)]),

  // 9. Discord Text ------------------------------------------------------------
  p("dc-bold", "Discord Bold", "discord", "**Markdown bold**", [wrap("**", "**")]),
  p("dc-under-italic", "Underlined Italic", "discord", "__*Underline + italic*__", [wrap("__*", "*__")]),
  p("dc-strike", "Discord Strike", "discord", "~~Markdown strikethrough~~", [wrap("~~", "~~")]),
  p("dc-spoiler", "Spoiler", "discord", "||Hidden until clicked||", [wrap("||", "||")]),
  p("dc-spoiler-letters", "Letter Spoilers", "discord", "Every letter is its own spoiler", [charWrap("||", "||")]),
  p("dc-code", "Inline Code", "discord", "`Monospace code`", [wrap("`", "`")]),
  p("dc-header", "Big Header", "discord", "# Large heading", [line("# ")]),
  p("dc-subtext", "Subtext", "discord", "-# Small grey subtext", [line("-# ")]),
  p("dc-quote", "Block Quote", "discord", "> Quote block", [line("> ")]),
  p("dc-ansi-red", "ANSI Red Bold", "discord", "Bold red text in an ansi code block", [ansi("red", { bold: true })]),
  p("dc-ansi-cyan", "ANSI Cyan Underline", "discord", "Underlined cyan in an ansi code block", [ansi("cyan", { underline: true })]),
  p("dc-ansi-rainbow", "ANSI Rainbow", "discord", "Per-letter rainbow colors", [ansi("rainbow", { bold: true })]),
  p("dc-ansi-highlight", "ANSI Highlight", "discord", "White text on an indigo highlight", [ansi("white", { bg: "indigo" })]),
  p("dc-header-unicode", "Fancy Header", "discord", "Heading with bold sans Unicode letters", [font("sansBold"), line("## ")]),

  // 10. Custom Effects ---------------------------------------------------------
  p("cx-upside-down", "Upside Down", "custom", "Flipped and reversed", [FLIP]),
  p("cx-reverse", "Reversed", "custom", "Grapheme-safe reverse (emoji stay intact)", [REVERSE]),
  p("cx-mirror", "Mirror", "custom", "Mirrored look-alike letters, reversed", [font("mirror"), REVERSE]),
  p("cx-strike", "Strikethrough", "custom", "Long stroke overlay", [marks(MK.strike)]),
  p("cx-slash", "Slashed", "custom", "Short solidus overlay — H\u{337}E\u{337}L\u{337}L\u{337}O\u{337}", [marks(MK.slash)]),
  p("cx-underline", "Underline", "custom", "Combining low line", [marks(MK.underline, "all")]),
  p("cx-double-underline", "Double Underline", "custom", "Combining double low line", [marks(MK.doubleUnderline, "all")]),
  p("cx-overline", "Overline", "custom", "Combining overline", [marks(MK.overline, "all")]),
  p("cx-crossed", "Crossed Out", "custom", "X above every character", [marks(MK.xAbove)]),
  p("cx-vector", "Vector", "custom", "Right arrows above, like math vectors", [marks(MK.arrowRightAbove)]),
  p("cx-tilde-strike", "Tilde Strike", "custom", "Tilde overlay through the text", [marks(MK.tildeOverlay)]),
  p("cx-currency", "Currency", "custom", "Currency-symbol letters", [font("currency")]),
  p("cx-mocking", "Mocking", "custom", "aLtErNaTiNg CaSe", [caseL("alternate")]),
  p("cx-metal", "Metal Umlaut", "custom", "Diaeresis over every letter", [marks(MK.diaeresis, "letters")]),
  p("cx-strike-under", "Struck & Underlined", "custom", "Strikethrough and underline together", [marks(MK.strike + MK.underline)]),
  p("cx-sky-under", "Skyline", "custom", "Overline and underline framing each letter", [marks(MK.overline + MK.underline, "all")]),
  p("cx-sans-flip", "Flipped Bold", "custom", "Upside down, then bold where possible", [FLIP, font("sansBold")]),
];

export const PRESET_BY_ID: Map<string, Preset> = new Map(PRESETS.map((pr) => [pr.id, pr]));

/** A curated selection shown first on the dashboard. */
export const FEATURED_IDS = [
  "tri-classic", "cx-slash", "enc-ring", "enc-box", "tri-bold", "zalgo-medium", "gothic-fraktur", "aes-vapor",
  "aes-cursive", "enc-circled", "game-kobra", "emoji-sparkle", "sym-lenticular", "aes-smallcaps", "cx-upside-down", "dc-ansi-rainbow",
  "tri-silhouette", "glitch-blocks", "emoji-fire", "gothic-cross", "game-star", "enc-neg-squared", "aes-tiny", "cx-strike",
];

/** Short human-readable description of a layer (for recipe chips). */
export function describeLayer(layer: Layer): string {
  switch (layer.type) {
    case "font":
      return `Font: ${layer.font}`;
    case "case":
      return `Case: ${layer.mode}`;
    case "marks":
      return `Marks: ${Array.from(layer.marks).map((c) => "\u{25CC}" + c).join(" ")}`;
    case "zalgo":
      return `Zalgo ${layer.up}/${layer.mid}/${layer.down}`;
    case "charWrap":
      return `Each: ${layer.left}x${layer.right}`;
    case "separator":
      return `Between: ${layer.value.trim() || "space"}`;
    case "wordSeparator":
      return `Words: ${layer.value.trim()}`;
    case "wrap":
      return `Wrap: ${layer.prefix.trim()}\u{2026}${layer.suffix.trim()}`;
    case "reverse":
      return "Reverse";
    case "flip":
      return "Upside down";
    case "replace":
      return "Replace";
    case "emoji":
      return `Emoji: ${layer.emojis.join("")}`;
    case "glitchChars":
      return `Glitch chars ${layer.amount}%`;
    case "ansi":
      return `ANSI ${layer.fg}`;
    case "linePrefix":
      return `Line: ${layer.prefix.trim()}`;
  }
}

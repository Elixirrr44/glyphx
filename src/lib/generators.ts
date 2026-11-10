/**
 * Smart generators: random styles, mixed per-word effects, nicknames, emoji
 * combinations and triangle variants. All are deterministic for a given seed.
 */

import { FONTS, type FontId, LETTER_FONTS } from "./unicode/alphabets";
import { applyLayers, type EngineOptions, type Layer } from "./unicode/engine";
import { MARKS, MK, type MarkPosition } from "./unicode/marks";
import { mulberry32, pick, rngFor } from "./unicode/random";
import { isEmojiGrapheme, isSpaceGrapheme, segmentGraphemes } from "./unicode/segment";

// ---------------------------------------------------------------------------
// Random style generator
// ---------------------------------------------------------------------------

const WRAP_PAIRS: [string, string][] = [
  ["\u{2726} ", " \u{2726}"],
  ["\u{A9C1}", "\u{A9C2}"],
  ["\u{2605}\u{5F61}", "\u{5F61}\u{2605}"],
  ["\u{300E}", "\u{300F}"],
  ["\u{2022}\u{00B0}\u{2022} ", " \u{2022}\u{00B0}\u{2022}"],
  ["\u{2E3B} ", " \u{2E3B}"],
  ["\u{25E5}\u{25E3} ", " \u{25E2}\u{25E4}"],
  ["\u{2730} ", " \u{2730}"],
  ["\u{2735} ", " \u{2735}"],
  ["\u{2234} ", " \u{2235}"],
  ["\u{2770}", "\u{2771}"],
  ["\u{27C5}", "\u{27C6}"],
  ["\u{2591}\u{2592}\u{2593} ", " \u{2593}\u{2592}\u{2591}"],
  ["\u{2014}\u{0332}\u{0332} ", " \u{2014}\u{0332}\u{0332}"],
];

const SEPARATORS = ["\u{00B7}", "\u{2726}", "\u{2661}", " ", "\u{2219}", "\u{22C6}", "\u{223F}", "\u{25E6}"];

const COMPATIBLE_MARK_POOLS: Record<MarkPosition, string[]> = {
  enclose: MARKS.filter((m) => m.position === "enclose" && m.id !== "keycap").map((m) => m.char),
  overlay: MARKS.filter((m) => m.position === "overlay").map((m) => m.char),
  above: MARKS.filter((m) => m.position === "above").map((m) => m.char),
  below: MARKS.filter((m) => m.position === "below").map((m) => m.char),
};

export interface GeneratedStyle {
  id: string;
  name: string;
  layers: Layer[];
}

const FONT_ADJ: Partial<Record<FontId, string>> = {
  bold: "Bold", italic: "Italic", boldItalic: "Heavy", script: "Silk", boldScript: "Royal", fraktur: "Gothic",
  boldFraktur: "Iron", doubleStruck: "Hollow", sans: "Clean", sansBold: "Solid", sansItalic: "Swift",
  sansBoldItalic: "Rush", monospace: "Code", fullwidth: "Wide", smallCaps: "Petite", greekStyle: "Greek",
  currency: "Cash", fauxCyrillic: "Iron",
};
const NOUNS = ["Echo", "Pulse", "Nova", "Prism", "Halo", "Rune", "Drift", "Flux", "Vortex", "Signal", "Ember", "Orbit"];

/**
 * Build a random but sensible recipe: at most one font, marks from distinct
 * positions (so they stack cleanly), and optional spacing / framing.
 */
export function randomStyle(seed: number): GeneratedStyle {
  const rnd = mulberry32(seed);
  const layers: Layer[] = [];
  let font: FontId | null = null;
  if (rnd() < 0.75) {
    font = pick(LETTER_FONTS, rnd);
    layers.push({ type: "font", font });
  }
  const positions: MarkPosition[] = (["enclose", "overlay", "above", "below"] as MarkPosition[]).filter(() => rnd() < 0.35);
  if (positions.length > 2) positions.length = 2;
  if (positions.length > 0) {
    const marks = positions.map((pos) => pick(COMPATIBLE_MARK_POOLS[pos], rnd)).join("");
    layers.push({ type: "marks", marks, target: "nonspace" });
  }
  if (rnd() < 0.12) layers.push({ type: "zalgo", up: 2, mid: 0, down: 2, seed: Math.floor(rnd() * 1e6), variance: 0.5 });
  if (rnd() < 0.3) layers.push({ type: "separator", value: pick(SEPARATORS, rnd), skipSpaces: true });
  if (rnd() < 0.6 || layers.length === 0) {
    const [prefix, suffix] = pick(WRAP_PAIRS, rnd);
    layers.push({ type: "wrap", prefix, suffix });
  }
  const adj = font ? (FONT_ADJ[font] ?? FONTS[font].label) : "Plain";
  const name = `${adj} ${pick(NOUNS, rnd)}`;
  return { id: `random-${seed}`, name, layers };
}

// ---------------------------------------------------------------------------
// Mixed effects (a different style per word)
// ---------------------------------------------------------------------------

const WORD_STYLES: Layer[][] = [
  [{ type: "font", font: "boldScript" }],
  [{ type: "font", font: "fraktur" }],
  [{ type: "font", font: "doubleStruck" }],
  [{ type: "font", font: "sansBold" }],
  [{ type: "font", font: "smallCaps" }],
  [{ type: "font", font: "monospace" }],
  [{ type: "font", font: "circled" }],
  [{ type: "font", font: "fullwidth" }],
  [{ type: "marks", marks: MK.slash }],
  [{ type: "marks", marks: MK.triangle }],
  [{ type: "marks", marks: MK.underline, target: "all" }],
  [{ type: "font", font: "italic" }, { type: "marks", marks: MK.circle }],
  [{ type: "zalgo", up: 2, mid: 0, down: 2, seed: 4, variance: 0.4 }],
  [{ type: "font", font: "superscript" }],
];

export function mixEffects(text: string, seed: number, options?: EngineOptions): string {
  // Split on whitespace while keeping the separators.
  const parts = text.split(/(\s+)/u);
  let w = 0;
  let last = -1;
  return parts
    .map((part) => {
      if (!part || /^\s+$/u.test(part)) return part;
      const rnd = rngFor(seed, w++);
      let idx = Math.floor(rnd() * WORD_STYLES.length);
      if (idx === last) idx = (idx + 1) % WORD_STYLES.length;
      last = idx;
      return applyLayers(part, WORD_STYLES[idx], options);
    })
    .join("");
}

// ---------------------------------------------------------------------------
// Nickname generator
// ---------------------------------------------------------------------------

export type NickTheme = "gamer" | "dark" | "cute" | "royal" | "mystic" | "sniper" | "anime";

interface ThemeDef {
  label: string;
  words: [string[], string[]];
  frames: [string, string][];
  fonts: FontId[];
}

export const NICK_THEMES: Record<NickTheme, ThemeDef> = {
  gamer: {
    label: "Gamer",
    words: [["Pixel", "Frag", "Nova", "Blitz", "Turbo", "Hyper", "Neon", "Glitch"], ["Viper", "Rogue", "Ace", "Bolt", "Storm", "Fox", "Byte", "Rex"]],
    frames: [["\u{1D3E}\u{1D3F}\u{1D3C}\u{00D7}", ""], ["\u{4E42}", "\u{4E42}"], ["\u{26A1}", "\u{26A1}"], ["\u{00D7}\u{035C}\u{00D7} ", ""], ["\u{2605}\u{5F61}", "\u{5F61}\u{2605}"], ["OP\u{4E5B}", ""]],
    fonts: ["sansBold", "monospace", "doubleStruck", "fullwidth", "sansBoldItalic"],
  },
  dark: {
    label: "Dark",
    words: [["Shadow", "Void", "Night", "Grim", "Hollow", "Dread", "Ash", "Crimson"], ["Raven", "Wraith", "Reaper", "Hex", "Phantom", "Specter", "Thorn", "Blade"]],
    frames: [["\u{271E} ", " \u{271E}"], ["\u{2020}", "\u{2020}"], ["\u{26E7} ", " \u{26E7}"], ["\u{1F480} ", ""], ["\u{2620} ", " \u{2620}"], ["\u{0F12}", "\u{0F12}"]],
    fonts: ["fraktur", "boldFraktur", "boldScript", "smallCaps", "runic"],
  },
  cute: {
    label: "Cute",
    words: [["Mochi", "Peach", "Honey", "Sugar", "Cloud", "Berry", "Bubble", "Cocoa"], ["Bunny", "Star", "Kitty", "Bean", "Puff", "Pie", "Bloom", "Drop"]],
    frames: [["\u{029A} ", " \u{025E}"], ["\u{2661} ", " \u{2661}"], ["\u{1F338} ", " \u{1F338}"], ["\u{02DA}\u{208A}\u{2027} ", " \u{2027}\u{208A}\u{02DA}"], ["\u{2027}\u{2740} ", " \u{2740}\u{2027}"], ["\u{2730} ", " \u{2730}"]],
    fonts: ["script", "smallCaps", "sansItalic", "circled", "greekStyle"],
  },
  royal: {
    label: "Royal",
    words: [["King", "Queen", "Lord", "Duke", "Regal", "Noble", "Imperial", "Golden"], ["Crown", "Throne", "Lion", "Empire", "Scepter", "Majesty", "Knight", "Jewel"]],
    frames: [["\u{A9C1}\u{0F12}\u{262C}", "\u{262C}\u{0F12}\u{A9C2}"], ["\u{1F451} ", " \u{1F451}"], ["\u{2655} ", " \u{2655}"], ["\u{A9C1}", "\u{A9C2}"], ["\u{269C} ", " \u{269C}"]],
    fonts: ["boldScript", "script", "boldFraktur", "doubleStruck"],
  },
  mystic: {
    label: "Mystic",
    words: [["Rune", "Lunar", "Astral", "Arcane", "Ether", "Celestial", "Mystic", "Solar"], ["Oracle", "Sage", "Myth", "Spirit", "Comet", "Witch", "Seer", "Aura"]],
    frames: [["\u{263E} ", " \u{263D}"], ["\u{2726} ", " \u{2726}"], ["\u{16DF} ", " \u{16DF}"], ["\u{2E3B}\u{2727} ", " \u{2727}\u{2E3B}"], ["\u{2734} ", " \u{2734}"]],
    fonts: ["script", "ethiopicStyle", "runic", "sansItalic", "boldScript"],
  },
  sniper: {
    label: "Sniper",
    words: [["Silent", "Ghost", "Steady", "Long", "Cold", "Dead", "Iron", "Stealth"], ["Scope", "Hawk", "Recon", "Shot", "Eye", "Sight", "Bullet", "Trigger"]],
    frames: [["\u{2584}\u{FE3B}\u{30C7}", "\u{2550}\u{2550}\u{2501}\u{4E00}"], ["\u{2316} ", ""], ["\u{2295} ", " \u{2295}"], ["\u{25BA} ", ""]],
    fonts: ["monospace", "sansBold", "squared", "smallCaps"],
  },
  anime: {
    label: "Anime",
    words: [["Senpai", "Kitsune", "Ronin", "Sakura", "Oni", "Kami", "Yuki", "Kage"], ["Chan", "Kun", "Sama", "Hime", "Ninja", "Samurai", "Neko", "Ryu"]],
    frames: [["\u{300E}", "\u{300F}"], ["\u{3010}", "\u{3011}"], ["\u{2727}\u{FF65}\u{FF9F}: ", " :\u{FF9F}\u{FF65}\u{2727}"], ["\u{4E42}", "\u{4E42}"], ["\u{4EA0}", "\u{4EA0}"]],
    fonts: ["kanjiStyle", "fullwidth", "smallCaps", "boldScript"],
  },
};

export interface Nickname {
  text: string;
  plain: string;
}

export function generateNicknames(base: string, theme: NickTheme, seed: number, count = 12, options?: EngineOptions): Nickname[] {
  const def = NICK_THEMES[theme];
  const out: Nickname[] = [];
  const seen = new Set<string>();
  const cleanBase = base.trim().slice(0, 24);
  for (let i = 0; out.length < count && i < count * 6; i++) {
    const rnd = rngFor(seed, i);
    const plain = cleanBase || `${pick(def.words[0], rnd)}${pick(def.words[1], rnd)}`;
    const [prefix, suffix] = pick(def.frames, rnd);
    const f = pick(def.fonts, rnd);
    const layers: Layer[] = [{ type: "font", font: f }];
    if (rnd() < 0.2) layers.push({ type: "marks", marks: pick([MK.triangle, MK.slash, MK.dotBelow], rnd), target: "nonspace", every: 2 });
    layers.push({ type: "wrap", prefix, suffix });
    const text = applyLayers(plain, layers, options);
    if (seen.has(text)) continue;
    seen.add(text);
    out.push({ text, plain });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Emoji combination generator
// ---------------------------------------------------------------------------

export const EMOJI_THEMES: Record<string, { label: string; emojis: string[] }> = {
  fire: { label: "Fire", emojis: ["\u{1F525}", "\u{1F4A5}", "\u{26A1}", "\u{2604}\u{FE0F}"] },
  love: { label: "Love", emojis: ["\u{1F496}", "\u{1F49C}", "\u{1F498}", "\u{1F49E}", "\u{1F970}"] },
  sparkle: { label: "Sparkle", emojis: ["\u{2728}", "\u{1F4AB}", "\u{1F31F}", "\u{2B50}"] },
  space: { label: "Space", emojis: ["\u{1F680}", "\u{1FA90}", "\u{1F30C}", "\u{1F47D}", "\u{1F311}"] },
  nature: { label: "Nature", emojis: ["\u{1F338}", "\u{1F33F}", "\u{1F343}", "\u{1F33B}", "\u{1F98B}"] },
  dark: { label: "Dark", emojis: ["\u{1F480}", "\u{1F5A4}", "\u{1F987}", "\u{1F311}", "\u{26B0}\u{FE0F}"] },
  gaming: { label: "Gaming", emojis: ["\u{1F3AE}", "\u{1F579}\u{FE0F}", "\u{1F3C6}", "\u{2694}\u{FE0F}", "\u{1F47E}"] },
  ocean: { label: "Ocean", emojis: ["\u{1F30A}", "\u{1F41A}", "\u{1F42C}", "\u{1F3DD}\u{FE0F}", "\u{1F420}"] },
  food: { label: "Food", emojis: ["\u{1F353}", "\u{1F369}", "\u{1F9C1}", "\u{1F352}", "\u{1F361}"] },
  party: { label: "Party", emojis: ["\u{1F389}", "\u{1F973}", "\u{1F38A}", "\u{1F37E}", "\u{1FAA9}"] },
};

export interface EmojiCombo {
  id: string;
  label: string;
  text: string;
}

/** Produce decorative combinations of `text` with a set of emojis. */
export function emojiCombos(text: string, emojis: string[], seed: number): EmojiCombo[] {
  const list = emojis.filter(Boolean);
  if (list.length === 0) return [];
  const t = text.trim() || "GlyphX";
  const rnd = mulberry32(seed);
  const a = pick(list, rnd);
  const b = list.length > 1 ? pick(list.filter((e) => e !== a), rnd) : a;
  const c = list.length > 2 ? pick(list.filter((e) => e !== a && e !== b), rnd) : b;
  const shuffled = [...list].sort(() => rnd() - 0.5);
  const combos: EmojiCombo[] = [
    { id: "sandwich", label: "Sandwich", text: `${a}${b} ${t} ${b}${a}` },
    { id: "single", label: "Single frame", text: `${a} ${t} ${a}` },
    { id: "trail", label: "Trail", text: applyLayers(t, [{ type: "emoji", emojis: [a], mode: "between" }]) },
    { id: "cycle", label: "Cycle between letters", text: applyLayers(t, [{ type: "emoji", emojis: shuffled, mode: "between" }]) },
    { id: "words", label: "Between words", text: applyLayers(t, [{ type: "emoji", emojis: shuffled, mode: "words" }]) },
    { id: "wordwrap", label: "Word wrap", text: applyLayers(t, [{ type: "emoji", emojis: [b], mode: "wordWrap" }]) },
    { id: "border", label: "Border line", text: `${a}\u{2501}\u{2501}\u{2501} ${t} \u{2501}\u{2501}\u{2501}${a}` },
    { id: "sparkle", label: "Sparkle dust", text: `${a}.\u{00B7}:*\u{00A8} ${t} \u{00A8}*:\u{00B7}.${a}` },
    { id: "kaomoji", label: "Twinkle", text: `\u{22C6}\u{FF61}\u{00B0}${a} ${t} ${a}\u{00B0}\u{FF61}\u{22C6}` },
    { id: "trio", label: "Trio tail", text: `${t} ${a}${b}${c}` },
    { id: "stack", label: "Header stack", text: `${list.join("")}\n${t}\n${[...list].reverse().join("")}` },
    { id: "bold", label: "Bold frame", text: `${a} ${applyLayers(t, [{ type: "font", font: "sansBold" }])} ${a}` },
  ];
  // Drop duplicates (e.g. when only one emoji is selected) and no-ops (word modes on a single word).
  const seen = new Set<string>([t]);
  return combos.filter((cmb) => (seen.has(cmb.text) ? false : (seen.add(cmb.text), true)));
}

// ---------------------------------------------------------------------------
// Triangle studio
// ---------------------------------------------------------------------------

export interface TriangleVariant {
  id: string;
  label: string;
  description: string;
  text: string;
}

export type TriangleScope = "all" | "emoji" | "text";

export function triangleVariants(input: string, overlay: string, scope: TriangleScope, options?: EngineOptions): TriangleVariant[] {
  const ov = overlay || MK.triangle;
  const text = input || "\u{1F525}";
  const target = scope === "all" ? "nonspace" : scope;
  const run = (layers: Layer[]) => applyLayers(text, layers, options);
  const nb = `\u{00A0}${ov}`;
  const graphemes = segmentGraphemes(text).filter((g) => !isSpaceGrapheme(g));
  const variants: TriangleVariant[] = [
    { id: "each", label: "On every character", description: "Overlay attached after each grapheme cluster", text: run([{ type: "marks", marks: ov, target }]) },
    { id: "spaced", label: "Spaced out", description: "Overlay plus a space between characters", text: run([{ type: "marks", marks: ov, target }, { type: "separator", value: " " }]) },
    { id: "alternate", label: "Alternating", description: "Every other character", text: run([{ type: "marks", marks: ov, target, every: 2 }]) },
    { id: "double", label: "Doubled overlay", description: "The overlay sequence applied twice", text: run([{ type: "marks", marks: ov + ov, target }]) },
    { id: "frame", label: "Triangle frame", description: "Standalone overlays on no-break spaces around the text", text: `${nb}${nb} ${text} ${nb}${nb}` },
    { id: "last", label: "Last character only", description: "A single overlay on the final character", text: run([{ type: "marks", marks: ov, target: "nonspace", every: Math.max(1, graphemes.length), offset: graphemes.length - 1 }]) },
    { id: "silhouette", label: "Silhouette", description: "Characters replaced by spaces, keeping only the overlays", text: run([{ type: "replace", with: " ", target: "nonspace" }, { type: "marks", marks: ov, target: "all" }]) },
    { id: "dotted", label: "On dotted circles", description: "Shows the bare mark on U+25CC, one per character", text: graphemes.map(() => `\u{25CC}${ov}`).join(" ") },
  ];
  const seen = new Set<string>();
  return variants.filter((v) => (seen.has(v.text) ? false : (seen.add(v.text), true)));
}

/** Count graphemes that are emoji vs text, used by the triangle studio summary. */
export function graphemeBreakdown(text: string): { emoji: number; text: number; spaces: number } {
  let emoji = 0;
  let textCount = 0;
  let spaces = 0;
  for (const g of segmentGraphemes(text)) {
    if (isSpaceGrapheme(g)) spaces++;
    else if (isEmojiGrapheme(g)) emoji++;
    else textCount++;
  }
  return { emoji, text: textCount, spaces };
}

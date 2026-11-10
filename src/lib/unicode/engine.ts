/**
 * GlyphX transformation engine.
 *
 * Text is split into grapheme clusters and run through an ordered list of
 * layers. Each layer is a pure, deterministic transform. Combining marks are
 * always appended to the *end* of a whole grapheme cluster, so emoji ZWJ
 * sequences, skin tones, flags and keycaps are never split apart.
 */

import { FONTS, type FontId, mapGrapheme } from "./alphabets";
import { ZALGO_DOWN, ZALGO_MID, ZALGO_UP } from "./marks";
import { pick, rngFor } from "./random";
import {
  countMarks,
  isAlnumGrapheme,
  isEmojiGrapheme,
  isInertGrapheme,
  isLetterGrapheme,
  isSpaceGrapheme,
  segmentGraphemes,
  type SegmentOptions,
} from "./segment";

export type Target = "all" | "nonspace" | "letters" | "alnum" | "text" | "emoji";
export type CaseMode = "upper" | "lower" | "title" | "alternate" | "inverse" | "random";
export type EmojiMode = "between" | "words" | "wordWrap";
export type AnsiColor = "gray" | "red" | "green" | "yellow" | "blue" | "pink" | "cyan" | "white";
export type AnsiBg = "none" | "darkBlue" | "orange" | "marbleBlue" | "turquoise" | "gray" | "indigo" | "lightGray" | "white";

export type Layer =
  | { type: "font"; font: FontId }
  | { type: "case"; mode: CaseMode; seed?: number }
  | { type: "marks"; marks: string; target?: Target; every?: number; offset?: number }
  | { type: "zalgo"; up: number; mid: number; down: number; seed: number; variance?: number; target?: Target }
  | { type: "charWrap"; left: string; right: string; target?: Target }
  | { type: "separator"; value: string; skipSpaces?: boolean }
  | { type: "wordSeparator"; value: string }
  | { type: "wrap"; prefix: string; suffix: string }
  | { type: "reverse" }
  | { type: "flip" }
  | { type: "replace"; with: string; target?: Target }
  | { type: "emoji"; emojis: string[]; mode: EmojiMode; random?: boolean; seed?: number }
  | { type: "glitchChars"; amount: number; charset: string; seed: number }
  | { type: "ansi"; fg: AnsiColor | "rainbow"; bg?: AnsiBg; bold?: boolean; underline?: boolean }
  | { type: "linePrefix"; prefix: string };

export type LayerType = Layer["type"];

export interface EngineOptions {
  /** Maximum combining marks allowed on a single grapheme (prevents runaway stacking). */
  maxMarksPerGrapheme?: number;
  /** Soft cap on output length in UTF-16 code units. Mark-producing layers stop adding beyond it. */
  maxOutputLength?: number;
  /** Input beyond this many graphemes is ignored for generation. */
  maxInputGraphemes?: number;
  inputNormalization?: "none" | "NFC" | "NFD";
  outputNormalization?: "none" | "NFC";
  segment?: SegmentOptions;
}

export interface TransformResult {
  output: string;
  truncatedInput: boolean;
  cappedMarks: boolean;
  cappedLength: boolean;
}

export const ENGINE_DEFAULTS: Required<Omit<EngineOptions, "segment">> = {
  maxMarksPerGrapheme: 24,
  maxOutputLength: 12000,
  maxInputGraphemes: 1000,
  inputNormalization: "NFC",
  outputNormalization: "none",
};

/** Absolute ceiling regardless of settings. */
export const HARD_MAX_MARKS = 100;

interface Unit {
  t: string;
  deco: boolean;
  /** Group id: decorations created around a grapheme share its group. */
  g: number;
}

interface Ctx {
  maxMarks: number;
  maxLen: number;
  length: number;
  cappedMarks: boolean;
  cappedLength: boolean;
  nextGroup: number;
}

const ANSI_FG: Record<AnsiColor, number> = { gray: 30, red: 31, green: 32, yellow: 33, blue: 34, pink: 35, cyan: 36, white: 37 };
const ANSI_BG: Record<Exclude<AnsiBg, "none">, number> = {
  darkBlue: 40, orange: 41, marbleBlue: 42, turquoise: 43, gray: 44, indigo: 45, lightGray: 46, white: 47,
};
const RAINBOW = [31, 33, 32, 36, 34, 35];
const ESC = "\u001b";

const RE_SINGLE_MARK = /^\p{M}$/u;

/** Replace lone surrogates with U+FFFD so broken pasted text never throws or corrupts output. */
export function toWellFormed(text: string): string {
  const s = text as string & { toWellFormed?: () => string };
  if (typeof s.toWellFormed === "function") return s.toWellFormed();
  return text.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "\u{FFFD}");
}

export function prepareInput(text: string, normalization: EngineOptions["inputNormalization"] = "NFC"): string {
  const safe = toWellFormed(text);
  if (normalization === "none") return safe;
  try {
    return safe.normalize(normalization);
  } catch {
    return safe;
  }
}

function eligible(u: Unit, target: Target): boolean {
  if (u.deco || isInertGrapheme(u.t)) return false;
  switch (target) {
    case "all":
      return true;
    case "nonspace":
      return !isSpaceGrapheme(u.t);
    case "letters":
      return isLetterGrapheme(u.t) && !isEmojiGrapheme(u.t);
    case "alnum":
      return isAlnumGrapheme(u.t) && !isEmojiGrapheme(u.t);
    case "text":
      return !isSpaceGrapheme(u.t) && !isEmojiGrapheme(u.t);
    case "emoji":
      return isEmojiGrapheme(u.t);
  }
}

function isContentSpace(u: Unit): boolean {
  return !u.deco && isSpaceGrapheme(u.t);
}

function deco(ctx: Ctx, t: string, g?: number): Unit {
  return { t, deco: true, g: g ?? ctx.nextGroup-- };
}

function addMarks(u: Unit, marks: string[], ctx: Ctx): void {
  if (marks.length === 0) return;
  const room = ctx.maxMarks - countMarks(u.t);
  if (room <= 0) {
    ctx.cappedMarks = true;
    return;
  }
  let add = marks;
  if (add.length > room) {
    add = add.slice(0, room);
    ctx.cappedMarks = true;
  }
  const extra = add.join("");
  if (ctx.length + extra.length > ctx.maxLen) {
    ctx.cappedLength = true;
    return;
  }
  ctx.length += extra.length;
  u.t += extra;
}

/** Split units into consecutive runs sharing a group id. */
function groups(units: Unit[]): Unit[][] {
  const out: Unit[][] = [];
  for (const u of units) {
    const last = out[out.length - 1];
    if (last && last[0].g === u.g) last.push(u);
    else out.push([u]);
  }
  return out;
}

function joinUnits(units: Unit[]): string {
  let s = "";
  for (const u of units) s += u.t;
  return s;
}

function changeCase(units: Unit[], mode: CaseMode, seed: number): void {
  let letterIndex = 0;
  let atWordStart = true;
  units.forEach((u, i) => {
    if (u.deco) return;
    if (isSpaceGrapheme(u.t)) {
      atWordStart = true;
      return;
    }
    const isLetter = isLetterGrapheme(u.t);
    switch (mode) {
      case "upper":
        u.t = u.t.toUpperCase();
        break;
      case "lower":
        u.t = u.t.toLowerCase();
        break;
      case "title":
        u.t = atWordStart ? u.t.toUpperCase() : u.t.toLowerCase();
        break;
      case "alternate":
        if (isLetter) u.t = letterIndex % 2 === 0 ? u.t.toLowerCase() : u.t.toUpperCase();
        break;
      case "inverse": {
        const up = u.t.toUpperCase();
        u.t = u.t === up ? u.t.toLowerCase() : up;
        break;
      }
      case "random":
        u.t = rngFor(seed, i)() < 0.5 ? u.t.toLowerCase() : u.t.toUpperCase();
        break;
    }
    if (isLetter) letterIndex++;
    atWordStart = false;
  });
}

function wrapAnsi(units: Unit[], layer: Extract<Layer, { type: "ansi" }>): string {
  const fmt = layer.bold ? 1 : layer.underline ? 4 : 0;
  const fmtCodes = layer.bold && layer.underline ? "1;4" : String(fmt);
  const bg = layer.bg && layer.bg !== "none" ? `;${ANSI_BG[layer.bg]}` : "";
  let body: string;
  if (layer.fg === "rainbow") {
    let i = 0;
    body = units
      .map((u) => {
        if (isSpaceGrapheme(u.t) || u.t === "\n") return u.t;
        const code = RAINBOW[i++ % RAINBOW.length];
        return `${ESC}[${fmtCodes}${bg};${code}m${u.t}`;
      })
      .join("");
  } else {
    body = `${ESC}[${fmtCodes}${bg};${ANSI_FG[layer.fg]}m${joinUnits(units)}`;
  }
  return "```ansi\n" + body + `${ESC}[0m` + "\n```";
}

function applyLayer(units: Unit[], layer: Layer, ctx: Ctx): Unit[] {
  switch (layer.type) {
    case "font": {
      const font = FONTS[layer.font];
      if (!font) return units;
      for (const u of units) {
        if (u.deco || isEmojiGrapheme(u.t)) continue;
        const mapped = mapGrapheme(u.t, font);
        ctx.length += mapped.length - u.t.length;
        u.t = mapped;
      }
      return units;
    }

    case "case":
      changeCase(units, layer.mode, layer.seed ?? 1);
      return units;

    case "marks": {
      const marks = Array.from(layer.marks).filter((c) => RE_SINGLE_MARK.test(c));
      if (marks.length === 0) return units;
      const target = layer.target ?? "nonspace";
      const every = Math.max(1, Math.floor(layer.every ?? 1));
      const offset = Math.floor(layer.offset ?? 0);
      let idx = 0;
      for (const u of units) {
        if (!eligible(u, target)) continue;
        const pos = idx++;
        if ((((pos - offset) % every) + every) % every !== 0) continue;
        addMarks(u, marks, ctx);
      }
      return units;
    }

    case "zalgo": {
      const target = layer.target ?? "nonspace";
      const variance = Math.min(1, Math.max(0, layer.variance ?? 0.5));
      const clampN = (n: number) => Math.max(0, Math.min(HARD_MAX_MARKS, Math.floor(n)));
      const up = clampN(layer.up);
      const mid = clampN(layer.mid);
      const down = clampN(layer.down);
      let idx = 0;
      for (const u of units) {
        if (!eligible(u, target)) continue;
        const rnd = rngFor(layer.seed, idx++);
        const count = (n: number) => (n === 0 ? 0 : Math.max(0, Math.round(n * (1 - variance * rnd()))));
        const picked: string[] = [];
        for (let k = count(up); k > 0; k--) picked.push(pick(ZALGO_UP, rnd));
        for (let k = count(mid); k > 0; k--) picked.push(pick(ZALGO_MID, rnd));
        for (let k = count(down); k > 0; k--) picked.push(pick(ZALGO_DOWN, rnd));
        addMarks(u, picked, ctx);
        if (ctx.cappedLength) break;
      }
      return units;
    }

    case "charWrap": {
      const target = layer.target ?? "nonspace";
      const out: Unit[] = [];
      for (const u of units) {
        if (eligible(u, target)) {
          if (layer.left) out.push(deco(ctx, layer.left, u.g));
          out.push(u);
          if (layer.right) out.push(deco(ctx, layer.right, u.g));
          ctx.length += layer.left.length + layer.right.length;
        } else out.push(u);
      }
      return out;
    }

    case "separator": {
      if (!layer.value) return units;
      const gs = groups(units);
      const out: Unit[] = [];
      gs.forEach((grp, i) => {
        if (i > 0) {
          const prev = gs[i - 1];
          const skip =
            (layer.skipSpaces ?? true) && (prev.some(isContentSpace) || grp.some(isContentSpace));
          const lineBreak = prev.some((u) => isInertGrapheme(u.t)) || grp.some((u) => isInertGrapheme(u.t));
          if (!skip && !lineBreak) {
            out.push(deco(ctx, layer.value));
            ctx.length += layer.value.length;
          }
        }
        out.push(...grp);
      });
      return out;
    }

    case "wordSeparator":
      return units.map((u) => {
        if (!isContentSpace(u)) return u;
        ctx.length += layer.value.length - u.t.length;
        return deco(ctx, layer.value, u.g);
      });

    case "wrap": {
      const out = [...units];
      if (layer.prefix) out.unshift(deco(ctx, layer.prefix));
      if (layer.suffix) out.push(deco(ctx, layer.suffix));
      ctx.length += layer.prefix.length + layer.suffix.length;
      return out;
    }

    case "reverse":
      return groups(units).reverse().flat();

    case "flip": {
      const font = FONTS.upsideDown;
      for (const u of units) if (!u.deco && !isEmojiGrapheme(u.t)) u.t = mapGrapheme(u.t, font);
      return groups(units).reverse().flat();
    }

    case "replace": {
      const target = layer.target ?? "nonspace";
      const out: Unit[] = [];
      for (const u of units) {
        if (eligible(u, target)) {
          if (layer.with === "") continue;
          ctx.length += layer.with.length - u.t.length;
          out.push({ t: layer.with, deco: false, g: u.g });
        } else out.push(u);
      }
      return out;
    }

    case "emoji": {
      const list = layer.emojis.filter(Boolean);
      if (list.length === 0) return units;
      let n = 0;
      const next = () => {
        const i = n++;
        return layer.random ? pick(list, rngFor(layer.seed ?? 1, i)) : list[i % list.length];
      };
      if (layer.mode === "words") {
        return units.map((u) => (isContentSpace(u) ? deco(ctx, ` ${next()} `, u.g) : u));
      }
      if (layer.mode === "wordWrap") {
        const out: Unit[] = [];
        let inWord = false;
        let wordEmoji = "";
        units.forEach((u, i) => {
          const isBreak = isContentSpace(u) || isInertGrapheme(u.t);
          if (!isBreak && !inWord) {
            wordEmoji = next();
            out.push(deco(ctx, wordEmoji));
            inWord = true;
          }
          if (isBreak && inWord) {
            out.push(deco(ctx, wordEmoji));
            inWord = false;
          }
          out.push(u);
          if (i === units.length - 1 && inWord) out.push(deco(ctx, wordEmoji));
        });
        return out;
      }
      // between
      const gs = groups(units);
      const out: Unit[] = [];
      gs.forEach((grp, i) => {
        if (i > 0) {
          const prev = gs[i - 1];
          const blocked = [...prev, ...grp].some((u) => isContentSpace(u) || isInertGrapheme(u.t));
          if (!blocked) out.push(deco(ctx, next()));
        }
        out.push(...grp);
      });
      return out;
    }

    case "glitchChars": {
      const chars = Array.from(layer.charset);
      if (chars.length === 0 || layer.amount <= 0) return units;
      const p = Math.min(1, layer.amount / 100);
      const out: Unit[] = [];
      let idx = 0;
      for (const u of units) {
        out.push(u);
        if (!eligible(u, "nonspace")) continue;
        const rnd = rngFor(layer.seed, idx++);
        if (rnd() < p && ctx.length < ctx.maxLen) {
          const ch = pick(chars, rnd);
          out.push(deco(ctx, ch, u.g));
          ctx.length += ch.length;
        }
      }
      return out;
    }

    case "ansi": {
      const text = wrapAnsi(units, layer);
      ctx.length = text.length;
      return [deco(ctx, text)];
    }

    case "linePrefix": {
      const text = joinUnits(units)
        .split("\n")
        .map((line) => layer.prefix + line)
        .join("\n");
      ctx.length = text.length;
      return [deco(ctx, text)];
    }
  }
}

/** Run text through a list of layers. Never mutates the input string. */
export function transform(input: string, layers: readonly Layer[], options: EngineOptions = {}): TransformResult {
  const opts = { ...ENGINE_DEFAULTS, ...options };
  const prepared = prepareInput(input, opts.inputNormalization);
  let graphemes = segmentGraphemes(prepared, options.segment);
  let truncatedInput = false;
  if (graphemes.length > opts.maxInputGraphemes) {
    graphemes = graphemes.slice(0, opts.maxInputGraphemes);
    truncatedInput = true;
  }

  const ctx: Ctx = {
    maxMarks: Math.max(1, Math.min(HARD_MAX_MARKS, opts.maxMarksPerGrapheme)),
    maxLen: Math.max(256, opts.maxOutputLength),
    length: 0,
    cappedMarks: false,
    cappedLength: false,
    nextGroup: -1,
  };

  let units: Unit[] = graphemes.map((t, g) => ({ t, deco: false, g }));
  ctx.length = prepared.length;

  for (const layer of layers) {
    try {
      units = applyLayer(units, layer, ctx);
    } catch {
      // A malformed layer must never break generation; skip it.
    }
  }

  let output = joinUnits(units);
  // Hard ceiling: cut at a grapheme boundary if decorations exploded the length.
  const hardMax = ctx.maxLen * 2;
  if (output.length > hardMax) {
    let acc = "";
    for (const g of segmentGraphemes(output, options.segment)) {
      if (acc.length + g.length > hardMax) break;
      acc += g;
    }
    output = acc;
    ctx.cappedLength = true;
  }

  if (opts.outputNormalization === "NFC") output = output.normalize("NFC");

  return { output, truncatedInput, cappedMarks: ctx.cappedMarks, cappedLength: ctx.cappedLength };
}

/** Convenience wrapper returning only the output string. */
export function applyLayers(input: string, layers: readonly Layer[], options?: EngineOptions): string {
  return transform(input, layers, options).output;
}

// ---------------------------------------------------------------------------
// Cleanup helpers
// ---------------------------------------------------------------------------

const DECORATIVE_MARKS = /[\u{300}-\u{36F}\u{1AB0}-\u{1AFF}\u{1DC0}-\u{1DFF}\u{20D0}-\u{20FF}\u{FE20}-\u{FE2F}\u{483}-\u{489}]/gu;

/**
 * Remove decorative combining marks (Zalgo, overlays, enclosures) while keeping
 * accents that compose into a precomposed letter (é) and emoji keycaps / VS16.
 */
export function stripDecorativeMarks(text: string): string {
  return segmentGraphemes(toWellFormed(text))
    .map((g) => {
      if (/^[0-9#*]\u{FE0F}?\u{20E3}$/u.test(g)) return g;
      if (isEmojiGrapheme(g)) {
        const keycap = /^[0-9#*]\u{FE0F}?\u{20E3}/u.exec(g)?.[0] ?? "";
        return keycap + g.slice(keycap.length).replace(DECORATIVE_MARKS, "");
      }
      return g.normalize("NFC").replace(DECORATIVE_MARKS, "");
    })
    .join("");
}

/** Strip ANSI escape sequences (used to render Discord ANSI previews as plain text). */
export function stripAnsi(text: string): string {
  return text.replace(/\u001b\[[0-9;]*m/g, "");
}

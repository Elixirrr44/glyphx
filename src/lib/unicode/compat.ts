/**
 * Compatibility analysis: inspects a generated string and reports features
 * that are known to render or behave inconsistently across platforms.
 * These are heuristics — final rendering depends on the reader's fonts.
 */

import { ENCLOSING_MARK_RE } from "./marks";
import { countMarks, isEmojiGrapheme, segmentGraphemes } from "./segment";

export type CompatLevel = "safe" | "caution" | "risky";
export type IssueSeverity = "info" | "warn" | "risk";

export interface CompatIssue {
  id: string;
  severity: IssueSeverity;
  title: string;
  detail: string;
}

export interface PlatformFit {
  id: string;
  label: string;
  limit: number;
  length: number;
  fits: boolean;
  note?: string;
}

export interface CompatReport {
  level: CompatLevel;
  issues: CompatIssue[];
  platforms: PlatformFit[];
  maxMarksOnOneCharacter: number;
}

export const PLATFORM_LIMITS: { id: string; label: string; limit: number }[] = [
  { id: "discord-display", label: "Discord display name", limit: 32 },
  { id: "instagram-name", label: "Instagram name", limit: 30 },
  { id: "instagram-bio", label: "Instagram bio", limit: 150 },
  { id: "tiktok-name", label: "TikTok name", limit: 30 },
  { id: "tiktok-bio", label: "TikTok bio", limit: 80 },
  { id: "x-name", label: "X display name", limit: 50 },
  { id: "whatsapp-about", label: "WhatsApp about", limit: 139 },
  { id: "steam-name", label: "Steam profile name", limit: 32 },
];

const RE_MATH_ALNUM = /[\u{1D400}-\u{1D7FF}]/u;
const RE_ENCLOSED_ALNUM = /[\u{2460}-\u{24FF}\u{1F100}-\u{1F1FF}]/u;
// Ethiopic, Cherokee, Runic, Lisu, Latin Extended-D, Latin Extended-E
const RE_RARE_SCRIPTS = /[\u{1200}-\u{139F}\u{13A0}-\u{13FF}\u{16A0}-\u{16FF}\u{A4D0}-\u{A4FF}\u{A720}-\u{A7FF}\u{AB30}-\u{AB6F}]/u;
const RE_INVISIBLE = /[\u{200B}\u{200C}\u{2060}\u{2061}-\u{2064}\u{FEFF}\u{3164}\u{115F}\u{1160}\u{2800}\u{180E}]/u;
const RE_BIDI = /[\u{200E}\u{200F}\u{202A}-\u{202E}\u{2066}-\u{2069}]/u;
const RE_ANSI = /\u001b\[/u;
const RE_MARKDOWN = /(\*\*|~~|\|\||__|`|^#{1,3} |^-# |^> )/mu;
const RE_SUPPLEMENTARY = /[\u{10000}-\u{10FFFF}]/u;
const RE_FLAG_PAIR = /[\u{1F1E6}-\u{1F1FF}]{2}/u;
const RE_MARK_ANY = /\p{M}/u;
const RE_DECORATIVE_ON_EMOJI = /[\u{300}-\u{36F}\u{20D0}-\u{20E2}\u{20E4}-\u{20FF}]/u;

export function utf8Length(text: string): number {
  let bytes = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    bytes += cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
  }
  return bytes;
}

export function analyzeCompatibility(text: string): CompatReport {
  const issues: CompatIssue[] = [];
  const graphemes = segmentGraphemes(text);
  let maxMarks = 0;
  let marksOnEmoji = false;
  let enclosingOnEmoji = false;

  for (const g of graphemes) {
    const isEmoji = isEmojiGrapheme(g);
    const n = countMarks(g) - (isEmoji ? (g.match(/[\u{FE0E}\u{FE0F}]/gu)?.length ?? 0) : 0);
    if (n > maxMarks) maxMarks = n;
    if (isEmoji) {
      if (ENCLOSING_MARK_RE.test(g)) enclosingOnEmoji = true;
      else if (RE_DECORATIVE_ON_EMOJI.test(g)) marksOnEmoji = true;
    }
  }

  if (enclosingOnEmoji) {
    issues.push({
      id: "enclosing-emoji",
      severity: "risk",
      title: "Enclosing mark on an emoji",
      detail:
        "Color emoji fonts generally don't position combining marks. The triangle/circle will usually show beside the emoji (or as a hollow shape) rather than around it, and it differs per device.",
    });
  } else if (ENCLOSING_MARK_RE.test(text)) {
    issues.push({
      id: "enclosing",
      severity: "warn",
      title: "Enclosing combining marks",
      detail:
        "Enclosing marks (\u{20E4} \u{20DD} \u{20DE} \u{20DF}) are drawn by the reader's font. Many system fonts render them offset, smaller than the letter, or not at all.",
    });
  }
  if (marksOnEmoji) {
    issues.push({
      id: "marks-emoji",
      severity: "warn",
      title: "Combining marks after emoji",
      detail: "Accents and overlays placed after an emoji are often drawn detached from it.",
    });
  }
  if (maxMarks > 15) {
    issues.push({
      id: "zalgo-heavy",
      severity: "risk",
      title: "Very heavy mark stacking",
      detail: `Up to ${maxMarks} marks on one character. Some apps clip, strip or reject this, and it can overlap neighbouring lines.`,
    });
  } else if (maxMarks > 5) {
    issues.push({
      id: "zalgo",
      severity: "warn",
      title: "Stacked combining marks",
      detail: `Up to ${maxMarks} marks on one character. Rendering height varies by app; some trim stacked marks.`,
    });
  } else if (RE_MARK_ANY.test(text) && !enclosingOnEmoji && !ENCLOSING_MARK_RE.test(text)) {
    issues.push({
      id: "marks",
      severity: "info",
      title: "Combining marks",
      detail: "Strike, underline and accent marks are widely supported, but exact positioning depends on the font.",
    });
  }
  if (RE_MATH_ALNUM.test(text) || RE_ENCLOSED_ALNUM.test(text)) {
    issues.push({
      id: "styled-letters",
      severity: "info",
      title: "Styled letter characters",
      detail:
        "Styled letters are distinct Unicode symbols, not formatting. Screen readers may read them oddly, search won't match them, and some username fields reject them.",
    });
  }
  if (RE_RARE_SCRIPTS.test(text)) {
    issues.push({
      id: "rare-scripts",
      severity: "warn",
      title: "Less common script blocks",
      detail: "Uses look-alike characters from blocks such as Ethiopic, Runic, Lisu or phonetic extensions. Older devices may show empty boxes.",
    });
  }
  if (RE_INVISIBLE.test(text)) {
    issues.push({
      id: "invisible",
      severity: "warn",
      title: "Invisible characters",
      detail: "Contains zero-width or blank characters. Some platforms strip them or treat the text as empty.",
    });
  }
  if (RE_BIDI.test(text)) {
    issues.push({
      id: "bidi",
      severity: "risk",
      title: "Text direction controls",
      detail: "Bidirectional control characters can reorder surrounding text and are often blocked.",
    });
  }
  if (RE_ANSI.test(text)) {
    issues.push({
      id: "ansi",
      severity: "info",
      title: "Discord ANSI color block",
      detail: "Colors only appear inside Discord ```ansi code blocks (desktop & web). Elsewhere the escape codes show as raw text.",
    });
  } else if (RE_MARKDOWN.test(text)) {
    issues.push({
      id: "markdown",
      severity: "info",
      title: "Markdown formatting",
      detail: "Formatting symbols only render in apps with Markdown support (e.g. Discord). Other apps show the symbols literally.",
    });
  }
  if (RE_FLAG_PAIR.test(text)) {
    issues.push({
      id: "flags",
      severity: "info",
      title: "Regional indicator pairs",
      detail: "Adjacent regional indicators form flag emoji. Windows shows letter pairs instead of flags.",
    });
  }

  const utf16 = text.length;
  const cps = Array.from(text).length;
  const supplementary = RE_SUPPLEMENTARY.test(text);
  if (supplementary && utf16 !== cps) {
    issues.push({
      id: "length",
      severity: "info",
      title: "Counts as more characters",
      detail: `${cps} code points but ${utf16} UTF-16 units. Many character limits count UTF-16 units, so styled text uses up limits faster.`,
    });
  }

  const platforms: PlatformFit[] = PLATFORM_LIMITS.map((p) => ({
    ...p,
    length: utf16,
    fits: utf16 <= p.limit,
  }));

  const level: CompatLevel = issues.some((i) => i.severity === "risk")
    ? "risky"
    : issues.some((i) => i.severity === "warn")
      ? "caution"
      : "safe";

  return { level, issues, platforms, maxMarksOnOneCharacter: maxMarks };
}

export const LEVEL_LABEL: Record<CompatLevel, string> = {
  safe: "Widely supported",
  caution: "May vary by platform",
  risky: "Renders inconsistently",
};

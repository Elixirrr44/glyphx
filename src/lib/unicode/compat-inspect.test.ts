import { describe, expect, it } from "vitest";
import { applyLayers } from "./engine";
import { analyzeCompatibility, utf8Length } from "./compat";
import { blockName, codePointName, describeCodePoint, generalCategory, inspectText, loadNameTable, textStats } from "./inspect";
import { MK } from "./marks";

describe("analyzeCompatibility", () => {
  it("treats plain text as safe", () => {
    const r = analyzeCompatibility("Hello world");
    expect(r.level).toBe("safe");
    expect(r.issues).toHaveLength(0);
  });

  it("warns about enclosing marks and flags them on emoji as risky", () => {
    expect(analyzeCompatibility("G\u{20E4}").level).toBe("caution");
    const onEmoji = analyzeCompatibility("\u{1F525}\u{20E4}");
    expect(onEmoji.level).toBe("risky");
    expect(onEmoji.issues.map((i) => i.id)).toContain("enclosing-emoji");
  });

  it("grades zalgo by stack height", () => {
    const light = applyLayers("ab", [{ type: "zalgo", up: 1, mid: 0, down: 1, seed: 1, variance: 0 }]);
    const heavy = applyLayers("ab", [{ type: "zalgo", up: 12, mid: 2, down: 12, seed: 1, variance: 0 }]);
    expect(analyzeCompatibility(light).level).toBe("safe");
    expect(analyzeCompatibility(heavy).issues.map((i) => i.id)).toContain("zalgo-heavy");
  });

  it("notes styled letters, invisible characters, ANSI and markdown", () => {
    const ids = (t: string) => analyzeCompatibility(t).issues.map((i) => i.id);
    expect(ids("\u{1D400}")).toContain("styled-letters");
    expect(ids("a\u{200B}b")).toContain("invisible");
    expect(ids("```ansi\n\u{1B}[0;31mx\u{1B}[0m\n```")).toContain("ansi");
    expect(ids("**bold**")).toContain("markdown");
    expect(ids("\u{1F1FA}\u{1F1F8}")).toContain("flags");
  });

  it("checks platform limits in UTF-16 units", () => {
    const styled = applyLayers("x".repeat(20), [{ type: "font", font: "bold" }]);
    const discord = analyzeCompatibility(styled).platforms.find((p) => p.id === "discord-display")!;
    expect(discord.length).toBe(40);
    expect(discord.fits).toBe(false);
  });

  it("counts UTF-8 bytes", () => {
    expect(utf8Length("a\u{00E9}\u{20E4}\u{1F525}")).toBe(1 + 2 + 3 + 4);
  });
});

describe("inspector", () => {
  it("describes the enclosing triangle", () => {
    const info = describeCodePoint(MK.triangle);
    expect(info.hex).toBe("U+20E4");
    expect(info.name).toBe("COMBINING ENCLOSING UPWARD POINTING TRIANGLE");
    expect(info.category).toBe("Me");
    expect(info.block).toBe("Combining Diacritical Marks for Symbols");
    expect(info.utf8).toBe("E2 83 A4");
    expect(info.utf16).toBe("\\u20E4");
    expect(info.isMark).toBe(true);
  });

  it("names styled letters without the table and everything else once loaded", async () => {
    expect(codePointName(0x1d400)).toBe("MATHEMATICAL BOLD CAPITAL A");
    await loadNameTable();
    expect(codePointName(0x1f525)).toBe("FIRE");
    expect(codePointName(0x2605)).toBe("BLACK STAR");
    expect(codePointName(0x1f3fd)).toBe("EMOJI MODIFIER FITZPATRICK TYPE-4");
  });

  it("classifies general categories and blocks", () => {
    expect(generalCategory("A").code).toBe("Lu");
    expect(generalCategory("\u{0301}").code).toBe("Mn");
    expect(generalCategory("\u{200D}").code).toBe("Cf");
    expect(blockName(0x1d400)).toBe("Mathematical Alphanumeric Symbols");
    expect(blockName(0x1f525)).toBe("Miscellaneous Symbols and Pictographs");
  });

  it("inspects grapheme by grapheme without splitting emoji", () => {
    const { graphemes } = inspectText("\u{1F44D}\u{1F3FD}a\u{0301}");
    expect(graphemes).toHaveLength(2);
    expect(graphemes[0].isEmoji).toBe(true);
    expect(graphemes[0].codePoints.map((c) => c.hex)).toEqual(["U+1F44D", "U+1F3FD"]);
  });

  it("computes text statistics", () => {
    const s = textStats("\u{1F44D}\u{1F3FD}a\u{0301} \u{1D400}");
    expect(s.graphemes).toBe(4);
    expect(s.codePoints).toBe(6);
    expect(s.utf16).toBe(9);
    expect(s.combiningMarks).toBe(1);
    expect(s.emoji).toBe(1);
    expect(s.nfcStable).toBe(false);
    expect(s.nfkcStable).toBe(false);
  });
});

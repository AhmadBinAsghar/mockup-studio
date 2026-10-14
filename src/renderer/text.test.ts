import { describe, expect, it } from "vitest";

import { fallbackFamilies, isRtl } from "./language";
import { parseWords, wrapWords } from "./text";
import { nodeCanvas } from "./testUtils";

describe("parseWords", () => {
  it("splits on spaces and flags [bracketed] words as accent", () => {
    expect(parseWords("Plan your [day] now").map((w) => [w.text, w.accent])).toEqual([
      ["Plan", false],
      ["your", false],
      ["day", true],
      ["now", false],
    ]);
  });

  it("makes one word per character for Chinese/Japanese so lines can break anywhere", () => {
    const words = parseWords("日本語のテキスト");
    expect(words).toHaveLength(8);
    expect(words.slice(1).every((w) => !w.spaceBefore)).toBe(true);
  });
});

describe("wrapWords", () => {
  it("wraps unspaced text without inserting spaces", () => {
    const ctx = nodeCanvas(100, 100).getContext("2d")!;
    ctx.font = "20px sans-serif";
    const lines = wrapWords(ctx, parseWords("日本語のテキストを折り返す"), 80);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.flatMap((l) => l.words.map((w) => w.text)).join("")).toBe("日本語のテキストを折り返す");
  });
});

describe("language rules", () => {
  it("flags Arabic as right-to-left only", () => {
    expect(isRtl("ar")).toBe(true);
    expect(isRtl("ur")).toBe(true);
    expect(isRtl("en")).toBe(false);
    expect(isRtl(undefined)).toBe(false);
  });

  it("picks script fonts, most specific first", () => {
    expect(fallbackFamilies("ja")).toEqual(["Noto Sans JP", "Noto Sans"]);
    expect(fallbackFamilies("zh")[0]).toBe("Noto Sans SC");
    expect(fallbackFamilies("ur")[0]).toBe("Noto Sans Arabic");
    expect(fallbackFamilies("fr")).toEqual(["Noto Sans"]);
    expect(fallbackFamilies(undefined)).toEqual(["Noto Sans"]);
  });
});

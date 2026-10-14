const BANNED: Array<{ re: RegExp; word: string }> = [
  { re: /\bbest\b/i, word: "Best" },
  { re: /#\s?1\b/, word: "#1" },
  { re: /\bfree\b/i, word: "Free" },
  { re: /\bdownload\s+now\b/i, word: "Download now" },
];

export const MAX_TEXT_AREA = 0.2;

export function lintHeadline(text: string): string[] {
  const clean = text.replace(/[[\]]/g, "");
  return BANNED.filter((b) => b.re.test(clean)).map(
    (b) => `Google Play advises against "${b.word}" in screenshot text.`,
  );
}

export function lintTextArea(ratio: number): string[] {
  return ratio > MAX_TEXT_AREA
    ? [`Text covers ${Math.round(ratio * 100)}% of the image; Google Play recommends 20% or less.`]
    : [];
}

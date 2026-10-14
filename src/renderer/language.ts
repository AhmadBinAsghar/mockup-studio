const BASE_FALLBACK = "Noto Sans";

const SCRIPT_FONT: Record<string, string> = {
  ar: "Noto Sans Arabic",
  ur: "Noto Sans Arabic",
  hi: "Noto Sans Devanagari",
  ja: "Noto Sans JP",
  ko: "Noto Sans KR",
  zh: "Noto Sans SC",
};

const RTL_LANGUAGES = new Set(["ar", "ur"]);

export const DEFAULT_LANGUAGE = "en";

export function isRtl(lang: string | undefined): boolean {
  return lang !== undefined && RTL_LANGUAGES.has(lang);
}

export function fallbackFamilies(lang: string | undefined): string[] {
  if (!lang || lang === DEFAULT_LANGUAGE) return [BASE_FALLBACK];
  const script = SCRIPT_FONT[lang];
  return script ? [script, BASE_FALLBACK] : [BASE_FALLBACK];
}

export function isUnspacedScript(char: string): boolean {
  return /[぀-ヿ㐀-䶿一-鿿豈-﫿＀-￯]/.test(char);
}

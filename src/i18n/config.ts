export type Direction = "ltr" | "rtl";

export interface UiLocale {
  code: string;
  /** The language's own name, shown in the switcher so people can find it in any UI language. */
  name: string;
  dir: Direction;
}

export const DEFAULT_UI_LOCALE = "en";

export const UI_LOCALES: readonly UiLocale[] = [
  { code: "en", name: "English", dir: "ltr" },
  { code: "es", name: "Español", dir: "ltr" },
  { code: "fr", name: "Français", dir: "ltr" },
  { code: "de", name: "Deutsch", dir: "ltr" },
  { code: "pt", name: "Português", dir: "ltr" },
  { code: "ar", name: "العربية", dir: "rtl" },
  { code: "hi", name: "हिन्दी", dir: "ltr" },
  { code: "ja", name: "日本語", dir: "ltr" },
  { code: "ur", name: "اردو", dir: "rtl" },
];

export const UI_LOCALE_STORAGE_KEY = "mockup-studio-lang";

export function findUiLocale(code: string | null | undefined): UiLocale | undefined {
  return UI_LOCALES.find((l) => l.code === code);
}

/**
 * Runs before first paint (like the theme script) so the page direction and `lang` are right
 * even while the translations are still loading.
 */
export const UI_LOCALE_INIT_SCRIPT = `(function(){try{var c=localStorage.getItem("${UI_LOCALE_STORAGE_KEY}");var r=${JSON.stringify(
  UI_LOCALES.filter((l) => l.dir === "rtl").map((l) => l.code),
)};var ok=${JSON.stringify(UI_LOCALES.map((l) => l.code))};if(c&&ok.indexOf(c)>-1){var d=document.documentElement;d.lang=c;d.dir=r.indexOf(c)>-1?"rtl":"ltr"}}catch(e){}})()`;

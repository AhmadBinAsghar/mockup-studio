import { getUiLocale, t } from "@/i18n/store";

export interface LocaleOption {
  code: string;
  label: string;
}

export const DEFAULT_LOCALE = "en";

export const LOCALES: readonly LocaleOption[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "nl", label: "Dutch" },
  { code: "sv", label: "Swedish" },
  { code: "da", label: "Danish" },
  { code: "pl", label: "Polish" },
  { code: "cs", label: "Czech" },
  { code: "ro", label: "Romanian" },
  { code: "hu", label: "Hungarian" },
  { code: "tr", label: "Turkish" },
  { code: "id", label: "Indonesian" },
  { code: "ms", label: "Malay" },
  { code: "vi", label: "Vietnamese" },
  { code: "ru", label: "Russian" },
  { code: "uk", label: "Ukrainian" },
  { code: "el", label: "Greek" },
  { code: "ar", label: "Arabic (right-to-left)" },
  { code: "hi", label: "Hindi" },
  { code: "ur", label: "Urdu (right-to-left)" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "zh", label: "Chinese (Simplified)" },
];

const RTL_CODES = new Set(["ar", "ur"]);

/** The language's name in the interface language (English names when the UI is English). */
export function localeLabel(code: string): string {
  const english = LOCALES.find((l) => l.code === code)?.label ?? code;
  const ui = getUiLocale();
  if (ui === "en") return english;
  try {
    const name = new Intl.DisplayNames([ui], { type: "language" }).of(code) ?? english;
    return RTL_CODES.has(code) ? t("slidelang.withRtl", { name }) : name;
  } catch {
    return english;
  }
}

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

export function localeLabel(code: string): string {
  return LOCALES.find((l) => l.code === code)?.label ?? code;
}

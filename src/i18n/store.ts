import { DEFAULT_UI_LOCALE, findUiLocale, UI_LOCALE_STORAGE_KEY } from "./config";
import en from "./messages/en.json";

export type Messages = Record<string, string>;
export type Params = Record<string, string | number>;

/** English ships in the main bundle; every other language is fetched when it is picked. */
const loaders: Record<string, () => Promise<{ default: Messages }>> = {
  en: async () => ({ default: en }),
  es: () => import("./messages/es.json"),
  fr: () => import("./messages/fr.json"),
  de: () => import("./messages/de.json"),
  pt: () => import("./messages/pt.json"),
  ar: () => import("./messages/ar.json"),
  hi: () => import("./messages/hi.json"),
  ja: () => import("./messages/ja.json"),
  ur: () => import("./messages/ur.json"),
};

/** Every language loaded so far, so a component can be rendered in a specific language. */
const loaded: Record<string, Messages> = { en };
let locale = DEFAULT_UI_LOCALE;
const listeners = new Set<() => void>();

export function getUiLocale(): string {
  return locale;
}

export function subscribeToUiLocale(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function fill(text: string, params?: Params): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in params ? String(params[name]) : whole));
}

export interface Translator {
  locale: string;
  /** Translates `key`; unknown keys show the key itself. */
  t: (key: string, params?: Params) => string;
  /** Like `t`, but returns `fallback` when no translation exists (e.g. user-made templates). */
  tf: (key: string, fallback: string, params?: Params) => string;
  /** Plural-aware: looks for `key.one`, `key.few`, … by the language's plural rule, then `key.other`. */
  tn: (key: string, count: number, params?: Params) => string;
}

const translators: Record<string, Translator> = {};

/** A translator fixed to one language, falling back to English for anything missing. */
export function translatorFor(code: string): Translator {
  const cached = translators[code];
  if (cached) return cached;
  const messages = loaded[code];
  if (!messages) return translatorFor(DEFAULT_UI_LOCALE);
  const lookup = (key: string): string | undefined => messages[key] ?? (en as Messages)[key];
  const tr: Translator = {
    locale: code,
    t: (key, params) => fill(lookup(key) ?? key, params),
    tf: (key, fallback, params) => {
      const found = lookup(key);
      return found === undefined ? fallback : fill(found, params);
    },
    tn: (key, count, params) => {
      const rule = new Intl.PluralRules(code).select(count);
      return tr.t(lookup(`${key}.${rule}`) === undefined ? `${key}.other` : `${key}.${rule}`, {
        count,
        ...params,
      });
    },
  };
  translators[code] = tr;
  return tr;
}

/**
 * Translate with the language currently selected. Fine in event handlers and validators; components
 * should use `useT()` so that they render the same language the server did while hydrating.
 */
export const t: Translator["t"] = (key, params) => translatorFor(locale).t(key, params);
export const tf: Translator["tf"] = (key, fallback, params) =>
  translatorFor(locale).tf(key, fallback, params);
export const tn: Translator["tn"] = (key, count, params) => translatorFor(locale).tn(key, count, params);

function applyToDocument(code: string) {
  const info = findUiLocale(code);
  if (!info || typeof document === "undefined") return;
  document.documentElement.lang = info.code;
  document.documentElement.dir = info.dir;
}

export async function setUiLocale(code: string, persist = true): Promise<void> {
  const load = loaders[code];
  if (!load || !findUiLocale(code)) return;
  loaded[code] = (await load()).default;
  locale = code;
  applyToDocument(code);
  if (persist) {
    try {
      localStorage.setItem(UI_LOCALE_STORAGE_KEY, code);
    } catch {}
  }
  listeners.forEach((l) => l());
}

/** Applies the language the visitor picked on an earlier visit. English is the default, never auto-detected. */
export function initUiLocale(): void {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(UI_LOCALE_STORAGE_KEY);
  } catch {}
  if (saved && saved !== DEFAULT_UI_LOCALE) void setUiLocale(saved, false);
}

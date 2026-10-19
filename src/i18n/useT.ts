"use client";

import { useSyncExternalStore } from "react";

import { DEFAULT_UI_LOCALE } from "./config";
import { getUiLocale, subscribeToUiLocale, translatorFor } from "./store";

/**
 * Re-renders the component when the language changes. The server and the first client render
 * always use English so hydration matches; the saved language is applied right after.
 */
export function useT() {
  const locale = useSyncExternalStore(subscribeToUiLocale, getUiLocale, () => DEFAULT_UI_LOCALE);
  return translatorFor(locale);
}

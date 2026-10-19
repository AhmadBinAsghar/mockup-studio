"use client";

import { useEffect } from "react";

import { initUiLocale } from "./store";

export function I18nInit() {
  useEffect(() => {
    initUiLocale();
  }, []);
  return null;
}

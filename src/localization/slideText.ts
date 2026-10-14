import type { Slide, SlideText } from "@/types";

import { DEFAULT_LOCALE } from "./locales";

export function baseText(slide: Slide): SlideText {
  return { headline: slide.headline, subheadline: slide.subheadline, bullets: slide.bullets };
}

export function textFor(slide: Slide, locale: string): SlideText {
  if (locale === DEFAULT_LOCALE) return baseText(slide);
  return slide.translations?.[locale] ?? baseText(slide);
}

export function localizeSlide(slide: Slide, locale: string): Slide {
  return { ...slide, ...textFor(slide, locale), lang: locale };
}

export function textPatch(slide: Slide, locale: string, change: Partial<SlideText>): Partial<Slide> {
  if (locale === DEFAULT_LOCALE) return change;
  const current = textFor(slide, locale);
  return { translations: { ...slide.translations, [locale]: { ...current, ...change } } };
}

export interface ExportSet {
  prefix: string;
  slides: Slide[];
}

export function buildExportSets(slides: Slide[], locales: string[]): ExportSet[] {
  if (locales.length <= 1) return [{ prefix: "", slides }];
  return locales.map((code) => ({
    prefix: `${code}/`,
    slides: slides.map((s) => localizeSlide(s, code)),
  }));
}

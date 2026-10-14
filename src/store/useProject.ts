"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { DEFAULT_LOCALE } from "@/localization/locales";
import { baseText } from "@/localization/slideText";
import { DEFAULT_FONT } from "@/renderer/fonts/defaultFont";
import type { Brand, CustomSize, Fill, Slide, SlideStyle, Template } from "@/types";

import { projectStorage } from "./projectRegistry";
import { migrateLegacyStyles, withoutStyle, withStyle } from "./slideStyles";

export const MAX_SLIDES = 10;

interface ProjectState {
  slides: Slide[];
  selectedId: string | null;
  presetIds: string[];
  customSizes: CustomSize[];
  landscape: boolean;
  templateId: string | null;
  customTemplates: Template[];
  brand: Brand;
  locales: string[];
  activeLocale: string;
  customizeVisited: boolean;
  hydrated: boolean;

  markCustomizeVisited: () => void;
  addSlides: (slides: Slide[]) => void;
  removeSlide: (id: string) => void;
  moveSlide: (from: number, to: number) => void;
  updateSlide: (id: string, patch: Partial<Slide>) => void;
  clearSlideField: (id: string, field: "font" | "deviceFrame") => void;
  setSlideStyle: (slideId: string, templateId: string, patch: Partial<SlideStyle>) => void;
  clearSlideStyle: (slideId: string, templateId: string, field: keyof SlideStyle) => void;
  select: (id: string) => void;
  togglePreset: (id: string) => void;
  setPresets: (ids: string[]) => void;
  addCustomSize: (c: CustomSize) => void;
  removeCustomSize: (id: string) => void;
  setLandscape: (on: boolean) => void;
  setTemplate: (id: string) => void;
  setSlideTemplate: (slideId: string, templateId: string | null) => void;
  saveCustomTemplate: (template: Template) => void;
  deleteCustomTemplate: (id: string) => void;
  addLocale: (code: string) => void;
  removeLocale: (code: string) => void;
  setActiveLocale: (code: string) => void;
  setBrand: (patch: Partial<Brand>) => void;
  applyBackgroundToAll: (fill: Fill) => void;
}

function withoutOwnTemplate(slide: Slide): Slide {
  const next = { ...slide };
  delete next.templateId;
  return next;
}

export function createInitialProject() {
  return {
    slides: [] as Slide[],
    selectedId: null as string | null,
    presetIds: [] as string[],
    customSizes: [] as CustomSize[],
    landscape: false,
    templateId: null as string | null,
    customTemplates: [] as Template[],
    locales: [DEFAULT_LOCALE],
    activeLocale: DEFAULT_LOCALE,
    brand: { color: "#6D28D9", font: DEFAULT_FONT } as Brand,
    customizeVisited: false,
  };
}

export const useProject = create<ProjectState>()(
  persist(
    (setState) => ({
      ...createInitialProject(),
      hydrated: false,

      markCustomizeVisited: () => setState({ customizeVisited: true }),
      addSlides: (added) =>
        setState((s) => {
          const slides = [...s.slides, ...added].slice(0, MAX_SLIDES);
          return { slides, selectedId: s.selectedId ?? slides[0]?.id ?? null };
        }),
      removeSlide: (id) =>
        setState((s) => {
          const slides = s.slides.filter((x) => x.id !== id);
          if (slides.length === 0) return createInitialProject();
          const selectedId = s.selectedId === id ? (slides[0]?.id ?? null) : s.selectedId;
          return { slides, selectedId };
        }),
      moveSlide: (from, to) =>
        setState((s) => {
          const slides = [...s.slides];
          const [item] = slides.splice(from, 1);
          slides.splice(to, 0, item);
          return { slides };
        }),
      updateSlide: (id, patch) =>
        setState((s) => ({ slides: s.slides.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      clearSlideField: (id, field) =>
        setState((s) => ({
          slides: s.slides.map((x) => {
            if (x.id !== id) return x;
            const next = { ...x };
            delete next[field];
            return next;
          }),
        })),
      setSlideStyle: (slideId, templateId, patch) =>
        setState((s) => ({
          slides: s.slides.map((x) => (x.id === slideId ? withStyle(x, templateId, patch) : x)),
        })),
      clearSlideStyle: (slideId, templateId, field) =>
        setState((s) => ({
          slides: s.slides.map((x) => (x.id === slideId ? withoutStyle(x, templateId, field) : x)),
        })),
      select: (selectedId) => setState({ selectedId }),
      togglePreset: (id) =>
        setState((s) => ({
          presetIds: s.presetIds.includes(id) ? s.presetIds.filter((p) => p !== id) : [...s.presetIds, id],
        })),
      setPresets: (presetIds) => setState({ presetIds }),
      addCustomSize: (c) => setState((s) => ({ customSizes: [...s.customSizes, c] })),
      removeCustomSize: (id) => setState((s) => ({ customSizes: s.customSizes.filter((c) => c.id !== id) })),
      setLandscape: (landscape) => setState({ landscape }),
      setTemplate: (templateId) =>
        setState((s) => ({
          templateId,
          slides: s.slides.map(withoutOwnTemplate),
        })),
      setSlideTemplate: (slideId, templateId) =>
        setState((s) => ({
          slides: s.slides.map((x) => {
            if (x.id !== slideId) return x;
            return templateId === null ? withoutOwnTemplate(x) : { ...x, templateId };
          }),
        })),
      saveCustomTemplate: (template) =>
        setState((s) => ({
          customTemplates: [...s.customTemplates.filter((t) => t.id !== template.id), template],
        })),
      deleteCustomTemplate: (id) =>
        setState((s) => ({
          customTemplates: s.customTemplates.filter((t) => t.id !== id),
          templateId: s.templateId === id ? null : s.templateId,
          slides: s.slides.map((x) => (x.templateId === id ? withoutOwnTemplate(x) : x)),
        })),
      addLocale: (code) =>
        setState((s) => {
          if (s.locales.includes(code)) return { activeLocale: code };
          return {
            locales: [...s.locales, code],
            activeLocale: code,
            slides: s.slides.map((x) => ({
              ...x,
              translations: { ...x.translations, [code]: { ...baseText(x) } },
            })),
          };
        }),
      removeLocale: (code) =>
        setState((s) => {
          if (code === DEFAULT_LOCALE) return {};
          const locales = s.locales.filter((l) => l !== code);
          return { locales, activeLocale: s.activeLocale === code ? DEFAULT_LOCALE : s.activeLocale };
        }),
      setActiveLocale: (activeLocale) => setState({ activeLocale }),
      setBrand: (patch) => setState((s) => ({ brand: { ...s.brand, ...patch } })),
      applyBackgroundToAll: (fill) =>
        setState((s) => ({
          slides: s.slides.map((x) => {
            const templateId = x.templateId ?? s.templateId;
            return templateId ? withStyle(x, templateId, { background: fill }) : x;
          }),
        })),
    }),
    {
      name: "shelfshot-project",
      version: 1,
      migrate: (persisted) => migrateLegacyStyles(persisted as Partial<ProjectState>),
      storage: projectStorage<Partial<ProjectState>>(),
      skipHydration: true,
      partialize: (s) => ({
        customizeVisited: s.customizeVisited,
        slides: s.slides,
        selectedId: s.selectedId,
        presetIds: s.presetIds,
        customSizes: s.customSizes,
        landscape: s.landscape,
        templateId: s.templateId,
        customTemplates: s.customTemplates,
        brand: s.brand,
        locales: s.locales,
        activeLocale: s.activeLocale,
      }),
      onRehydrateStorage: () => () => useProject.setState({ hydrated: true }),
    },
  ),
);

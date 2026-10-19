import { getPreset, presetLabel, STORE_LABELS } from "@/config/storePresets";
import { t, tn } from "@/i18n/store";
import { localeLabel } from "@/localization/locales";
import { DEFAULT_FONT } from "@/renderer/fonts/defaultFont";
import { getTemplate } from "@/templates";
import { templateName } from "@/templates/localized";
import type { Brand, CustomSize, Slide, Template } from "@/types";

const DEFAULT_BRAND_COLOR = "#6D28D9";

export interface ProjectContents {
  slides: Slide[];
  presetIds: string[];
  customSizes: CustomSize[];
  landscape: boolean;
  templateId: string | null;
  customTemplates: Template[];
  brand: Brand;
  locales: string[];
}

export function summarizeProject(project: ProjectContents): string[] {
  const lines: string[] = [];
  const { slides, presetIds, customSizes, customTemplates, locales, brand } = project;

  if (slides.length > 0) {
    lines.push(tn("summary.screenshots", slides.length, { names: slides.map((s) => s.name).join(", ") }));
  }
  const presets = presetIds.flatMap((id) => getPreset(id) ?? []);
  if (presets.length > 0) {
    lines.push(
      t("summary.storeSizes", {
        list: presets.map((p) => `${STORE_LABELS[p.store]} ${presetLabel(p)}`).join(", "),
      }),
    );
  }
  if (customSizes.length > 0) {
    lines.push(
      t("summary.customSizes", {
        list: customSizes.map((c) => `${c.label ? `${c.label} ` : ""}${c.width}×${c.height}`).join(", "),
      }),
    );
  }
  if (project.landscape) lines.push(t("summary.landscape"));
  if (project.templateId) {
    lines.push(
      t("summary.template", { name: templateName(getTemplate(project.templateId, customTemplates)) }),
    );
  }
  if (customTemplates.length > 0) {
    lines.push(t("summary.customTemplates", { list: customTemplates.map((c) => c.name).join(", ") }));
  }
  if (locales.length > 1) {
    lines.push(t("summary.languages", { list: locales.map(localeLabel).join(", ") }));
  }
  if (brand.color.toLowerCase() !== DEFAULT_BRAND_COLOR.toLowerCase() || brand.font !== DEFAULT_FONT) {
    lines.push(t("summary.brand", { color: brand.color, font: brand.font }));
  }
  return lines;
}

import { getPreset, STORE_LABELS } from "@/config/storePresets";
import { localeLabel } from "@/localization/locales";
import { DEFAULT_FONT } from "@/renderer/fonts/defaultFont";
import { getTemplate } from "@/templates";
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
    lines.push(
      `${slides.length} screenshot${slides.length === 1 ? "" : "s"}: ${slides.map((s) => s.name).join(", ")}`,
    );
  }
  const presets = presetIds.flatMap((id) => getPreset(id) ?? []);
  if (presets.length > 0) {
    lines.push(`Store sizes: ${presets.map((p) => `${STORE_LABELS[p.store]} ${p.label}`).join(", ")}`);
  }
  if (customSizes.length > 0) {
    lines.push(
      `Custom sizes: ${customSizes.map((c) => `${c.label ? `${c.label} ` : ""}${c.width}×${c.height}`).join(", ")}`,
    );
  }
  if (project.landscape) lines.push("Landscape variants switched on");
  if (project.templateId) {
    lines.push(`Template: ${getTemplate(project.templateId, customTemplates).name}`);
  }
  if (customTemplates.length > 0) {
    lines.push(`Custom templates: ${customTemplates.map((t) => t.name).join(", ")}`);
  }
  if (locales.length > 1) {
    lines.push(`Languages: ${locales.map(localeLabel).join(", ")} (including translated text)`);
  }
  if (brand.color.toLowerCase() !== DEFAULT_BRAND_COLOR.toLowerCase() || brand.font !== DEFAULT_FONT) {
    lines.push(`Brand: ${brand.color}, ${brand.font}`);
  }
  return lines;
}

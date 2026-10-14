"use client";

import { pickTemplate, TEMPLATES } from "@/templates";
import type { Slide, Template } from "@/types";

import { useProject } from "./useProject";

export function useAllTemplates(): Template[] {
  const custom = useProject((s) => s.customTemplates);
  return [...TEMPLATES, ...custom];
}

export function useActiveTemplate(): Template {
  const { templateId, customTemplates } = useProject();
  return pickTemplate(undefined, templateId, customTemplates);
}

export function useSlideTemplate(slide: Slide | undefined): Template {
  const { templateId, customTemplates } = useProject();
  return pickTemplate(slide, templateId, customTemplates);
}

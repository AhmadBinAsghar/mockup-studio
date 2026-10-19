import { tf } from "@/i18n/store";

import type { TemplateCategory } from "./categories";
import type { Template } from "@/types";

/** Built-in templates and categories are translated by id; user-made templates keep the name they were given. */
export function templateName(template: Pick<Template, "id" | "name">): string {
  return tf(`tpl.${template.id}.name`, template.name);
}

export function templateDescription(template: Pick<Template, "id" | "description">): string | undefined {
  return template.description === undefined
    ? undefined
    : tf(`tpl.${template.id}.description`, template.description);
}

export function categoryLabel(category: Pick<TemplateCategory, "id" | "label">): string {
  return tf(`category.${category.id}.label`, category.label);
}

export function categoryDescription(category: Pick<TemplateCategory, "id" | "description">): string {
  return tf(`category.${category.id}.description`, category.description);
}

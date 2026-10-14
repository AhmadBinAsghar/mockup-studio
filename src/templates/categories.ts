import type { TemplateCategoryId } from "@/types";

export interface TemplateCategory {
  id: TemplateCategoryId;
  label: string;
  description: string;
}

export const CATEGORIES: readonly TemplateCategory[] = [
  {
    id: "general",
    label: "General",
    description: "All-purpose designs for any app. They recolor to match your brand color.",
  },
  { id: "education", label: "Education", description: "Learning, courses, schools and study apps." },
  { id: "office", label: "Office & Business", description: "Productivity, finance and workplace tools." },
  { id: "food", label: "Food & Spicy", description: "Restaurants, recipes and delivery, in hot colors." },
  { id: "fitness", label: "Fitness & Gym", description: "Workouts, training and sports tracking." },
  { id: "health", label: "Health & Hospital", description: "Clinics, doctors, wellbeing and care." },
  { id: "kids", label: "Kids & Cartoon", description: "Playful, bright designs for children's apps." },
  { id: "games", label: "Games", description: "Neon, arcade and level-up looks for game listings." },
  { id: "custom", label: "My templates", description: "Templates you created in the builder." },
];

export function categoryOf(template: {
  category?: TemplateCategoryId;
  custom?: boolean;
}): TemplateCategoryId {
  return template.custom ? "custom" : (template.category ?? "general");
}

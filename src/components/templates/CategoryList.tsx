"use client";

import {
  Briefcase,
  Dumbbell,
  Flame,
  GraduationCap,
  Gamepad2,
  HeartPulse,
  Smile,
  Sparkles,
  Wand2,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { TemplateCategory } from "@/templates/categories";
import type { TemplateCategoryId } from "@/types";

const ICONS: Record<TemplateCategoryId, LucideIcon> = {
  general: Sparkles,
  education: GraduationCap,
  office: Briefcase,
  food: Flame,
  fitness: Dumbbell,
  health: HeartPulse,
  kids: Smile,
  games: Gamepad2,
  custom: Wand2,
};

interface Props {
  categories: Array<TemplateCategory & { count: number }>;
  active: TemplateCategoryId;
  onSelect: (id: TemplateCategoryId) => void;
}

export function CategoryList({ categories, active, onSelect }: Props) {
  return (
    <nav
      aria-label="Template categories"
      className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible"
    >
      {categories.map((category) => {
        const Icon = ICONS[category.id];
        return (
          <Button
            key={category.id}
            variant={category.id === active ? "default" : "outline"}
            aria-pressed={category.id === active}
            onClick={() => onSelect(category.id)}
            className="h-auto shrink-0 justify-start gap-2 whitespace-normal py-2 text-left"
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            <span className="flex-1">{category.label}</span>
            <span className="text-xs opacity-70">{category.count}</span>
          </Button>
        );
      })}
    </nav>
  );
}

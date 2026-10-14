"use client";

import { SlideCanvas } from "@/components/preview/SlideCanvas";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Brand, Slide, Template } from "@/types";

interface Props {
  templates: Template[];
  selectedId: string | null;
  previewSlide: Slide;
  prev?: Slide;
  next?: Slide;
  slideCount: number;
  brand: Brand;
  onPick: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (template: Template) => void;
}

export function TemplateGrid({
  templates,
  selectedId,
  previewSlide,
  prev,
  next,
  slideCount,
  brand,
  onPick,
  onDelete,
  onEdit,
}: Props) {
  if (templates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No templates here yet. Create one with the builder below.
      </p>
    );
  }
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Templates">
      {templates.map((t) => (
        <li key={t.id} className="relative">
          <Button
            variant="outline"
            role="radio"
            aria-checked={selectedId === t.id}
            onClick={() => onPick(t.id)}
            className={cn(
              "h-auto w-full flex-col items-stretch gap-2 whitespace-normal rounded-xl border-2 p-2 text-left",
              selectedId === t.id && "border-primary bg-accent",
            )}
          >
            <SlideCanvas
              slide={previewSlide}
              prev={prev}
              next={next}
              template={t}
              brand={brand}
              width={1080}
              height={1920}
              count={Math.max(slideCount, 2)}
              renderWidth={220}
              className="w-full rounded-md"
            />
            <span className="text-sm font-semibold">{t.name}</span>
            <span className="text-xs text-muted-foreground">
              {t.description ?? (t.custom ? "Custom template" : "")}
            </span>
          </Button>
          {t.custom && (
            <div className="absolute right-3 top-3 flex gap-1">
              <Button variant="ghost" size="xs" className="bg-card" onClick={() => onEdit(t)}>
                Edit
              </Button>
              <Button
                variant="ghost"
                size="xs"
                className="bg-card text-destructive"
                onClick={() => onDelete(t.id)}
              >
                Delete
              </Button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

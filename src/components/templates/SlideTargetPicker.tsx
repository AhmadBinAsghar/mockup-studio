"use client";

import { useMemo } from "react";

import { SlideCanvas } from "@/components/preview/SlideCanvas";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { neighborsOf } from "@/lib/neighbors";
import { localizeSlide } from "@/localization/slideText";
import { pickTemplate } from "@/templates";
import { useProject } from "@/store/useProject";
import type { Brand, Slide } from "@/types";

function TargetThumb({ slide, locale, brand }: { slide: Slide; locale: string; brand: Brand }) {
  const { slides, templateId, customTemplates } = useProject();
  const neighbors = neighborsOf(slides, slides.indexOf(slide));
  const localized = useMemo(() => localizeSlide(slide, locale), [slide, locale]);
  return (
    <SlideCanvas
      slide={localized}
      prev={neighbors.prev}
      next={neighbors.next}
      template={pickTemplate(slide, templateId, customTemplates)}
      brand={brand}
      width={1080}
      height={1920}
      renderWidth={64}
      className="block w-12"
    />
  );
}

export type TemplateTarget = "all" | string;

interface Props {
  target: TemplateTarget;
  onTarget: (target: TemplateTarget) => void;
}

export function SlideTargetPicker({ target, onTarget }: Props) {
  const { slides, brand, activeLocale, setSlideTemplate } = useProject();
  if (slides.length < 2) return null;

  const targetSlide = slides.find((s) => s.id === target);
  const targetIndex = slides.findIndex((s) => s.id === target);

  return (
    <section className="flex flex-col gap-2" aria-label="Design target">
      <p className="text-sm font-semibold">Design for</p>
      <div className="flex flex-wrap items-end gap-2">
        <Button
          variant={target === "all" ? "default" : "outline"}
          aria-pressed={target === "all"}
          onClick={() => onTarget("all")}
        >
          All screenshots
        </Button>
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            aria-label={`Screenshot ${i + 1}`}
            aria-pressed={target === slide.id}
            onClick={() => onTarget(slide.id)}
            className={cn(
              "relative cursor-pointer overflow-hidden rounded-lg border-2 bg-muted",
              target === slide.id ? "border-primary" : "border-transparent",
            )}
          >
            <TargetThumb slide={slide} locale={activeLocale} brand={brand} />
            <span className="absolute bottom-0 left-0 rounded-tr bg-black/70 px-1 text-[10px] text-white">
              {i + 1}
            </span>
            {slide.templateId && (
              <span className="absolute right-0.5 top-0.5 size-2 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>
      {targetSlide && (
        <p className="text-xs text-muted-foreground">
          Picking a template now changes screenshot {targetIndex + 1} only.
          {targetSlide.templateId && (
            <Button variant="link" size="xs" onClick={() => setSlideTemplate(targetSlide.id, null)}>
              Use the default design again
            </Button>
          )}
        </p>
      )}
    </section>
  );
}

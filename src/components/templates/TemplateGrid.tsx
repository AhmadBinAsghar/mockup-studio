"use client";

import { useT } from "@/i18n/useT";
import { SlideCanvas } from "@/components/preview/SlideCanvas";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { templateDescription, templateName } from "@/templates/localized";
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
  const { t } = useT();
  if (templates.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("template.empty")}</p>;
  }
  return (
    <ul
      className="grid grid-cols-2 gap-3 sm:grid-cols-3"
      role="radiogroup"
      aria-label={t("template.gridLabel")}
    >
      {templates.map((tpl) => (
        <li key={tpl.id} className="relative">
          <Button
            variant="outline"
            role="radio"
            aria-checked={selectedId === tpl.id}
            onClick={() => onPick(tpl.id)}
            className={cn(
              "h-auto w-full flex-col items-stretch gap-2 whitespace-normal rounded-xl border-2 p-2 text-start",
              selectedId === tpl.id && "border-primary bg-accent",
            )}
          >
            <SlideCanvas
              slide={previewSlide}
              prev={prev}
              next={next}
              template={tpl}
              brand={brand}
              width={1080}
              height={1920}
              count={Math.max(slideCount, 2)}
              renderWidth={220}
              className="w-full rounded-md"
            />
            <span className="text-sm font-semibold">{templateName(tpl)}</span>
            <span className="text-xs text-muted-foreground">
              {templateDescription(tpl) ?? (tpl.custom ? t("template.customLabel") : "")}
            </span>
          </Button>
          {tpl.custom && (
            <div className="absolute end-3 top-3 flex gap-1">
              <Button variant="ghost" size="xs" className="bg-card" onClick={() => onEdit(tpl)}>
                {t("template.editBtn")}
              </Button>
              <Button
                variant="ghost"
                size="xs"
                className="bg-card text-destructive"
                onClick={() => onDelete(tpl.id)}
              >
                {t("template.deleteBtn")}
              </Button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

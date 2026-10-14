"use client";

import { Plus, Redo2, Undo2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { SlideCanvas } from "@/components/preview/SlideCanvas";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { neighborsOf } from "@/lib/neighbors";
import { localizeSlide } from "@/localization/slideText";
import type { RenderReport } from "@/renderer/renderSlide";
import { useProject } from "@/store/useProject";
import {
  addCallout,
  addPhoneSelected,
  addShapeSelected,
  canAddCallout,
  finishTemplate,
  layerLabel,
  MAX_PHONES,
  layerIndexes,
  SHAPE_KINDS,
} from "@/templates/builderModel";
import type { Template } from "@/types";

import { SelectField } from "@/components/shared/form";

import { CanvasOverlay } from "./CanvasOverlay";

const SIZES = [
  { value: "phone", label: "Phone 1080 × 1920", width: 1080, height: 1920, kind: "phone" as const },
  { value: "tablet", label: "Tablet 1440 × 2560", width: 1440, height: 2560, kind: "tablet" as const },
  { value: "feature", label: "Feature graphic 1024 × 500", width: 1024, height: 500, kind: "phone" as const },
];

export interface BuilderHistoryControls {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

interface Props {
  draft: Template;
  name: string;
  selected: number | null;
  onSelect: (index: number | null) => void;
  onChange: (draft: Template) => void;
  history: BuilderHistoryControls;
}

export function BuilderPreview({ draft, name, selected, onSelect, onChange, history }: Props) {
  const { slides, selectedId, brand, activeLocale } = useProject();
  const [sizeId, setSizeId] = useState("phone");
  const [report, setReport] = useState<RenderReport | null>(null);
  const onReport = useCallback((r: RenderReport) => setReport(r), []);
  const size = SIZES.find((s) => s.value === sizeId) ?? SIZES[0];
  const editable = sizeId === "phone";
  const index = Math.max(
    0,
    slides.findIndex((s) => s.id === selectedId),
  );
  const slide = slides[index];
  // The builder edits the template itself, so the slide's own screenshot nudge and size are ignored here.
  const localized = useMemo(
    () =>
      slide
        ? {
            ...localizeSlide(slide, activeLocale),
            deviceOffsetX: undefined,
            deviceOffsetY: undefined,
            deviceScale: undefined,
          }
        : null,
    [slide, activeLocale],
  );
  const template = useMemo(() => finishTemplate(draft, "preview", name), [draft, name]);
  const neighbors = neighborsOf(slides, index);

  if (!localized) return null;

  const add = (made: { draft: Template; index: number } | null) => {
    if (!made) return;
    onChange(made.draft);
    onSelect(made.index);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex w-full items-center gap-1">
        <div className="min-w-0 flex-1">
          <SelectField
            ariaLabel="Preview size"
            value={sizeId}
            options={SIZES.map(({ value, label }) => ({ value, label }))}
            onChange={(id) => {
              setSizeId(id);
              if (id !== "phone") onSelect(null);
            }}
          />
        </div>
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label="Undo"
          title="Undo (Ctrl+Z)"
          disabled={!history.canUndo}
          onClick={history.undo}
        >
          <Undo2 />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label="Redo"
          title="Redo (Ctrl+Shift+Z)"
          disabled={!history.canRedo}
          onClick={history.redo}
        >
          <Redo2 />
        </Button>
      </div>

      {editable && (
        <div className="flex w-full flex-wrap items-center gap-1" role="group" aria-label="Add to the design">
          <span className="text-xs text-muted-foreground">Add:</span>
          {SHAPE_KINDS.map(({ kind, label }) => (
            <Button
              key={kind}
              type="button"
              size="xs"
              variant="outline"
              onClick={() => add(addShapeSelected(draft, kind))}
            >
              <Plus /> {label}
            </Button>
          ))}
          <Button
            type="button"
            size="xs"
            variant="outline"
            disabled={layerIndexes(draft, "device").length >= MAX_PHONES}
            onClick={() => add(addPhoneSelected(draft))}
          >
            <Plus /> Phone
          </Button>
          <Button
            type="button"
            size="xs"
            variant="outline"
            disabled={!canAddCallout(draft)}
            onClick={() => add(addCallout(draft))}
          >
            <Plus /> Card
          </Button>
        </div>
      )}

      <div className="relative w-fit max-w-full">
        <SlideCanvas
          slide={localized}
          prev={neighbors.prev}
          next={neighbors.next}
          template={template}
          brand={brand}
          width={size.width}
          height={size.height}
          kind={size.kind}
          index={index}
          count={slides.length}
          renderWidth={420}
          onReport={onReport}
          className="block max-h-[56vh] w-auto max-w-full rounded-lg shadow-lg"
        />
        {editable && (
          <CanvasOverlay
            draft={draft}
            report={report}
            selected={selected}
            onSelect={onSelect}
            onChange={onChange}
          />
        )}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {editable
          ? "Click anything to select it, drag to move it, pull the handles to resize or rotate. Hold Alt to turn snapping off."
          : "Switch the preview to Phone to move things around. Tablet and wide layouts follow the phone design."}
      </p>

      <div className="flex w-full flex-wrap gap-1" role="group" aria-label="Layers, front to back">
        {draft.layers
          .map((_, i) => i)
          .reverse()
          .map((i) => (
            <button
              key={i}
              type="button"
              className={cn(
                "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                i === selected
                  ? "border-sky-500 bg-sky-50 text-sky-900 dark:bg-sky-950/50 dark:text-sky-100"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
              aria-pressed={i === selected}
              onClick={() => editable && onSelect(i === selected ? null : i)}
              disabled={!editable}
            >
              {layerLabel(draft, i)}
            </button>
          ))}
      </div>
    </div>
  );
}

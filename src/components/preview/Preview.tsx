"use client";

import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { neighborsOf } from "@/lib/neighbors";
import { lintTextArea } from "@/validation/lint";
import { localizeSlide } from "@/localization/slideText";
import { buildOutputs } from "@/export/outputs";
import { aspectWarnings } from "@/validation/checks";
import type { RenderReport } from "@/renderer/renderSlide";
import { useProject } from "@/store/useProject";
import { useSlideTemplate } from "@/store/useTemplates";
import type { OutputSize } from "@/types";

import { Notice, SelectField } from "@/components/shared/form";
import { SlideCanvas } from "./SlideCanvas";

const FALLBACK_OUTPUT: OutputSize = { folder: "", label: "Phone", width: 1080, height: 1920, kind: "phone" };

export function Preview() {
  const { slides, selectedId, select, brand, presetIds, customSizes, landscape, activeLocale } = useProject();
  const [sizeIndex, setSizeIndex] = useState(0);
  const [report, setReport] = useState<RenderReport | null>(null);
  const onReport = useCallback((r: RenderReport) => setReport(r), []);

  const outputs = buildOutputs({ presetIds, customSizes, landscape });
  const chosen = Math.min(sizeIndex, outputs.length - 1);
  const output = outputs[chosen] ?? FALLBACK_OUTPUT;
  const index = Math.max(
    0,
    slides.findIndex((s) => s.id === selectedId),
  );
  const slide = slides[index];
  const neighbors = neighborsOf(slides, index);
  const template = useSlideTemplate(slide);
  const localized = useMemo(() => (slide ? localizeSlide(slide, activeLocale) : null), [slide, activeLocale]);

  if (!slide || !localized) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
        Live preview appears here
      </div>
    );
  }
  const warnings = [
    ...aspectWarnings(slide, [output]),
    ...(report && !output.singleImage ? lintTextArea(report.textAreaRatio) : []),
  ];

  return (
    <div className="flex min-w-0 flex-col items-center gap-3">
      {outputs.length > 0 && (
        <SelectField
          ariaLabel="Preview size"
          value={String(chosen)}
          options={outputs.map((o, i) => ({
            value: String(i),
            label: `${o.label} · ${o.width}×${o.height}`,
          }))}
          onChange={(v) => setSizeIndex(Number(v))}
        />
      )}
      <SlideCanvas
        slide={localized}
        prev={neighbors.prev}
        next={neighbors.next}
        template={template}
        brand={brand}
        width={output.width}
        height={output.height}
        kind={output.kind}
        index={index}
        count={slides.length}
        renderWidth={520}
        className="max-h-[70vh] w-auto max-w-full rounded-lg shadow-lg"
        onReport={onReport}
      />
      <div className="flex flex-wrap justify-center gap-1">
        {slides.map((s, i) => (
          <Button
            key={s.id}
            size="icon-sm"
            variant={s.id === slide.id ? "default" : "outline"}
            aria-label={`Preview slide ${i + 1}`}
            aria-current={s.id === slide.id}
            onClick={() => select(s.id)}
          >
            {i + 1}
          </Button>
        ))}
      </div>
      <div className="flex w-full max-w-md flex-col gap-2">
        {warnings.map((w) => (
          <Notice key={w}>{w}</Notice>
        ))}
      </div>
    </div>
  );
}

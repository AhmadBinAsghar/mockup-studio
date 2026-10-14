"use client";

import { DEFAULT_FIT_COLOR } from "@/renderer/fit";
import { useProject } from "@/store/useProject";
import type { FitMode, Slide } from "@/types";

import { ColorInput, Field, SelectField } from "@/components/shared/form";

const FIT_OPTIONS = [
  { value: "auto", label: "Auto (whole image if the shape differs)" },
  { value: "contain", label: "Whole image" },
  { value: "cover", label: "Fill (crop edges)" },
];

export function FitControls({ slide }: { slide: Slide }) {
  const updateSlide = useProject((s) => s.updateSlide);
  return (
    <div className="grid grid-cols-[1fr_auto] items-end gap-3">
      <Field label="Screenshot fit">
        <SelectField
          ariaLabel="Screenshot fit"
          value={slide.fit ?? "auto"}
          options={FIT_OPTIONS}
          onChange={(fit) => updateSlide(slide.id, { fit: fit as FitMode })}
        />
      </Field>
      <Field label="Margin color">
        <ColorInput
          label="Margin color"
          value={slide.fitColor ?? DEFAULT_FIT_COLOR}
          onChange={(fitColor) => updateSlide(slide.id, { fitColor })}
        />
      </Field>
    </div>
  );
}

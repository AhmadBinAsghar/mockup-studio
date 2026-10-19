"use client";

import { useT } from "@/i18n/useT";
import { DEFAULT_FIT_COLOR } from "@/renderer/fit";
import { useProject } from "@/store/useProject";
import type { FitMode, Slide } from "@/types";

import { ColorInput, Field, SelectField } from "@/components/shared/form";

export function FitControls({ slide }: { slide: Slide }) {
  const { t } = useT();
  const fitOptions = [
    { value: "auto", label: t("fit.auto") },
    { value: "contain", label: t("fit.contain") },
    { value: "cover", label: t("fit.cover") },
  ];
  const updateSlide = useProject((s) => s.updateSlide);
  return (
    <div className="grid grid-cols-[1fr_auto] items-end gap-3">
      <Field label={t("fit.label")}>
        <SelectField
          ariaLabel={t("fit.label")}
          value={slide.fit ?? "auto"}
          options={fitOptions}
          onChange={(fit) => updateSlide(slide.id, { fit: fit as FitMode })}
        />
      </Field>
      <Field label={t("fit.margin")}>
        <ColorInput
          label={t("fit.margin")}
          value={slide.fitColor ?? DEFAULT_FIT_COLOR}
          onChange={(fitColor) => updateSlide(slide.id, { fitColor })}
        />
      </Field>
    </div>
  );
}

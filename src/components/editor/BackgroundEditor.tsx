"use client";

import { useT } from "@/i18n/useT";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useProject } from "@/store/useProject";
import { styleFor } from "@/store/slideStyles";
import type { Fill, Slide } from "@/types";

import { ColorInput, Field, SelectField } from "@/components/shared/form";

type Mode = "template" | "solid" | "gradient";

const FALLBACK_COLOR_1 = "#6D28D9";
const FALLBACK_COLOR_2 = "#1E1B4B";

export function BackgroundEditor({ slide, templateId }: { slide: Slide; templateId: string }) {
  const { t } = useT();
  const modes = [
    { value: "template", label: t("bg.template") },
    { value: "solid", label: t("bg.solid") },
    { value: "gradient", label: t("bg.gradient") },
  ];
  const { setSlideStyle, clearSlideStyle, applyBackgroundToAll } = useProject();
  const fill = styleFor(slide, templateId).background;
  const mode: Mode = fill ? fill.type : "template";
  const color1 = fill?.type === "solid" ? fill.color : (fill?.stops[0] ?? FALLBACK_COLOR_1);
  const color2 = fill?.type === "gradient" ? fill.stops[1] : FALLBACK_COLOR_2;

  const setFill = (next: Fill) => setSlideStyle(slide.id, templateId, { background: next });

  function changeMode(next: string) {
    if (next === "template") clearSlideStyle(slide.id, templateId, "background");
    else if (next === "solid") setFill({ type: "solid", color: color1 });
    else setFill({ type: "gradient", angle: 135, stops: [color1, color2] });
  }

  return (
    <div className="flex flex-col gap-2">
      <Field label={t("bg.label")}>
        <SelectField ariaLabel={t("bg.typeAria")} value={mode} options={modes} onChange={changeMode} />
      </Field>
      <p className="text-xs text-muted-foreground">{fill ? t("bg.hintCustom") : t("bg.hintDefault")}</p>
      {fill && (
        <div className="flex items-center gap-3">
          <ColorInput
            label={t("bg.color1")}
            value={color1}
            onChange={(c) =>
              setFill(fill.type === "solid" ? { type: "solid", color: c } : { ...fill, stops: [c, color2] })
            }
          />
          {fill.type === "gradient" && (
            <>
              <ColorInput
                label={t("bg.color2")}
                value={color2}
                onChange={(c) => setFill({ ...fill, stops: [color1, c] })}
              />
              <Slider
                aria-label={t("bg.angle")}
                min={0}
                max={360}
                value={[fill.angle]}
                onValueChange={(v) => setFill({ ...fill, angle: Array.isArray(v) ? v[0] : v })}
              />
            </>
          )}
          <Button variant="outline" size="sm" className="ms-auto" onClick={() => applyBackgroundToAll(fill)}>
            {t("bg.applyAll")}
          </Button>
        </div>
      )}
    </div>
  );
}

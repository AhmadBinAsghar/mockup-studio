"use client";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useProject } from "@/store/useProject";
import { styleFor } from "@/store/slideStyles";
import type { Fill, Slide } from "@/types";

import { ColorInput, Field, SelectField } from "@/components/shared/form";

type Mode = "template" | "solid" | "gradient";

const MODES = [
  { value: "template", label: "Template default" },
  { value: "solid", label: "Solid color" },
  { value: "gradient", label: "2-stop gradient" },
];

const FALLBACK_COLOR_1 = "#6D28D9";
const FALLBACK_COLOR_2 = "#1E1B4B";

export function BackgroundEditor({ slide, templateId }: { slide: Slide; templateId: string }) {
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
      <Field label="Background">
        <SelectField ariaLabel="Background type" value={mode} options={MODES} onChange={changeMode} />
      </Field>
      <p className="text-xs text-muted-foreground">
        {fill
          ? "Only this screenshot, in this design, uses this background. Other designs and other screenshots keep their own. Use Apply to all to copy it to every screenshot (in the design each one currently uses), or choose Template default to undo."
          : "Using the template's own background. Pick a color or gradient to replace it for this screenshot."}
      </p>
      {fill && (
        <div className="flex items-center gap-3">
          <ColorInput
            label="Color 1"
            value={color1}
            onChange={(c) =>
              setFill(fill.type === "solid" ? { type: "solid", color: c } : { ...fill, stops: [c, color2] })
            }
          />
          {fill.type === "gradient" && (
            <>
              <ColorInput
                label="Color 2"
                value={color2}
                onChange={(c) => setFill({ ...fill, stops: [color1, c] })}
              />
              <Slider
                aria-label="Gradient angle"
                min={0}
                max={360}
                value={[fill.angle]}
                onValueChange={(v) => setFill({ ...fill, angle: Array.isArray(v) ? v[0] : v })}
              />
            </>
          )}
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => applyBackgroundToAll(fill)}>
            Apply to all
          </Button>
        </div>
      )}
    </div>
  );
}

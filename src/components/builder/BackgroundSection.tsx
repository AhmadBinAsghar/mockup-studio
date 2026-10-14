"use client";

import type { Fill, Template } from "@/types";
import { setBackground } from "@/templates/builderModel";

import { SelectField } from "@/components/shared/form";

import { ColorRow, Section, SliderRow } from "./controls";

interface Props {
  draft: Template;
  brand: string;
  onChange: (draft: Template) => void;
}

const TYPES = [
  { value: "solid", label: "One color" },
  { value: "gradient", label: "Two-color gradient" },
];

export function BackgroundSection({ draft, brand, onChange }: Props) {
  const fill = draft.background;
  const first = fill.type === "solid" ? fill.color : fill.stops[0];
  const second = fill.type === "gradient" ? fill.stops[1] : "{brand-dark}";
  const set = (next: Fill) => onChange(setBackground(draft, next));

  return (
    <Section title="Background" hint="Shapes you add below can sit on top of the background.">
      <SelectField
        ariaLabel="Background type"
        value={fill.type}
        options={TYPES}
        onChange={(type) =>
          set(
            type === "solid"
              ? { type: "solid", color: first }
              : { type: "gradient", angle: 160, stops: [first, second] },
          )
        }
      />
      <ColorRow
        label="Color 1"
        value={first}
        brand={brand}
        onChange={(color) =>
          set(fill.type === "solid" ? { type: "solid", color } : { ...fill, stops: [color, second] })
        }
      />
      {fill.type === "gradient" && (
        <>
          <ColorRow
            label="Color 2"
            value={second}
            brand={brand}
            onChange={(color) => set({ ...fill, stops: [first, color] })}
          />
          <SliderRow
            label="Gradient angle"
            value={fill.angle}
            min={0}
            max={360}
            onChange={(angle) => set({ ...fill, angle })}
          />
        </>
      )}
    </Section>
  );
}

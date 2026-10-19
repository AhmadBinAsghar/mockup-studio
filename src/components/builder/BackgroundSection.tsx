"use client";

import { useT } from "@/i18n/useT";
import type { Fill, Template } from "@/types";
import { setBackground } from "@/templates/builderModel";

import { SelectField } from "@/components/shared/form";

import { ColorRow, Section, SliderRow } from "./controls";

interface Props {
  draft: Template;
  brand: string;
  onChange: (draft: Template) => void;
}

export function BackgroundSection({ draft, brand, onChange }: Props) {
  const { t } = useT();
  const types = [
    { value: "solid", label: t("bsec.bg.solid") },
    { value: "gradient", label: t("bsec.bg.gradient") },
  ];
  const fill = draft.background;
  const first = fill.type === "solid" ? fill.color : fill.stops[0];
  const second = fill.type === "gradient" ? fill.stops[1] : "{brand-dark}";
  const set = (next: Fill) => onChange(setBackground(draft, next));

  return (
    <Section title={t("bsec.bg.title")} hint={t("bsec.bg.hint")}>
      <SelectField
        ariaLabel={t("bg.typeAria")}
        value={fill.type}
        options={types}
        onChange={(type) =>
          set(
            type === "solid"
              ? { type: "solid", color: first }
              : { type: "gradient", angle: 160, stops: [first, second] },
          )
        }
      />
      <ColorRow
        label={t("bg.color1")}
        value={first}
        brand={brand}
        onChange={(color) =>
          set(fill.type === "solid" ? { type: "solid", color } : { ...fill, stops: [color, second] })
        }
      />
      {fill.type === "gradient" && (
        <>
          <ColorRow
            label={t("bg.color2")}
            value={second}
            brand={brand}
            onChange={(color) => set({ ...fill, stops: [first, color] })}
          />
          <SliderRow
            label={t("bg.angle")}
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

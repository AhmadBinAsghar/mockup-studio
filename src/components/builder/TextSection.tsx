"use client";

import { Button } from "@/components/ui/button";
import { patchLayer, setSubheadline, textIndex } from "@/templates/builderModel";
import type { Template, TextLayer } from "@/types";

import { ColorRow, Section, SliderRow, ToggleRow } from "./controls";

interface Props {
  draft: Template;
  brand: string;
  onChange: (draft: Template) => void;
}

const ALIGNS: Array<TextLayer["align"]> = ["left", "center", "right"];

export function TextSection({ draft, brand, onChange }: Props) {
  const headlineAt = textIndex(draft, "headline");
  const subAt = textIndex(draft, "subheadline");
  const headline = draft.layers[headlineAt] as TextLayer | undefined;
  const sub = draft.layers[subAt] as TextLayer | undefined;
  if (!headline) return null;

  const editHeadline = (patch: Partial<TextLayer>) => onChange(patchLayer(draft, headlineAt, patch));
  const editSub = (patch: Partial<TextLayer>) => onChange(patchLayer(draft, subAt, patch));

  return (
    <Section
      title="Headline"
      hint="Drag the headline and subtitle on the preview to place them. Wrap a word in [brackets] to highlight it with the accent color."
    >
      <SliderRow
        label="Size"
        value={headline.fontSize}
        min={3}
        max={12}
        step={0.1}
        onChange={(fontSize) => editHeadline({ fontSize })}
      />
      <SliderRow label="Width" value={headline.w} min={30} max={100} onChange={(w) => editHeadline({ w })} />
      <SliderRow
        label="Tilt"
        value={headline.rotate ?? 0}
        min={-15}
        max={15}
        onChange={(rotate) => editHeadline({ rotate })}
      />
      <div className="flex gap-1" role="group" aria-label="Headline alignment">
        {ALIGNS.map((align) => (
          <Button
            key={align}
            type="button"
            size="sm"
            variant={(headline.align ?? "center") === align ? "default" : "outline"}
            onClick={() => editHeadline({ align })}
          >
            {align}
          </Button>
        ))}
      </div>
      <ColorRow
        label="Text color"
        value={headline.color ?? "#FFFFFF"}
        brand={brand}
        onChange={(color) => editHeadline({ color })}
      />
      <ColorRow
        label="Highlight color"
        value={headline.accentColor ?? "{brand}"}
        brand={brand}
        onChange={(accentColor) => editHeadline({ accentColor })}
      />
      <div className="flex flex-wrap gap-4">
        <ToggleRow
          label="UPPERCASE"
          checked={headline.uppercase ?? false}
          onChange={(uppercase) => editHeadline({ uppercase })}
        />
        <ToggleRow
          label="Shadow"
          checked={headline.shadow ?? false}
          onChange={(shadow) => editHeadline({ shadow })}
        />
        <ToggleRow
          label="Outline"
          checked={Boolean(headline.stroke)}
          onChange={(on) => editHeadline({ stroke: on ? "#000000" : undefined })}
        />
        <ToggleRow
          label="Extra bold"
          checked={(headline.weight ?? 800) >= 800}
          onChange={(on) => editHeadline({ weight: on ? 800 : 600 })}
        />
      </div>
      {headline.stroke && (
        <ColorRow
          label="Outline color"
          value={headline.stroke}
          brand={brand}
          allowBrand={false}
          onChange={(stroke) => editHeadline({ stroke })}
        />
      )}
      <ToggleRow
        label="Show subtitle"
        checked={Boolean(sub)}
        onChange={(on) => onChange(setSubheadline(draft, on))}
      />
      {sub && (
        <>
          <SliderRow
            label="Subtitle size"
            value={sub.fontSize}
            min={2}
            max={7}
            step={0.1}
            onChange={(fontSize) => editSub({ fontSize })}
          />
          <ColorRow
            label="Subtitle color"
            value={sub.color ?? "#E5E7EB"}
            brand={brand}
            onChange={(color) => editSub({ color })}
          />
        </>
      )}
    </Section>
  );
}

"use client";

import { describeShape, patchLayer } from "@/templates/builderModel";
import type { ShapeFill, ShapeLayer, Template } from "@/types";

import { ColorRow, Section, SliderRow } from "./controls";

interface Props {
  draft: Template;
  brand: string;
  onChange: (draft: Template) => void;
  selected: number | null;
}

function firstColor(fill: ShapeFill | undefined): string {
  if (!fill) return "#FFFFFF";
  if (fill.type === "gradient") return fill.stops[0];
  return fill.color;
}

function withFirstColor(fill: ShapeFill, color: string): ShapeFill {
  if (fill.type === "gradient") return { ...fill, stops: [color, fill.stops[1]] };
  return { ...fill, color };
}

function withSecondColor(fill: ShapeFill, color: string): ShapeFill {
  return fill.type === "gradient" ? { ...fill, stops: [fill.stops[0], color] } : fill;
}

function ShapeRow({
  shape,
  brand,
  onEdit,
}: {
  shape: ShapeLayer;
  brand: string;
  onEdit: (patch: Partial<ShapeLayer>) => void;
}) {
  const flat = shape.shape !== "polygon";
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-muted/40 p-2">
      <div className="text-sm font-medium">{describeShape(shape)}</div>
      {shape.fill && (
        <ColorRow
          label="Color"
          value={firstColor(shape.fill)}
          brand={brand}
          onChange={(color) => onEdit({ fill: withFirstColor(shape.fill as ShapeFill, color) })}
        />
      )}
      {shape.fill?.type === "gradient" && (
        <ColorRow
          label="Second color"
          value={shape.fill.stops[1]}
          brand={brand}
          onChange={(color) => onEdit({ fill: withSecondColor(shape.fill as ShapeFill, color) })}
        />
      )}
      {shape.stroke && (
        <ColorRow
          label="Line color"
          value={shape.stroke}
          brand={brand}
          onChange={(stroke) => onEdit({ stroke })}
        />
      )}
      {flat && (
        <>
          <SliderRow label="Size" value={shape.w} min={4} max={160} onChange={(w) => onEdit({ w })} />
          <SliderRow
            label="Rotation"
            value={shape.rotate ?? 0}
            min={-90}
            max={90}
            onChange={(rotate) => onEdit({ rotate })}
          />
        </>
      )}
      <SliderRow
        label="Opacity"
        value={shape.opacity ?? 1}
        min={0.05}
        max={1}
        step={0.05}
        onChange={(opacity) => onEdit({ opacity })}
      />
    </div>
  );
}

export function ShapesSection({ draft, brand, onChange, selected }: Props) {
  const layer = selected === null ? undefined : draft.layers[selected];
  const shape = layer?.type === "shape" ? layer : undefined;
  return (
    <Section
      title="Decorations"
      hint="Add circles, glows, rings and bands with the Add buttons above the preview, then drag them into place."
    >
      {shape && selected !== null ? (
        <ShapeRow
          key={selected}
          shape={shape}
          brand={brand}
          onEdit={(patch) => onChange(patchLayer(draft, selected, patch))}
        />
      ) : (
        <p className="text-xs text-muted-foreground">
          Select a decoration on the preview to change its color, size and opacity.
        </p>
      )}
    </Section>
  );
}

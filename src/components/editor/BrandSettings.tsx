"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FONTS } from "@/renderer/fonts";
import { useProject } from "@/store/useProject";

import { ColorInput, Field, SelectField } from "@/components/shared/form";

const FONT_OPTIONS = FONTS.map((f) => ({ value: f.family, label: f.family }));

export function BrandSettings() {
  const { brand, setBrand } = useProject();
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Brand (applies to all slides)</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        <p className="col-span-2 text-xs text-muted-foreground">
          Your brand color is your app&apos;s main color. The General templates are built entirely from it
          (plus lighter, darker and matching shades), so changing it recolors them at once. The themed
          templates (Education, Food, Games and so on) keep their own palette unless you switch on the option
          below. The brand font is used for all text unless you pick a different font for one slide.
        </p>
        <Field label="Brand color">
          <ColorInput label="Brand color" value={brand.color} onChange={(color) => setBrand({ color })} />
        </Field>
        <Field label="Font">
          <SelectField
            ariaLabel="Brand font"
            value={brand.font}
            options={FONT_OPTIONS}
            onChange={(font) => setBrand({ font })}
          />
        </Field>
        <label className="col-span-2 flex items-start gap-2 text-sm">
          <Checkbox
            checked={brand.tint ?? false}
            onCheckedChange={(tint) => setBrand({ tint: tint === true })}
            aria-label="Match all templates to my brand color"
          />
          <span>
            Match all templates to my brand color
            <span className="block text-xs text-muted-foreground">
              Shifts the colors of every themed template to your brand color while keeping each design.
              Neutral colors such as white and black stay the same.
            </span>
          </span>
        </label>
      </CardContent>
    </Card>
  );
}

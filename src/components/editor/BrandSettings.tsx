"use client";

import { useT } from "@/i18n/useT";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FONTS } from "@/renderer/fonts";
import { useProject } from "@/store/useProject";

import { ColorInput, Field, SelectField } from "@/components/shared/form";

const FONT_OPTIONS = FONTS.map((f) => ({ value: f.family, label: f.family }));

export function BrandSettings() {
  const { t } = useT();
  const { brand, setBrand } = useProject();
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("brand.title")}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        <p className="col-span-2 text-xs text-muted-foreground">{t("brand.help")}</p>
        <Field label={t("brand.color")}>
          <ColorInput
            label={t("brand.color")}
            value={brand.color}
            onChange={(color) => setBrand({ color })}
          />
        </Field>
        <Field label={t("brand.font")}>
          <SelectField
            ariaLabel={t("brand.fontAria")}
            value={brand.font}
            options={FONT_OPTIONS}
            onChange={(font) => setBrand({ font })}
          />
        </Field>
        <label className="col-span-2 flex items-start gap-2 text-sm">
          <Checkbox
            checked={brand.tint ?? false}
            onCheckedChange={(tint) => setBrand({ tint: tint === true })}
            aria-label={t("brand.match")}
          />
          <span>
            {t("brand.match")}
            <span className="block text-xs text-muted-foreground">{t("brand.matchHint")}</span>
          </span>
        </label>
      </CardContent>
    </Card>
  );
}

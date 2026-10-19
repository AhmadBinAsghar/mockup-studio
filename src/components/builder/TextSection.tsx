"use client";

import { useT } from "@/i18n/useT";
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
  const { t } = useT();
  const headlineAt = textIndex(draft, "headline");
  const subAt = textIndex(draft, "subheadline");
  const headline = draft.layers[headlineAt] as TextLayer | undefined;
  const sub = draft.layers[subAt] as TextLayer | undefined;
  if (!headline) return null;

  const editHeadline = (patch: Partial<TextLayer>) => onChange(patchLayer(draft, headlineAt, patch));
  const editSub = (patch: Partial<TextLayer>) => onChange(patchLayer(draft, subAt, patch));

  return (
    <Section title={t("bsec.text.title")} hint={t("bsec.text.hint")}>
      <SliderRow
        label={t("bsec.text.size")}
        value={headline.fontSize}
        min={3}
        max={12}
        step={0.1}
        onChange={(fontSize) => editHeadline({ fontSize })}
      />
      <SliderRow
        label={t("bsec.text.width")}
        value={headline.w}
        min={30}
        max={100}
        onChange={(w) => editHeadline({ w })}
      />
      <SliderRow
        label={t("bsec.text.tilt")}
        value={headline.rotate ?? 0}
        min={-15}
        max={15}
        onChange={(rotate) => editHeadline({ rotate })}
      />
      <div className="flex gap-1" role="group" aria-label={t("bsec.text.alignGroup")}>
        {ALIGNS.map((align) => (
          <Button
            key={align}
            type="button"
            size="sm"
            variant={(headline.align ?? "center") === align ? "default" : "outline"}
            onClick={() => editHeadline({ align })}
          >
            {t(`bsec.text.align.${align}`)}
          </Button>
        ))}
      </div>
      <ColorRow
        label={t("bsec.text.color")}
        value={headline.color ?? "#FFFFFF"}
        brand={brand}
        onChange={(color) => editHeadline({ color })}
      />
      <ColorRow
        label={t("bsec.text.highlight")}
        value={headline.accentColor ?? "{brand}"}
        brand={brand}
        onChange={(accentColor) => editHeadline({ accentColor })}
      />
      <div className="flex flex-wrap gap-4">
        <ToggleRow
          label={t("bsec.text.uppercase")}
          checked={headline.uppercase ?? false}
          onChange={(uppercase) => editHeadline({ uppercase })}
        />
        <ToggleRow
          label={t("bsec.text.shadow")}
          checked={headline.shadow ?? false}
          onChange={(shadow) => editHeadline({ shadow })}
        />
        <ToggleRow
          label={t("bsec.text.outline")}
          checked={Boolean(headline.stroke)}
          onChange={(on) => editHeadline({ stroke: on ? "#000000" : undefined })}
        />
        <ToggleRow
          label={t("bsec.text.bold")}
          checked={(headline.weight ?? 800) >= 800}
          onChange={(on) => editHeadline({ weight: on ? 800 : 600 })}
        />
      </div>
      {headline.stroke && (
        <ColorRow
          label={t("bsec.text.outlineColor")}
          value={headline.stroke}
          brand={brand}
          allowBrand={false}
          onChange={(stroke) => editHeadline({ stroke })}
        />
      )}
      <ToggleRow
        label={t("bsec.text.showSub")}
        checked={Boolean(sub)}
        onChange={(on) => onChange(setSubheadline(draft, on))}
      />
      {sub && (
        <>
          <SliderRow
            label={t("bsec.text.subSize")}
            value={sub.fontSize}
            min={2}
            max={7}
            step={0.1}
            onChange={(fontSize) => editSub({ fontSize })}
          />
          <ColorRow
            label={t("bsec.text.subColor")}
            value={sub.color ?? "#E5E7EB"}
            brand={brand}
            onChange={(color) => editSub({ color })}
          />
        </>
      )}
    </Section>
  );
}

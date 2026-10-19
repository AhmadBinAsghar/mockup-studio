"use client";

import { useT } from "@/i18n/useT";
import { patchLayer } from "@/templates/builderModel";
import type { DeviceLayer, FrameStyle, Template } from "@/types";

import { SelectField } from "@/components/shared/form";

import { ColorRow, Section, SliderRow, ToggleRow } from "./controls";

interface Props {
  draft: Template;
  brand: string;
  onChange: (draft: Template) => void;
  /** The layer selected on the canvas; when it is a phone, this panel edits that phone. */
  selected: number | null;
}

const FINISH_VALUES: FrameStyle[] = ["dark", "silver", "gold", "titanium", "white"];
const SOURCE_VALUES = ["self", "prev", "next"] as const;

export function PhoneSection({ draft, brand, onChange, selected }: Props) {
  const { t } = useT();
  const finishes = FINISH_VALUES.map((value) => ({ value, label: t(`bsec.phone.finish.${value}`) }));
  const sources = SOURCE_VALUES.map((value) => ({ value, label: t(`bsec.phone.source.${value}`) }));
  const layer = selected === null ? undefined : draft.layers[selected];
  const at = selected ?? -1;
  const phone = layer?.type === "device" ? layer : undefined;
  const edit = (patch: Partial<DeviceLayer>) => onChange(patchLayer(draft, at, patch));

  return (
    <Section title={t("bsec.phone.title")} hint={t("bsec.phone.hint")}>
      {!phone ? (
        <p className="text-xs text-muted-foreground">{t("bsec.phone.select")}</p>
      ) : (
        <>
          <SliderRow
            label={t("bsec.phone.size")}
            value={phone.w}
            min={20}
            max={110}
            onChange={(w) => edit({ w })}
          />
          <SliderRow
            label={t("bsec.phone.rotation")}
            value={phone.rotate ?? 0}
            min={-45}
            max={45}
            onChange={(rotate) => edit({ rotate })}
          />
          <SliderRow
            label={t("bsec.phone.tilt")}
            value={phone.skewY ?? 0}
            min={-25}
            max={25}
            onChange={(skewY) => edit({ skewY })}
          />
          <SliderRow
            label={t("bsec.phone.thickness")}
            value={phone.depth ?? 0}
            min={0}
            max={6}
            step={0.1}
            onChange={(depth) => edit({ depth })}
          />
          <SelectField
            ariaLabel={t("bsec.phone.finishAria")}
            value={phone.frameStyle ?? "dark"}
            options={finishes}
            onChange={(frameStyle) => edit({ frameStyle: frameStyle as FrameStyle })}
          />
          <SelectField
            ariaLabel={t("bsec.phone.sourceAria")}
            value={phone.show ?? "self"}
            options={sources}
            onChange={(show) => edit({ show: show as DeviceLayer["show"] })}
          />
          <div className="flex flex-wrap gap-4">
            <ToggleRow
              label={t("bsec.phone.shadow")}
              checked={phone.shadow ?? false}
              onChange={(shadow) => edit({ shadow })}
            />
            <ToggleRow
              label={t("bsec.phone.gloss")}
              checked={phone.gloss ?? false}
              onChange={(gloss) => edit({ gloss })}
            />
            <ToggleRow
              label={t("bsec.phone.neon")}
              checked={Boolean(phone.rim)}
              onChange={(on) => edit({ rim: on ? "{brand-pop}" : undefined })}
            />
            <ToggleRow
              label={t("bsec.phone.dim")}
              checked={(phone.dim ?? 0) > 0}
              onChange={(on) => edit({ dim: on ? 0.45 : 0 })}
            />
          </div>
          {phone.rim && (
            <ColorRow
              label={t("bsec.phone.edgeColor")}
              value={phone.rim}
              brand={brand}
              onChange={(rim) => edit({ rim })}
            />
          )}
        </>
      )}
      <ToggleRow
        label={t("bsec.phone.showFrame")}
        checked={draft.defaultFrame ?? true}
        onChange={(defaultFrame) => onChange({ ...draft, defaultFrame })}
      />
    </Section>
  );
}

"use client";

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

const FINISHES: Array<{ value: FrameStyle; label: string }> = [
  { value: "dark", label: "Black" },
  { value: "silver", label: "Silver" },
  { value: "gold", label: "Gold" },
  { value: "titanium", label: "Titanium" },
  { value: "white", label: "White" },
];

const SOURCES = [
  { value: "self", label: "This screenshot" },
  { value: "prev", label: "Previous screenshot" },
  { value: "next", label: "Next screenshot" },
];

export function PhoneSection({ draft, brand, onChange, selected }: Props) {
  const layer = selected === null ? undefined : draft.layers[selected];
  const at = selected ?? -1;
  const phone = layer?.type === "device" ? layer : undefined;
  const edit = (patch: Partial<DeviceLayer>) => onChange(patchLayer(draft, at, patch));

  return (
    <Section
      title="Phone"
      hint="Click a phone on the preview to select it, drag it to move it, and use its handles to resize or rotate it."
    >
      {!phone ? (
        <p className="text-xs text-muted-foreground">
          Select a phone on the preview to change its finish, tilt, thickness and which screenshot it shows.
        </p>
      ) : (
        <>
          <SliderRow label="Size" value={phone.w} min={20} max={110} onChange={(w) => edit({ w })} />
          <SliderRow
            label="Rotation"
            value={phone.rotate ?? 0}
            min={-45}
            max={45}
            onChange={(rotate) => edit({ rotate })}
          />
          <SliderRow
            label="3D tilt"
            value={phone.skewY ?? 0}
            min={-25}
            max={25}
            onChange={(skewY) => edit({ skewY })}
          />
          <SliderRow
            label="Thickness"
            value={phone.depth ?? 0}
            min={0}
            max={6}
            step={0.1}
            onChange={(depth) => edit({ depth })}
          />
          <SelectField
            ariaLabel="Phone finish"
            value={phone.frameStyle ?? "dark"}
            options={FINISHES}
            onChange={(frameStyle) => edit({ frameStyle: frameStyle as FrameStyle })}
          />
          <SelectField
            ariaLabel="Screenshot shown on this phone"
            value={phone.show ?? "self"}
            options={SOURCES}
            onChange={(show) => edit({ show: show as DeviceLayer["show"] })}
          />
          <div className="flex flex-wrap gap-4">
            <ToggleRow
              label="Shadow"
              checked={phone.shadow ?? false}
              onChange={(shadow) => edit({ shadow })}
            />
            <ToggleRow
              label="Glass shine"
              checked={phone.gloss ?? false}
              onChange={(gloss) => edit({ gloss })}
            />
            <ToggleRow
              label="Neon edge"
              checked={Boolean(phone.rim)}
              onChange={(on) => edit({ rim: on ? "{brand-pop}" : undefined })}
            />
            <ToggleRow
              label="Dim"
              checked={(phone.dim ?? 0) > 0}
              onChange={(on) => edit({ dim: on ? 0.45 : 0 })}
            />
          </div>
          {phone.rim && (
            <ColorRow label="Edge color" value={phone.rim} brand={brand} onChange={(rim) => edit({ rim })} />
          )}
        </>
      )}
      <ToggleRow
        label="Show device frame"
        checked={draft.defaultFrame ?? true}
        onChange={(defaultFrame) => onChange({ ...draft, defaultFrame })}
      />
    </Section>
  );
}

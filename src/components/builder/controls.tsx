"use client";

import type { ReactNode } from "react";

import { useT } from "@/i18n/useT";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { brandTokens } from "@/renderer/brand";

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}

export function SliderRow({ label, value, min, max, step = 1, onChange }: SliderRowProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs">
        <Label>{label}</Label>
        <span className="text-muted-foreground">{Math.round(value * 100) / 100}</span>
      </div>
      <Slider
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
      />
    </div>
  );
}

export function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox checked={checked} onCheckedChange={(next) => onChange(next === true)} aria-label={label} />
      {label}
    </label>
  );
}

const TOKEN_CHIPS = [
  { token: "{brand}", labelKey: "color.brand" },
  { token: "{brand-light}", labelKey: "color.light" },
  { token: "{brand-dark}", labelKey: "color.dark" },
  { token: "{brand-pop}", labelKey: "color.pop" },
];

function resolveColor(value: string, brand: string): string {
  const match = /^\{(brand[a-z-]*)\}$/.exec(value);
  const resolved = match ? brandTokens(brand)[match[1]] : value;
  return /^#[0-9a-f]{6}$/i.test(resolved ?? "") ? (resolved as string) : "#888888";
}

export function ColorRow({
  label,
  value,
  brand,
  onChange,
  allowBrand = true,
}: {
  label: string;
  value: string;
  brand: string;
  onChange: (value: string) => void;
  allowBrand?: boolean;
}) {
  const { t } = useT();
  const linked = value.startsWith("{brand");
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="w-24 shrink-0 text-xs">{label}</span>
      <input
        type="color"
        aria-label={label}
        value={resolveColor(value, brand)}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="h-7 w-10 cursor-pointer rounded-md border border-input bg-card p-0.5"
      />
      {allowBrand &&
        TOKEN_CHIPS.map((chip) => (
          <Button
            key={chip.token}
            type="button"
            size="xs"
            variant={value === chip.token ? "default" : "outline"}
            aria-label={t("color.chipAria", { label, shade: t(chip.labelKey) })}
            onClick={() => onChange(chip.token)}
          >
            {t(chip.labelKey)}
          </Button>
        ))}
      {linked && <span className="text-[10px] text-muted-foreground">{t("color.follows")}</span>}
    </div>
  );
}

export function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border p-3">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

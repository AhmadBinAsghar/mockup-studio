"use client";

import { useState } from "react";

import { useT } from "@/i18n/useT";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CUSTOM_MAX,
  CUSTOM_MIN,
  notStoreSizeNote,
  presetLabel,
  presetRules,
  presetsForStore,
  STORE_LABELS,
  validateCustomSize,
  type StoreId,
} from "@/config/storePresets";
import { isCustomNonStore } from "@/validation/checks";
import { useProject } from "@/store/useProject";

import { Notice } from "@/components/shared/form";

function StoreGroup({ store }: { store: StoreId }) {
  const { t } = useT();
  const { presetIds, togglePreset, setPresets } = useProject();
  const presets = presetsForStore(store);
  const ids = presets.map((p) => p.id);
  const allOn = ids.every((id) => presetIds.includes(id));
  const toggleAll = () =>
    setPresets(allOn ? presetIds.filter((id) => !ids.includes(id)) : [...new Set([...presetIds, ...ids])]);

  return (
    <Card size="sm">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{STORE_LABELS[store]}</CardTitle>
        <Button variant="ghost" size="sm" onClick={toggleAll}>
          {allOn ? t("targets.clearAll") : t("targets.selectAll")}
        </Button>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-3">
          {presets.map((p) => (
            <li key={p.id} className="flex items-start gap-2">
              <Checkbox
                id={p.id}
                className="mt-0.5"
                checked={presetIds.includes(p.id)}
                onCheckedChange={() => togglePreset(p.id)}
              />
              <Label htmlFor={p.id} className="flex flex-col items-start gap-0.5 font-normal">
                <span>
                  <span className="font-medium">{presetLabel(p)}</span>{" "}
                  <span className="text-muted-foreground">
                    {p.width} × {p.height}
                  </span>{" "}
                  {p.required && <Badge variant="secondary">{t("targets.required")}</Badge>}
                </span>
                <span className="text-xs text-muted-foreground">{presetRules(p)}</span>
              </Label>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function SizeInput({
  id,
  label,
  value,
  onChange,
  className,
  numeric = true,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  className: string;
  numeric?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        className={className}
        inputMode={numeric ? "numeric" : undefined}
        min={numeric ? CUSTOM_MIN : undefined}
        max={numeric ? CUSTOM_MAX : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function CustomSizes() {
  const { t } = useT();
  const { customSizes, addCustomSize, removeCustomSize } = useProject();
  const [width, setWidth] = useState("1600");
  const [height, setHeight] = useState("3200");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  function add() {
    const w = Number(width);
    const h = Number(height);
    const problem = validateCustomSize(w, h);
    setError(problem);
    if (problem) return;
    addCustomSize({ id: crypto.randomUUID(), width: w, height: h, label: label.trim() });
    setLabel("");
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("targets.customTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-2">
          <SizeInput
            id="custom-w"
            label={t("targets.width")}
            className="w-24"
            value={width}
            onChange={setWidth}
          />
          <SizeInput
            id="custom-h"
            label={t("targets.height")}
            className="w-24"
            value={height}
            onChange={setHeight}
          />
          <SizeInput
            id="custom-label"
            label={t("targets.labelOptional")}
            className="w-36"
            value={label}
            onChange={setLabel}
            numeric={false}
          />
          <Button variant="outline" onClick={add}>
            {t("targets.add")}
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <ul className="flex flex-col gap-2">
          {customSizes.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2 text-sm"
            >
              <span>
                {c.label && <strong>{c.label} </strong>}
                {c.width} × {c.height}
                {isCustomNonStore(c) && (
                  <span className="block text-xs text-sky-700 dark:text-sky-300">{notStoreSizeNote()}</span>
                )}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => removeCustomSize(c.id)}
              >
                {t("targets.remove")}
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function LandscapeToggle() {
  const { t } = useT();
  const { landscape, setLandscape } = useProject();
  return (
    <div className="flex items-center gap-2 rounded-xl border bg-card px-4 py-3">
      <Checkbox id="landscape" checked={landscape} onCheckedChange={(c) => setLandscape(c === true)} />
      <Label htmlFor="landscape" className="flex flex-col items-start gap-0.5 font-normal">
        <span className="font-medium">{t("targets.landscapeTitle")}</span>
        <span className="text-xs text-muted-foreground">{t("targets.landscapeHint")}</span>
      </Label>
    </div>
  );
}

export function StepTarget() {
  const { t } = useT();
  return (
    <div className="flex flex-col gap-4">
      <Notice tone="info">{t("targets.intro")}</Notice>
      <StoreGroup store="google-play" />
      <StoreGroup store="app-store" />
      <LandscapeToggle />
      <CustomSizes />
    </div>
  );
}

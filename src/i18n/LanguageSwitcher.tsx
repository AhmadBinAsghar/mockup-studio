"use client";

import { Languages } from "lucide-react";

import { SelectField } from "@/components/shared/form";

import { UI_LOCALES } from "./config";
import { setUiLocale } from "./store";
import { useT } from "./useT";

const OPTIONS = UI_LOCALES.map((l) => ({ value: l.code, label: l.name }));

export function LanguageSwitcher() {
  const { t, locale } = useT();
  return (
    <div className="flex items-center gap-1.5">
      <Languages className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <SelectField
        ariaLabel={t("language.label")}
        value={locale}
        options={OPTIONS}
        onChange={(code) => void setUiLocale(code)}
        className="w-32"
      />
    </div>
  );
}

"use client";

import { useT } from "@/i18n/useT";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULT_LOCALE, LOCALES, localeLabel } from "@/localization/locales";
import { useProject } from "@/store/useProject";

import { SelectField } from "@/components/shared/form";

export function LocalePanel() {
  const { t } = useT();
  const { locales, activeLocale, addLocale, removeLocale, setActiveLocale } = useProject();
  const available = LOCALES.filter((l) => !locales.includes(l.code));

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("langpanel.title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("langpanel.group")}>
          {locales.map((code) => (
            <Button
              key={code}
              size="sm"
              variant={code === activeLocale ? "default" : "outline"}
              aria-pressed={code === activeLocale}
              onClick={() => setActiveLocale(code)}
            >
              {localeLabel(code)}
              {code === DEFAULT_LOCALE && <Badge variant="secondary">{t("langpanel.default")}</Badge>}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {available.length > 0 && (
            <SelectField
              ariaLabel={t("langpanel.addAria")}
              placeholder={t("langpanel.addPlaceholder")}
              value=""
              options={available.map((l) => ({ value: l.code, label: localeLabel(l.code) }))}
              onChange={addLocale}
              className="w-48"
            />
          )}
          {activeLocale !== DEFAULT_LOCALE && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => removeLocale(activeLocale)}
            >
              {t("langpanel.remove", { language: localeLabel(activeLocale) })}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {locales.length > 1 ? t("langpanel.hintMulti") : t("langpanel.hintSingle")}
        </p>
      </CardContent>
    </Card>
  );
}

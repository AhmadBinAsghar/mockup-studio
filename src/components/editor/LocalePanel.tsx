"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULT_LOCALE, LOCALES, localeLabel } from "@/localization/locales";
import { useProject } from "@/store/useProject";

import { SelectField } from "@/components/shared/form";

export function LocalePanel() {
  const { locales, activeLocale, addLocale, removeLocale, setActiveLocale } = useProject();
  const available = LOCALES.filter((l) => !locales.includes(l.code));

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Languages</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Editing language">
          {locales.map((code) => (
            <Button
              key={code}
              size="sm"
              variant={code === activeLocale ? "default" : "outline"}
              aria-pressed={code === activeLocale}
              onClick={() => setActiveLocale(code)}
            >
              {localeLabel(code)}
              {code === DEFAULT_LOCALE && <Badge variant="secondary">default</Badge>}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {available.length > 0 && (
            <SelectField
              ariaLabel="Add language"
              placeholder="Add a language…"
              value=""
              options={available.map((l) => ({ value: l.code, label: l.label }))}
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
              Remove {localeLabel(activeLocale)}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {locales.length > 1
            ? "Headlines, subheadlines and bullets are edited per language. Export adds one folder per language (en/, es/, …)."
            : "Add a language to duplicate the set and swap the headlines. Export then adds one folder per language."}
        </p>
      </CardContent>
    </Card>
  );
}

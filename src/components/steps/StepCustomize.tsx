"use client";

import { useT } from "@/i18n/useT";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lintHeadline } from "@/validation/lint";
import { textFor, textPatch } from "@/localization/slideText";
import { joinCard, splitCard } from "@/renderer/callouts";
import { FONTS } from "@/renderer/fonts";
import { useProject } from "@/store/useProject";
import { styleFor } from "@/store/slideStyles";
import { useSlideTemplate } from "@/store/useTemplates";
import type { SlideText } from "@/types";

import { BackgroundEditor } from "@/components/editor/BackgroundEditor";
import { BrandSettings } from "@/components/editor/BrandSettings";
import { ColorInput, Field, Notice, SelectField } from "@/components/shared/form";
import { DevicePositionControls } from "@/components/editor/DevicePositionControls";
import { FitControls } from "@/components/editor/FitControls";
import { LocalePanel } from "@/components/editor/LocalePanel";

const BRAND_FONT = "brand";
const BULLET_COUNT = 3;

export function StepCustomize() {
  const { t } = useT();
  const {
    slides,
    selectedId,
    activeLocale,
    updateSlide,
    clearSlideField,
    setSlideStyle,
    clearSlideStyle,
    brand,
  } = useProject();
  const slide = slides.find((s) => s.id === selectedId) ?? slides[0];
  const template = useSlideTemplate(slide);
  if (!slide) return <p className="text-sm text-muted-foreground">{t("customize.uploadFirst")}</p>;

  const style = styleFor(slide, template.id);
  const text = textFor(slide, activeLocale);
  const frameOn = slide.deviceFrame ?? template.defaultFrame ?? true;
  const hasBullets = template.layers.some((l) => l.type === "bullets");
  const fontOptions = [
    { value: BRAND_FONT, label: t("customize.brandFont", { font: brand.font }) },
    ...FONTS.map((f) => ({ value: f.family, label: f.family })),
  ];
  const edit = (change: Partial<SlideText>) => updateSlide(slide.id, textPatch(slide, activeLocale, change));
  const cardIndexes = [
    ...new Set(template.layers.flatMap((l) => (l.type === "callout" ? [l.index] : []))),
  ].sort((a, b) => a - b);
  // Changing the title keeps the description (and the other way round); both live in one string.
  const setCard = (i: number, change: { title?: string; detail?: string }) => {
    const bullets = [...text.bullets];
    while (bullets.length <= i) bullets.push("");
    const current = splitCard(bullets[i] ?? "");
    bullets[i] = joinCard(change.title ?? current.title, change.detail ?? current.detail);
    edit({ bullets });
  };

  return (
    <div className="flex flex-col gap-4">
      <BrandSettings />
      <LocalePanel />
      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("customize.slide", { name: slide.name })}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Field label={t("customize.headlineField")}>
            <Input
              aria-label={t("customize.headline")}
              value={text.headline}
              onChange={(e) => edit({ headline: e.target.value })}
            />
          </Field>
          {lintHeadline(text.headline).map((m) => (
            <Notice key={m}>{m}</Notice>
          ))}
          <Field label={t("customize.subheadline")}>
            <Input
              aria-label={t("customize.subheadline")}
              value={text.subheadline}
              onChange={(e) => edit({ subheadline: e.target.value })}
            />
          </Field>
          {hasBullets &&
            Array.from({ length: BULLET_COUNT }, (_, i) => (
              <Field key={i} label={t("customize.bullet", { n: i + 1 })}>
                <Input
                  value={splitCard(text.bullets[i] ?? "").title}
                  onChange={(e) => setCard(i, { title: e.target.value })}
                />
              </Field>
            ))}
          {cardIndexes.length > 0 && (
            <div className="flex flex-col gap-3 rounded-lg border border-dashed p-3">
              <p className="text-xs text-muted-foreground">{t("customize.cardsHint")}</p>
              {cardIndexes.map((i) => {
                const card = splitCard(text.bullets[i] ?? "");
                return (
                  <div key={i} className="grid gap-2 sm:grid-cols-[2fr_3fr]">
                    <Field label={t("customize.cardTitle", { n: i + 1 })}>
                      <Input
                        aria-label={t("customize.cardTitle", { n: i + 1 })}
                        value={card.title}
                        maxLength={40}
                        onChange={(e) => setCard(i, { title: e.target.value })}
                      />
                    </Field>
                    <Field label={t("customize.cardDescription", { n: i + 1 })}>
                      <Input
                        aria-label={t("customize.cardDescription", { n: i + 1 })}
                        value={card.detail}
                        maxLength={90}
                        onChange={(e) => setCard(i, { detail: e.target.value })}
                      />
                    </Field>
                  </div>
                );
              })}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("customize.textColor")}>
              <div className="flex items-center gap-2">
                <ColorInput
                  label={t("customize.textColor")}
                  value={style.textColor ?? "#ffffff"}
                  onChange={(textColor) => setSlideStyle(slide.id, template.id, { textColor })}
                />
                <span className="text-xs text-muted-foreground">
                  {style.textColor ? t("customize.customOnly") : t("customize.templateDefault")}
                </span>
                {style.textColor && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => clearSlideStyle(slide.id, template.id, "textColor")}
                  >
                    {t("customize.reset")}
                  </Button>
                )}
              </div>
            </Field>
            <Field label={t("customize.font")}>
              <SelectField
                ariaLabel={t("customize.slideFont")}
                value={slide.font ?? BRAND_FONT}
                options={fontOptions}
                onChange={(v) =>
                  v === BRAND_FONT ? clearSlideField(slide.id, "font") : updateSlide(slide.id, { font: v })
                }
              />
            </Field>
          </div>
          <BackgroundEditor slide={slide} templateId={template.id} />
          <FitControls slide={slide} />
          <DevicePositionControls slide={slide} />
          <div className="flex items-center gap-2">
            <Checkbox
              id="device-frame"
              checked={frameOn}
              onCheckedChange={(checked) => updateSlide(slide.id, { deviceFrame: checked })}
            />
            <Label htmlFor="device-frame">{t("customize.deviceFrame")}</Label>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { lazy, Suspense, useEffect, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SITE_LINKS } from "@/config/site";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { useT } from "@/i18n/useT";
import { CUSTOMIZE_STEP, STEPS, stepIndexOf } from "@/config/steps";
import { useProject } from "@/store/useProject";
import { useProjects } from "@/store/useProjects";
import { furthestStep } from "@/validation/steps";

import { ProjectSwitcher } from "./ProjectSwitcher";
import { ThemeToggle } from "./ThemeToggle";

const Preview = lazy(() => import("@/components/preview/Preview").then((m) => ({ default: m.Preview })));

const LAST_STEP = STEPS.length - 1;

function PreviewPlaceholder({ text }: { text?: string }) {
  return (
    <div className="flex min-h-64 items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
      {text}
    </div>
  );
}

export function Wizard({ children }: { children: ReactNode }) {
  const { t } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const { slides, customSizes, presetIds, templateId, customizeVisited, markCustomizeVisited, hydrated } =
    useProject();

  useEffect(() => {
    void useProjects.getState().init();
  }, []);

  const step = stepIndexOf(pathname);
  const allowed = furthestStep({
    slideCount: slides.length,
    targetCount: presetIds.length + customSizes.length,
    templateChosen:
      slides.length > 0 && slides.every((s) => s.templateId !== undefined || templateId !== null),
    customizeDone: customizeVisited && slides.every((s) => s.headline.trim() !== ""),
  });
  const blocked = step > allowed;

  useEffect(() => {
    if (hydrated && !blocked && step === CUSTOMIZE_STEP) markCustomizeVisited();
  }, [hydrated, blocked, step, markCustomizeVisited]);

  useEffect(() => {
    if (hydrated && blocked) router.replace(STEPS[allowed].path);
  }, [hydrated, blocked, allowed, router]);

  const loading = blocked;
  const ready = hydrated && !blocked;

  const go = (index: number) => router.push(STEPS[index].path);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 p-4 lg:p-6">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-extrabold">Mockup Studio</h1>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ProjectSwitcher />
            <ThemeToggle />
          </div>
        </div>
        <nav aria-label={t("wizard.steps")}>
          <ol className="flex flex-wrap gap-2">
            {STEPS.map((s, i) => (
              <li key={s.path}>
                <Button
                  variant={i === step ? "default" : "outline"}
                  size="sm"
                  disabled={i > allowed}
                  aria-current={i === step ? "step" : undefined}
                  onClick={() => go(i)}
                >
                  {i + 1}. {t(s.titleKey)}
                </Button>
              </li>
            ))}
          </ol>
        </nav>
      </header>
      <div className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <Card>
          <CardContent className="flex flex-col gap-5">
            {loading ? <p className="py-8 text-sm text-muted-foreground">{t("wizard.loading")}</p> : children}
            <div className="flex justify-between">
              <Button variant="outline" disabled={!ready || step <= 0} onClick={() => go(step - 1)}>
                {t("wizard.back")}
              </Button>
              {step < LAST_STEP && (
                <Button disabled={!ready || step + 1 > allowed} onClick={() => go(step + 1)}>
                  {t("wizard.next")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="lg:sticky lg:top-4 lg:self-start" aria-label={t("wizard.livePreview")}>
          <CardContent>
            {ready && slides.length > 0 ? (
              <Suspense fallback={<PreviewPlaceholder />}>
                <Preview />
              </Suspense>
            ) : (
              <PreviewPlaceholder text={ready ? t("wizard.previewEmpty") : undefined} />
            )}
          </CardContent>
        </Card>
      </div>
      <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {SITE_LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="hover:text-foreground hover:underline">
            {t(l.labelKey)}
          </Link>
        ))}
      </footer>
    </div>
  );
}

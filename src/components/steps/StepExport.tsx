"use client";

import { useState } from "react";

import { useT } from "@/i18n/useT";
import { tRich } from "@/i18n/rich";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { exportZip } from "@/export/exportZip";
import { lintHeadline } from "@/validation/lint";
import { buildExportSets } from "@/localization/slideText";
import { buildOutputs } from "@/export/outputs";
import { aspectWarnings, slideCountWarnings } from "@/validation/checks";
import { countImages } from "@/renderer/pipeline";
import { useProject } from "@/store/useProject";
import { useActiveTemplate, useAllTemplates } from "@/store/useTemplates";

import { Notice } from "@/components/shared/form";

export function StepExport() {
  const tr = useT();
  const { t, tn } = tr;
  const { slides, presetIds, customSizes, landscape, locales, brand } = useProject();
  const template = useActiveTemplate();
  const allTemplates = useAllTemplates();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const outputs = buildOutputs({ presetIds, customSizes, landscape });
  const sets = buildExportSets(slides, locales);
  const total = countImages({ sets, outputs });
  const warnings = [
    ...slideCountWarnings(slides.length, presetIds),
    ...slides.flatMap((s) => aspectWarnings(s, outputs)),
    ...sets.flatMap((set) =>
      set.slides.flatMap((s) => lintHeadline(s.headline).map((m) => `${set.prefix}${s.name}: ${m}`)),
    ),
  ];
  const usedIds = new Set(slides.map((s) => s.templateId));
  const usedTemplates = allTemplates.filter((t) => usedIds.has(t.id));
  const busy = progress !== null && !finished && !error;

  async function run() {
    setError(null);
    setFinished(false);
    setProgress({ done: 0, total });
    try {
      await exportZip({ sets, template, templates: usedTemplates, brand, outputs }, (done, t) =>
        setProgress({ done, total: t }),
      );
      setFinished(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("export.failed"));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm">
        {tRich(
          tr,
          "export.formula",
          { strong: (text) => <strong>{text}</strong> },
          {
            parts: [
              tn("export.slides", slides.length),
              tn("export.sizes", outputs.length),
              ...(locales.length > 1 ? [tn("export.languages", locales.length)] : []),
            ].join(" × "),
            total,
          },
        )}
      </p>
      <ul className="text-xs text-muted-foreground">
        {outputs.map((o) => (
          <li key={o.folder}>
            <code>{o.folder}/</code> {o.width} × {o.height}
            {o.singleImage && ` ${t("export.firstOnly")}`}
          </li>
        ))}
      </ul>
      {warnings.map((w) => (
        <Notice key={w}>{w}</Notice>
      ))}
      <Button size="lg" className="h-10" onClick={run} disabled={busy || total === 0}>
        {busy ? t("export.generating") : t("export.generate")}
      </Button>
      {progress && (
        <Progress
          value={(progress.done / Math.max(progress.total, 1)) * 100}
          aria-label={t("export.progressAria")}
        >
          <span className="text-xs text-muted-foreground">
            {t("export.progress", { done: progress.done, total: progress.total })}
          </span>
        </Progress>
      )}
      {finished && <Notice tone="info">{t("export.done")}</Notice>}
      {error && <Notice>{error}</Notice>}
    </div>
  );
}

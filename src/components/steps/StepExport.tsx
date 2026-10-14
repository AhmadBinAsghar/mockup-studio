"use client";

import { useState } from "react";

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
      setError(e instanceof Error ? e.message : "Export failed");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm">
        {slides.length} slide{slides.length === 1 ? "" : "s"} × {outputs.length} size
        {outputs.length === 1 ? "" : "s"}
        {locales.length > 1 && ` × ${locales.length} languages`} = <strong>{total} images</strong>
      </p>
      <ul className="text-xs text-muted-foreground">
        {outputs.map((o) => (
          <li key={o.folder}>
            <code>{o.folder}/</code> {o.width} × {o.height}
            {o.singleImage && " (first slide only)"}
          </li>
        ))}
      </ul>
      {warnings.map((w) => (
        <Notice key={w}>{w}</Notice>
      ))}
      <Button size="lg" className="h-10" onClick={run} disabled={busy || total === 0}>
        {busy ? "Generating…" : "Generate & download ZIP"}
      </Button>
      {progress && (
        <Progress value={(progress.done / Math.max(progress.total, 1)) * 100} aria-label="Export progress">
          <span className="text-xs text-muted-foreground">
            {progress.done} / {progress.total} images
          </span>
        </Progress>
      )}
      {finished && <Notice tone="info">Done. Your ZIP has been downloaded.</Notice>}
      {error && <Notice>{error}</Notice>}
    </div>
  );
}

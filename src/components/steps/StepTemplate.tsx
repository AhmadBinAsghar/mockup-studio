"use client";

import { Pencil, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { JsonImportDialog } from "@/components/builder/JsonImportDialog";
import { TemplateBuilder, type BuilderSession } from "@/components/builder/TemplateBuilder";
import { CategoryList } from "@/components/templates/CategoryList";
import { SlideTargetPicker, type TemplateTarget } from "@/components/templates/SlideTargetPicker";
import { TemplateGrid } from "@/components/templates/TemplateGrid";
import { Button } from "@/components/ui/button";
import { neighborsOf } from "@/lib/neighbors";
import { localizeSlide } from "@/localization/slideText";
import { useProject } from "@/store/useProject";
import { useAllTemplates } from "@/store/useTemplates";
import { CATEGORIES, categoryOf } from "@/templates/categories";
import { pickTemplate } from "@/templates";
import type { Template, TemplateCategoryId } from "@/types";

export function StepTemplate() {
  const {
    slides,
    templateId,
    customTemplates,
    brand,
    activeLocale,
    setTemplate,
    setSlideTemplate,
    deleteCustomTemplate,
    saveCustomTemplate,
    select,
  } = useProject();
  const templates = useAllTemplates();
  const [target, setTarget] = useState<TemplateTarget>("all");
  const [pickedCategory, setPickedCategory] = useState<TemplateCategoryId | null>(null);
  const [builder, setBuilder] = useState<BuilderSession | null>(null);
  const [jsonImportOpen, setJsonImportOpen] = useState(false);

  const targetSlide = slides.find((s) => s.id === target);
  const first = slides[0];
  const previewSlide = useMemo(
    () => (first ? localizeSlide(targetSlide ?? first, activeLocale) : null),
    [first, targetSlide, activeLocale],
  );

  if (!first || !previewSlide)
    return <p className="text-sm text-muted-foreground">Upload a screenshot first to preview templates.</p>;

  const neighbors = neighborsOf(slides, slides.indexOf(targetSlide ?? first));
  const current = pickTemplate(targetSlide, templateId, customTemplates);
  const activeCategory = pickedCategory ?? categoryOf(current);
  const categories = CATEGORIES.map((c) => ({
    ...c,
    count: templates.filter((t) => categoryOf(t) === c.id).length,
  })).filter((c) => c.count > 0 || c.id !== "custom");
  const inCategory = templates.filter((t) => categoryOf(t) === activeCategory);

  const appliesTo = targetSlide
    ? `screenshot ${slides.indexOf(targetSlide) + 1} only`
    : slides.length > 1
      ? "all screenshots"
      : "your screenshot";

  const chooseTarget = (next: TemplateTarget) => {
    setTarget(next);
    if (next !== "all") select(next);
  };

  const pick = (id: string) => (targetSlide ? setSlideTemplate(targetSlide.id, id) : setTemplate(id));

  const saveFromBuilder = (template: Template) => {
    saveCustomTemplate(template);
    pick(template.id);
    setPickedCategory("custom");
    setBuilder(null);
  };

  /** Called when the user confirms a template imported from the JSON dialog. */
  const saveFromImport = (template: Template) => {
    saveCustomTemplate(template);
    pick(template.id);
    setPickedCategory("custom");
  };

  return (
    <div className="flex flex-col gap-4">
      <SlideTargetPicker target={target} onTarget={chooseTarget} />

      {/* ── Custom template actions — shown prominently at the top ── */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3">
        <span className="mr-1 text-xs font-medium text-muted-foreground">Custom templates:</span>

        {/* Edit the currently-selected template */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          onClick={() =>
            setBuilder({
              source: current,
              name: current.name,
              editingId: current.custom ? current.id : undefined,
              appliesTo,
            })
          }
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit: {current.name}
        </Button>

        {/* Generate via AI / paste JSON */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 border-violet-300 text-violet-700 hover:border-violet-400 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-300 dark:hover:bg-violet-950/40"
          onClick={() => setJsonImportOpen(true)}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Create with AI / JSON
        </Button>
      </div>

      {/* ── Category sidebar + template grid ── */}
      <div className="grid gap-4 md:grid-cols-[11rem_minmax(0,1fr)]">
        <CategoryList categories={categories} active={activeCategory} onSelect={setPickedCategory} />
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            {CATEGORIES.find((c) => c.id === activeCategory)?.description}
          </p>
          <TemplateGrid
            templates={inCategory}
            selectedId={current.id}
            previewSlide={previewSlide}
            prev={neighbors.prev}
            next={neighbors.next}
            slideCount={slides.length}
            brand={brand}
            onPick={pick}
            onDelete={deleteCustomTemplate}
            onEdit={(t) => setBuilder({ source: t, name: t.name, editingId: t.id, appliesTo })}
          />
        </div>
      </div>

      {/* ── Dialogs ── */}
      <TemplateBuilder session={builder} onClose={() => setBuilder(null)} onSave={saveFromBuilder} />

      <JsonImportDialog
        open={jsonImportOpen}
        onClose={() => setJsonImportOpen(false)}
        onConfirm={saveFromImport}
      />
    </div>
  );
}

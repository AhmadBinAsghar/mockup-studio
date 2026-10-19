"use client";

import { Check, ClipboardCopy, Feather, LayoutGrid, Sparkles, Wand2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { useT } from "@/i18n/useT";
import { tRich } from "@/i18n/rich";
import { SlideCanvas } from "@/components/preview/SlideCanvas";
import { Notice } from "@/components/shared/form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { neighborsOf } from "@/lib/neighbors";
import { localizeSlide } from "@/localization/slideText";
import { useProject } from "@/store/useProject";
import { parseTemplateJson, TEMPLATES } from "@/templates";
import { findLookalike, lookalikeMessage } from "@/templates/similarity";
import {
  collectExistingTemplateInfo,
  generateMasterPrompt,
  type PromptStyle,
} from "@/templates/masterPrompt";
import { finishTemplate, startDraft } from "@/templates/builderModel";
import type { Template } from "@/types";

// ─── preview size options ────────────────────────────────────────────────────
const PREVIEW_SIZES = [
  { id: "phone", labelKey: "ai.size.phone", width: 1080, height: 1920, kind: "phone" as const },
  { id: "tablet", labelKey: "ai.size.tablet", width: 1440, height: 2560, kind: "tablet" as const },
  { id: "feature", labelKey: "ai.size.feature", width: 1024, height: 500, kind: "phone" as const },
] as const;

// ─── style picker config ─────────────────────────────────────────────────────
const STYLE_OPTIONS: {
  value: PromptStyle;
  labelKey: string;
  subKey: string;
  icon: React.ReactNode;
  activeClass: string;
  hoverClass: string;
}[] = [
  {
    value: "wow",
    labelKey: "ai.style.wow.label",
    subKey: "ai.style.wow.sub",
    icon: <Wand2 className="h-4 w-4" />,
    activeClass:
      "border-orange-400 bg-orange-50 text-orange-900 dark:border-orange-500 dark:bg-orange-950/40 dark:text-orange-200",
    hoverClass:
      "border-orange-200 hover:border-orange-300 hover:bg-orange-50/60 dark:border-orange-800/50 dark:hover:border-orange-600",
  },
  {
    value: "simple",
    labelKey: "ai.style.simple.label",
    subKey: "ai.style.simple.sub",
    icon: <Feather className="h-4 w-4" />,
    activeClass:
      "border-sky-400 bg-sky-50 text-sky-900 dark:border-sky-500 dark:bg-sky-950/40 dark:text-sky-200",
    hoverClass:
      "border-sky-200 hover:border-sky-300 hover:bg-sky-50/60 dark:border-sky-800/50 dark:hover:border-sky-600",
  },
  {
    value: "cards",
    labelKey: "ai.style.cards.label",
    subKey: "ai.style.cards.sub",
    icon: <LayoutGrid className="h-4 w-4" />,
    activeClass:
      "border-emerald-400 bg-emerald-50 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-200",
    hoverClass:
      "border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50/60 dark:border-emerald-800/50 dark:hover:border-emerald-600",
  },
];

// ─── component ───────────────────────────────────────────────────────────────
interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (template: Template) => void;
}

type Stage = "paste" | "preview";

export function JsonImportDialog({ open, onClose, onConfirm }: Props) {
  const tr = useT();
  const { t } = tr;
  const { slides, selectedId, brand, activeLocale, customTemplates } = useProject();

  const [json, setJson] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [parsed, setParsed] = useState<Template | null>(null);
  const [stage, setStage] = useState<Stage>("paste");
  const [copied, setCopied] = useState<PromptStyle | null>(null);
  const [previewSize, setPreviewSize] = useState<(typeof PREVIEW_SIZES)[number]["id"]>("phone");

  const promptInfo = useMemo(() => collectExistingTemplateInfo(customTemplates), [customTemplates]);

  // Resolved template + slide for preview
  const previewTemplate = useMemo(
    () => (parsed ? finishTemplate(startDraft(parsed), "import-preview", parsed.name) : null),
    [parsed],
  );
  const slideIndex = Math.max(
    0,
    slides.findIndex((s) => s.id === selectedId),
  );
  const rawSlide = slides[slideIndex];
  const localSlide = useMemo(
    () => (rawSlide ? localizeSlide(rawSlide, activeLocale) : null),
    [rawSlide, activeLocale],
  );
  const lookalike = useMemo(
    () =>
      parsed
        ? findLookalike(
            parsed,
            [...TEMPLATES, ...customTemplates].filter((t) => t.id !== parsed.id),
          )
        : null,
    [parsed, customTemplates],
  );
  const neighbors = neighborsOf(slides, slideIndex);
  const size = PREVIEW_SIZES.find((s) => s.id === previewSize) ?? PREVIEW_SIZES[0];

  // ── helpers ────────────────────────────────────────────────────────────────
  function handleClose() {
    setJson("");
    setErrors([]);
    setParsed(null);
    setStage("paste");
    setCopied(null);
    setPreviewSize("phone");
    onClose();
  }

  function copyPrompt(style: PromptStyle) {
    // A fresh seed per click builds a new design, checked against every existing template.
    const prompt = generateMasterPrompt({
      ...promptInfo,
      style,
      seed: crypto.getRandomValues(new Uint32Array(1))[0],
    });
    void navigator.clipboard.writeText(prompt).then(() => {
      setCopied(style);
      setTimeout(() => setCopied(null), 2500);
    });
  }

  const tryParse = useCallback((value: string) => {
    if (!value.trim()) {
      setErrors([]);
      setParsed(null);
      return;
    }
    // Strip ```json fences if user pastes raw AI output
    const stripped = value
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();
    const result = parseTemplateJson(stripped);
    if (result.template) {
      setErrors([]);
      setParsed(result.template);
    } else {
      setErrors(result.errors);
      setParsed(null);
    }
  }, []);

  function handleJsonChange(value: string) {
    setJson(value);
    tryParse(value);
  }

  function handleConfirm() {
    if (!parsed) return;
    onConfirm(parsed);
    handleClose();
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-500" />
            {t("ai.title")}
          </DialogTitle>
          <DialogDescription>{t("ai.description")}</DialogDescription>
        </DialogHeader>

        {/* ══════════════════ STAGE 1 — paste ══════════════════ */}
        {stage === "paste" && (
          <div className="flex flex-col gap-5">
            {/* Step 1 — style picker */}
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold">{t("ai.step1")}</p>

              {/* Style cards */}
              <div className="grid gap-3 sm:grid-cols-3">
                {STYLE_OPTIONS.map((opt) => {
                  const isActive = copied === opt.value;
                  return (
                    <div
                      key={opt.value}
                      className={cn(
                        "flex flex-col gap-2 rounded-xl border p-3 transition-colors",
                        isActive ? opt.activeClass : opt.hoverClass,
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 font-semibold text-sm">
                          {opt.icon}
                          {t(opt.labelKey)}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 shrink-0 gap-1 px-2 text-xs"
                          onClick={() => copyPrompt(opt.value)}
                        >
                          {copied === opt.value ? (
                            <>
                              <Check className="h-3 w-3 text-green-600" /> {t("ai.copied")}
                            </>
                          ) : (
                            <>
                              <ClipboardCopy className="h-3 w-3" /> {t("ai.copy")}
                            </>
                          )}
                        </Button>
                      </div>
                      <p className="text-xs leading-relaxed opacity-65">{t(opt.subKey)}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">{t("ai.divider")}</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Step 2 — JSON textarea */}
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold">{t("ai.step2")}</p>
              <p className="text-xs text-muted-foreground">
                {tRich(tr, "ai.fenceHint", {
                  code: (text) => <code className="rounded bg-muted px-1 py-0.5 text-[10px]">{text}</code>,
                })}
              </p>
              <Textarea
                aria-label={t("builder.jsonAria")}
                placeholder={t("ai.placeholder")}
                className="h-52 font-mono text-xs"
                spellCheck={false}
                value={json}
                onChange={(e) => handleJsonChange(e.target.value)}
              />
              {errors.map((e) => (
                <Notice key={e}>{e}</Notice>
              ))}
              {lookalike && <Notice>{lookalikeMessage(lookalike)}</Notice>}
              {parsed && <Notice tone="info">{t("ai.valid", { name: parsed.name })}</Notice>}
            </div>
          </div>
        )}

        {/* ══════════════════ STAGE 2 — preview ══════════════════ */}
        {stage === "preview" && parsed && previewTemplate && localSlide && (
          <div className="flex flex-col gap-4">
            <Notice tone="info">{t("ai.previewing", { name: parsed.name })}</Notice>

            {/* Size toggle */}
            <div className="flex justify-center gap-1">
              {PREVIEW_SIZES.map((s) => (
                <Button
                  key={s.id}
                  variant={previewSize === s.id ? "default" : "outline"}
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={() => setPreviewSize(s.id)}
                >
                  {t(s.labelKey)}
                </Button>
              ))}
            </div>

            {/* Canvas — constrained so it never overflows the dialog */}
            <div className="flex justify-center">
              <SlideCanvas
                slide={localSlide}
                prev={neighbors.prev}
                next={neighbors.next}
                template={previewTemplate}
                brand={brand}
                width={size.width}
                height={size.height}
                kind={size.kind}
                index={slideIndex}
                count={slides.length}
                renderWidth={360}
                className="max-h-[58vh] w-auto max-w-full rounded-lg shadow-lg"
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <DialogFooter className="flex-wrap gap-2 sm:flex-nowrap">
          <Button variant="outline" onClick={handleClose}>
            {t("ai.cancel")}
          </Button>

          {stage === "paste" && (
            <Button disabled={!parsed} onClick={() => setStage("preview")}>
              {t("ai.previewBtn")}
            </Button>
          )}

          {stage === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStage("paste")}>
                {t("ai.backBtn")}
              </Button>
              <Button onClick={handleConfirm}>{t("ai.use")}</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import type { KeyboardEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getTemplate, parseTemplateJson } from "@/templates";
import { CATEGORIES, categoryOf } from "@/templates/categories";
import { finishTemplate, startDraft } from "@/templates/builderModel";
import { useProject } from "@/store/useProject";
import { useAllTemplates } from "@/store/useTemplates";
import type { Template } from "@/types";

import { Field, Notice, SelectField } from "@/components/shared/form";

import { BackgroundSection } from "./BackgroundSection";
import { BuilderPreview } from "./BuilderPreview";
import { useDraftHistory } from "./draftHistory";
import { PhoneSection } from "./PhoneSection";
import { ShapesSection } from "./ShapesSection";
import { TextSection } from "./TextSection";

export interface BuilderSession {
  source: Template;
  name: string;
  editingId?: string;
  appliesTo: string;
}

interface Props {
  session: BuilderSession | null;
  onClose: () => void;
  onSave: (template: Template) => void;
}

function BuilderBody({ session, onClose, onSave }: { session: BuilderSession } & Omit<Props, "session">) {
  const brand = useProject((s) => s.brand.color);
  const customTemplates = useProject((s) => s.customTemplates);
  const templates = useAllTemplates();
  const {
    draft,
    set: setDraft,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useDraftHistory(() => startDraft(session.source));
  const [pickedLayer, setPickedLayer] = useState<number | null>(null);
  // The selection is an index into the layers, so drop it if the layer is gone (delete, undo…).
  const selected = pickedLayer !== null && pickedLayer < draft.layers.length ? pickedLayer : null;
  const [name, setName] = useState(session.name);
  const [json, setJson] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const labelOf = (t: Template) => `${CATEGORIES.find((c) => c.id === categoryOf(t))?.label} · ${t.name}`;

  function save() {
    if (!name.trim()) return setErrors(["Give the template a name."]);
    const id = session.editingId ?? `custom-${Date.now()}`;
    onSave(finishTemplate(draft, id, name.trim()));
  }

  function applyJson() {
    const parsed = parseTemplateJson(json);
    if (!parsed.template) return setErrors(parsed.errors);
    setErrors([]);
    setPickedLayer(null);
    setDraft(startDraft(parsed.template));
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!(e.ctrlKey || e.metaKey)) return;
    // Leave Ctrl+Z alone while typing in a field, where it undoes the text instead.
    if ((e.target as HTMLElement).closest("input, textarea, select, [contenteditable='true']")) return;
    const key = e.key.toLowerCase();
    if (key === "z") {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    } else if (key === "y") {
      e.preventDefault();
      redo();
    }
  }

  return (
    <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-5xl" onKeyDown={onKeyDown}>
      <DialogHeader>
        <DialogTitle>{session.editingId ? "Edit your template" : "Create your template"}</DialogTitle>
        <DialogDescription>
          Start from any design, then click and drag things right on the preview. Your screenshots are never
          changed, only this template. When you save, it is applied to {session.appliesTo}.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="flex flex-col gap-3">
          <Field label="Template name">
            <Input aria-label="Template name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Start from">
            <SelectField
              ariaLabel="Start from template"
              value={session.source.id}
              options={templates.map((t) => ({ value: t.id, label: labelOf(t) }))}
              onChange={(id) => {
                setPickedLayer(null);
                setDraft(startDraft(getTemplate(id, customTemplates)));
              }}
            />
          </Field>
          <Tabs
            defaultValue="design"
            onValueChange={(v) => v === "json" && setJson(JSON.stringify(draft, null, 2))}
          >
            <TabsList>
              <TabsTrigger value="design">Design</TabsTrigger>
              <TabsTrigger value="json">Advanced (JSON)</TabsTrigger>
            </TabsList>
            <TabsContent value="design" className="flex flex-col gap-3">
              <BackgroundSection draft={draft} brand={brand} onChange={setDraft} />
              <TextSection draft={draft} brand={brand} onChange={setDraft} />
              <PhoneSection draft={draft} brand={brand} onChange={setDraft} selected={selected} />
              <ShapesSection draft={draft} brand={brand} onChange={setDraft} selected={selected} />
            </TabsContent>
            <TabsContent value="json" className="flex flex-col gap-2">
              <Textarea
                aria-label="Template JSON"
                className="h-80 font-mono text-xs"
                spellCheck={false}
                value={json}
                onChange={(e) => setJson(e.target.value)}
              />
              <Button type="button" variant="outline" onClick={applyJson}>
                Apply JSON to the design
              </Button>
            </TabsContent>
          </Tabs>
        </div>
        <div className="md:sticky md:top-0 md:self-start">
          <BuilderPreview
            draft={draft}
            name={name}
            selected={selected}
            onSelect={setPickedLayer}
            onChange={setDraft}
            history={{ undo, redo, canUndo, canRedo }}
          />
        </div>
      </div>
      {errors.map((e) => (
        <Notice key={e}>{e}</Notice>
      ))}
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={save}>Save template</Button>
      </DialogFooter>
    </DialogContent>
  );
}

export function TemplateBuilder({ session, onClose, onSave }: Props) {
  return (
    <Dialog open={session !== null} onOpenChange={(open) => !open && onClose()}>
      {session && <BuilderBody session={session} onClose={onClose} onSave={onSave} />}
    </Dialog>
  );
}

"use client";

import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { rectSortingStrategy, SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";

import { readImageFile } from "@/lib/imageCache";
import { MAX_SLIDES, useProject } from "@/store/useProject";
import type { Slide } from "@/types";

import { Button } from "@/components/ui/button";
import { Notice } from "@/components/shared/form";

import { RemoveLastScreenshotDialog } from "./RemoveLastScreenshotDialog";

function Thumb({ slide, onDelete }: { slide: Slide; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: slide.id });
  const imgRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const u = URL.createObjectURL(slide.blob);
    img.src = u;
    return () => URL.revokeObjectURL(u);
  }, [slide.blob]);
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="relative aspect-[9/16] overflow-hidden rounded-lg border border-border bg-muted"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        alt={slide.name}
        className="h-full w-full cursor-grab touch-none object-cover"
        {...attributes}
        {...listeners}
      />
      <Button
        variant="destructive"
        size="icon-xs"
        aria-label={`Delete ${slide.name}`}
        onClick={onDelete}
        className="absolute right-1 top-1 bg-black/70 text-white hover:bg-destructive"
      >
        ✕
      </Button>
    </li>
  );
}

export function StepUpload() {
  const project = useProject();
  const ready = useProject((s) => s.hydrated);
  const { slides, addSlides, removeSlide, moveSlide } = project;
  const [confirmingLast, setConfirmingLast] = useState<string | null>(null);
  const [summary, setSummary] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    disabled: !ready,
    accept: { "image/png": [".png"], "image/jpeg": [".jpg", ".jpeg"] },
    onDrop: async (files, rejected) => {
      setError(rejected.length ? "Only PNG or JPG files are accepted." : null);
      const room = MAX_SLIDES - slides.length;
      if (files.length > room) setError(`You can add up to ${MAX_SLIDES} screenshots.`);
      const accepted = files.slice(0, Math.max(room, 0));
      const sizes = await Promise.all(accepted.map(readImageFile));
      const added: Slide[] = accepted.map((file, i) => {
        const { width, height } = sizes[i];
        return {
          id: crypto.randomUUID(),
          name: file.name,
          blob: file,
          width,
          height,
          headline: "Your headline here",
          subheadline: "Say what makes this screen great",
          bullets: [
            "Fast and simple|Open it and get going in seconds",
            "Works offline|No connection needed, anywhere",
            "Private by design|Your data stays on your device",
          ],
        };
      });
      if (added.length) addSlides(added);
    },
  });

  async function askToRemoveLast(id: string) {
    const { summarizeProject } = await import("@/store/projectSummary");
    setSummary(summarizeProject(useProject.getState()));
    setConfirmingLast(id);
  }

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const ids = slides.map((s) => s.id);
    const from = ids.indexOf(String(e.active.id));
    const to = ids.indexOf(String(e.over.id));
    moveSlide(from, to);
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        {...getRootProps()}
        data-ready={ready}
        className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed p-8 text-center transition ${
          isDragActive ? "border-primary bg-accent" : "border-input hover:border-ring"
        }`}
      >
        <input {...getInputProps()} aria-label="Upload screenshots" />
        <p className="font-semibold">Drop 1–{MAX_SLIDES} screenshots here</p>
        <p className="text-sm text-muted-foreground">
          PNG or JPG, or click to browse. Files never leave your browser.
        </p>
      </div>
      {error && <Notice>{error}</Notice>}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={slides.map((s) => s.id)} strategy={rectSortingStrategy}>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {slides.map((s) => (
              <Thumb
                key={s.id}
                slide={s}
                onDelete={() => (slides.length === 1 ? askToRemoveLast(s.id) : removeSlide(s.id))}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      {slides.length > 1 && <p className="text-xs text-muted-foreground">Drag a thumbnail to reorder.</p>}
      <RemoveLastScreenshotDialog
        open={confirmingLast !== null}
        contents={summary}
        onCancel={() => setConfirmingLast(null)}
        onConfirm={() => {
          if (confirmingLast) removeSlide(confirmingLast);
          setConfirmingLast(null);
        }}
      />
    </div>
  );
}

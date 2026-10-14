"use client";

import { BringToFront, Copy, RotateCw, SendToBack, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RenderReport } from "@/renderer/renderSlide";
import {
  canDeleteLayer,
  canDuplicateLayer,
  deleteLayer,
  duplicateLayer,
  layerLabel,
  patchLayer,
  reorderLayer,
} from "@/templates/builderModel";
import type { Layer, Template } from "@/types";

import {
  boxAfter,
  handlesFor,
  hitTest,
  isBackdropLayer,
  moveBy,
  rotationFor,
  scaleBy,
  snapMove,
  translateBox,
  widthBy,
  type Box,
  type Guide,
  type HandleKind,
  type Patch,
} from "./canvasMath";

interface Props {
  draft: Template;
  report: RenderReport | null;
  selected: number | null;
  onSelect: (index: number | null) => void;
  onChange: (draft: Template) => void;
}

type DragKind = "move" | HandleKind;

interface Drag {
  kind: DragKind;
  index: number;
  startX: number;
  startY: number;
  layer: Layer;
  box: Box;
  draft: Template;
  /** Canvas pixels per screen pixel. */
  scale: number;
  /** Center of the layer on screen. */
  cx: number;
  cy: number;
  startDist: number;
  others: Box[];
}

interface Live {
  index: number;
  box: Box;
  guides: Guide[];
}

const SNAP_SCREEN_PX = 6;
const NUDGE = 0.5;
const NUDGE_BIG = 2;

const rotationOf = (layer: Layer) => (layer.type === "bullets" ? 0 : (layer.rotate ?? 0));
const percent = (value: number, total: number) => `${(value / total) * 100}%`;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const HANDLE = "absolute z-10 size-3 rounded-[3px] border border-sky-500 bg-white shadow-sm touch-none";

function boxStyle(layer: Layer, box: Box, size: { width: number; height: number }): CSSProperties {
  return {
    left: percent(box.x, size.width),
    top: percent(box.y, size.height),
    width: percent(box.w, size.width),
    height: percent(box.h, size.height),
    transform: rotationOf(layer) ? `rotate(${rotationOf(layer)}deg)` : undefined,
  };
}

/**
 * A transparent layer on top of the live preview. Click an item to select it (the click lands on
 * what is really drawn under the pointer, so rings, bands and the halves of a cut phone behave),
 * drag it to move it, pull its handles to resize or rotate it, and use the ✕ to delete it. It works
 * from the boxes the renderer reports, so it always lines up with what is drawn.
 */
export function CanvasOverlay({ draft, report, selected, onSelect, onChange }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const frame = useRef(0);
  const pending = useRef<{ patch: Patch; live: Live } | null>(null);
  const [live, setLive] = useState<Live | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  // A report from before the last add/delete describes different layers, so ignore it until the
  // preview has redrawn.
  const current = report && report.boxes.length === draft.layers.length ? report : null;
  if (!current) return <div ref={wrapRef} className="absolute inset-0" />;
  const size = current.canvas;
  const boxOf = (index: number): Box | null => current.boxes[index] ?? null;

  function toCanvas(e: PointerEvent<HTMLElement>) {
    const rect = wrapRef.current!.getBoundingClientRect();
    const scale = size.width / rect.width;
    return { x: (e.clientX - rect.left) * scale, y: (e.clientY - rect.top) * scale, scale, rect };
  }

  function flush() {
    frame.current = 0;
    const next = pending.current;
    const drag = dragRef.current;
    if (!next || !drag) return;
    pending.current = null;
    onChange(patchLayer(drag.draft, drag.index, next.patch));
    setLive(next.live);
  }

  function begin(e: PointerEvent<HTMLElement>, index: number, kind: DragKind) {
    const box = boxOf(index);
    const wrap = wrapRef.current;
    if (!box || !wrap) return;
    e.stopPropagation();
    e.preventDefault();
    wrap.focus({ preventScroll: true });
    onSelect(index);
    const { scale, rect } = toCanvas(e);
    const cx = rect.left + (box.x + box.w / 2) / scale;
    const cy = rect.top + (box.y + box.h / 2) / scale;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      kind,
      index,
      startX: e.clientX,
      startY: e.clientY,
      layer: draft.layers[index],
      box,
      draft,
      scale,
      cx,
      cy,
      startDist: Math.max(1, Math.hypot(e.clientX - cx, e.clientY - cy)),
      others: current!.boxes.flatMap((b, i) =>
        b && i !== index && !isBackdropLayer(draft.layers[i], b, size) ? [b] : [],
      ),
    };
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    const { x, y } = toCanvas(e);
    const hit = hitTest(draft.layers, current!.boxes, { x, y }, size, selected);
    if (hit === null) {
      onSelect(null);
      return;
    }
    begin(e, hit, "move");
  }

  function drag(e: PointerEvent<HTMLElement>) {
    const d = dragRef.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) * d.scale;
    const dy = (e.clientY - d.startY) * d.scale;
    let patch: Patch;
    let box = d.box;
    let guides: Guide[] = [];
    if (d.kind === "move") {
      let mx = dx;
      let my = dy;
      if (!e.altKey) {
        const snap = snapMove(translateBox(d.box, dx, dy), d.others, size, SNAP_SCREEN_PX * d.scale);
        mx += snap.dx;
        my += snap.dy;
        guides = snap.guides;
      }
      patch = moveBy(d.layer, d.box, mx, my, size);
      box = boxAfter("move", d.box, { dx: mx, dy: my, s: 1 });
    } else if (d.kind === "scale") {
      const s = clamp(Math.hypot(e.clientX - d.cx, e.clientY - d.cy) / d.startDist, 0.1, 8);
      patch = scaleBy(d.layer, d.box, s, size);
      box = boxAfter("scale", d.box, { dx: 0, dy: 0, s });
    } else if (d.kind === "left" || d.kind === "right") {
      const rad = (rotationOf(d.layer) * Math.PI) / 180;
      const along =
        ((e.clientX - d.startX) * Math.cos(rad) + (e.clientY - d.startY) * Math.sin(rad)) * d.scale;
      patch = widthBy(d.layer, d.kind, along, size);
      box = boxAfter(d.kind, d.box, { dx: along, dy: 0, s: 1 });
    } else {
      const degrees = (Math.atan2(e.clientY - d.cy, e.clientX - d.cx) * 180) / Math.PI + 90;
      patch = rotationFor(d.layer, degrees, e.shiftKey);
    }
    pending.current = { patch, live: { index: d.index, box, guides } };
    if (!frame.current) frame.current = requestAnimationFrame(flush);
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (dragRef.current) {
      drag(e);
      return;
    }
    // Not dragging: outline whatever a click would pick.
    const { x, y } = toCanvas(e);
    const over = hitTest(draft.layers, current!.boxes, { x, y }, size, selected);
    if (over !== hover) setHover(over);
  }

  function end() {
    if (!dragRef.current) return;
    if (frame.current) cancelAnimationFrame(frame.current);
    flush();
    dragRef.current = null;
    setLive(null);
  }

  function remove(index: number) {
    onChange(deleteLayer(draft, index));
    onSelect(null);
  }

  function duplicate(index: number) {
    const copy = duplicateLayer(draft, index);
    if (!copy) return;
    onChange(copy.draft);
    onSelect(copy.index);
  }

  function reorder(index: number, step: 1 | -1) {
    const moved = reorderLayer(draft, index, step);
    onChange(moved.draft);
    onSelect(moved.index);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (selected === null) return;
    const layer = draft.layers[selected];
    const box = boxOf(selected);
    if (!layer) return;
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      if (canDeleteLayer(draft, selected)) remove(selected);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
      e.preventDefault();
      duplicate(selected);
      return;
    }
    const arrows: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const step = arrows[e.key];
    if (!step || !box) return;
    e.preventDefault();
    const px = ((e.shiftKey ? NUDGE_BIG : NUDGE) / 100) * size.width;
    onChange(patchLayer(draft, selected, moveBy(layer, box, step[0] * px, step[1] * px, size)));
  }

  const selectedLayer = selected === null ? null : draft.layers[selected];
  const selectedBox = selected === null ? null : (live?.box ?? boxOf(selected));
  const hoverBox = hover !== null && hover !== selected && !live ? boxOf(hover) : null;
  const toolbarBelow = selectedBox ? selectedBox.y + selectedBox.h < size.height * 0.9 : true;
  const toolbarX = selectedBox
    ? clamp(selectedBox.x + selectedBox.w / 2, size.width * 0.18, size.width * 0.82)
    : 0;
  const handles = selectedLayer ? handlesFor(selectedLayer) : [];

  return (
    <div
      ref={wrapRef}
      tabIndex={0}
      role="application"
      aria-label="Template canvas. Click an item to select it, drag to move it, arrow keys to nudge, Delete to remove."
      className={cn("absolute inset-0 touch-none outline-none", hover !== null && "cursor-pointer")}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onPointerLeave={() => setHover(null)}
      onKeyDown={onKeyDown}
    >
      {hoverBox && hover !== null && (
        <div
          className="pointer-events-none absolute border border-sky-400/80"
          style={boxStyle(draft.layers[hover], hoverBox, size)}
        />
      )}

      {selected !== null && selectedLayer && selectedBox && (
        <div
          role="button"
          aria-label={layerLabel(draft, selected)}
          aria-pressed="true"
          className="absolute"
          style={{
            ...boxStyle(selectedLayer, selectedBox, size),
            minWidth: 14,
            minHeight: 14,
            zIndex: 1000,
          }}
        >
          <div className="pointer-events-none absolute inset-0 border-2 border-dashed border-sky-500" />
          {handles.includes("scale") &&
            (
              [
                "-left-1.5 -top-1.5",
                "-right-1.5 -top-1.5",
                "-left-1.5 -bottom-1.5",
                "-right-1.5 -bottom-1.5",
              ] as const
            ).map((position) => (
              <div
                key={position}
                aria-label={selectedLayer.type === "text" ? "Resize text" : "Resize"}
                className={cn(HANDLE, position, "cursor-nwse-resize")}
                onPointerDown={(e) => begin(e, selected, "scale")}
              />
            ))}
          {handles.includes("left") && (
            <div
              aria-label="Make narrower or wider (left edge)"
              className={cn(HANDLE, "-left-1.5 top-1/2 h-5 w-2.5 -translate-y-1/2 cursor-ew-resize")}
              onPointerDown={(e) => begin(e, selected, "left")}
            />
          )}
          {handles.includes("right") && (
            <div
              aria-label="Make narrower or wider (right edge)"
              className={cn(HANDLE, "-right-1.5 top-1/2 h-5 w-2.5 -translate-y-1/2 cursor-ew-resize")}
              onPointerDown={(e) => begin(e, selected, "right")}
            />
          )}
          {handles.includes("rotate") && (
            <>
              <div className="pointer-events-none absolute -top-6 left-1/2 h-6 w-px -translate-x-1/2 bg-sky-500" />
              <div
                aria-label="Rotate (hold Shift to snap)"
                className="absolute -top-9 left-1/2 z-10 flex size-5 -translate-x-1/2 cursor-grab touch-none items-center justify-center rounded-full border border-sky-500 bg-white text-sky-600 shadow-sm"
                onPointerDown={(e) => begin(e, selected, "rotate")}
              >
                <RotateCw className="size-3" />
              </div>
            </>
          )}
          {canDeleteLayer(draft, selected) && (
            <button
              type="button"
              aria-label={`Delete ${layerLabel(draft, selected)}`}
              className="absolute -right-3 -top-3 z-20 flex size-5 items-center justify-center rounded-full bg-red-500 text-white shadow-md ring-2 ring-white hover:bg-red-600"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => remove(selected)}
            >
              <X className="size-3" strokeWidth={3} />
            </button>
          )}
        </div>
      )}

      {live?.guides.map((guide) => (
        <div
          key={`${guide.axis}-${guide.at}`}
          className="pointer-events-none absolute z-[1500] bg-pink-500/80"
          style={
            guide.axis === "x"
              ? { left: percent(guide.at, size.width), top: 0, bottom: 0, width: 1 }
              : { top: percent(guide.at, size.height), left: 0, right: 0, height: 1 }
          }
        />
      ))}

      {selected !== null && selectedBox && selectedLayer && !live && (
        <div
          className="absolute z-[2000] flex items-center gap-0.5 rounded-lg border bg-popover p-0.5 text-popover-foreground shadow-md"
          style={{
            left: percent(toolbarX, size.width),
            top: percent(toolbarBelow ? selectedBox.y + selectedBox.h : selectedBox.y, size.height),
            transform: `translate(-50%, ${toolbarBelow ? "14px" : "calc(-100% - 40px)"})`,
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <span className="whitespace-nowrap px-1.5 text-[11px] text-muted-foreground">
            {layerLabel(draft, selected)}
          </span>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            aria-label="Send backward"
            title="Send backward"
            disabled={selected === 0}
            onClick={() => reorder(selected, -1)}
          >
            <SendToBack />
          </Button>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            aria-label="Bring forward"
            title="Bring forward"
            disabled={selected === draft.layers.length - 1}
            onClick={() => reorder(selected, 1)}
          >
            <BringToFront />
          </Button>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            aria-label="Duplicate"
            title="Duplicate (Ctrl+D)"
            disabled={!canDuplicateLayer(draft, selected)}
            onClick={() => duplicate(selected)}
          >
            <Copy />
          </Button>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            aria-label="Delete"
            title="Delete (Del)"
            className="text-destructive"
            disabled={!canDeleteLayer(draft, selected)}
            onClick={() => remove(selected)}
          >
            <Trash2 />
          </Button>
        </div>
      )}
    </div>
  );
}

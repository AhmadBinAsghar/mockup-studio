import { cutPolygon } from "@/renderer/cuts";
import type { Layer } from "@/types";

/**
 * Pure geometry for the drag-on-canvas editor. Everything here works in *canvas pixels* (the
 * pixels the preview was rendered at) and turns them back into template units: x / w / fontSize
 * are percent of canvas width, y is percent of width too (percent of height for shapes that set
 * yUnit: "height").
 */

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CanvasSize {
  width: number;
  height: number;
}

export type Patch = Partial<Layer>;
export type HandleKind = "scale" | "left" | "right" | "rotate";
export interface Guide {
  axis: "x" | "y";
  /** Pixel position of the guide line. */
  at: number;
}

const round = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function handlesFor(layer: Layer): HandleKind[] {
  switch (layer.type) {
    case "text":
      return ["left", "right", "scale", "rotate"];
    case "callout":
      return ["left", "right", "rotate"];
    case "bullets":
      return ["left", "right"];
    case "device":
      return ["scale", "rotate"];
    case "shape":
      return layer.shape === "polygon" ? ["scale"] : ["scale", "rotate"];
  }
}

/** Pixels that make up 100 units of vertical position for this layer. */
function verticalUnit(layer: Layer, c: CanvasSize): number {
  return layer.type === "shape" && layer.yUnit === "height" ? c.height : c.width;
}

export function translateBox(box: Box, dx: number, dy: number): Box {
  return { ...box, x: box.x + dx, y: box.y + dy };
}

export function scaleBox(box: Box, s: number): Box {
  const w = box.w * s;
  const h = box.h * s;
  return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h };
}

/** A box covering most of the canvas is a backdrop (big glow, background band), not a click target. */
export function isBackdrop(box: Box, c: CanvasSize): boolean {
  return box.w * box.h > 0.5 * c.width * c.height;
}

/** Moves a layer by a pixel distance. `box` is where the layer is drawn right now. */
export function moveBy(layer: Layer, box: Box, dx: number, dy: number, c: CanvasSize): Patch {
  const ux = (dx / c.width) * 100;
  const uy = (dy / verticalUnit(layer, c)) * 100;
  if (layer.type === "shape" && layer.shape === "polygon" && layer.points) {
    return { points: layer.points.map(([x, y]): [number, number] => [round(x + ux), round(y + uy)]) };
  }
  if (layer.type === "device") {
    // A phone that is not allowed to bleed gets shrunk by the renderer to fit above the bottom
    // edge. Dragging should move it rigidly, so start from the size it is drawn at.
    return {
      bleed: true,
      x: round((box.x / c.width) * 100 + ux),
      y: round((box.y / c.width) * 100 + uy),
      w: round((box.w / c.width) * 100),
    };
  }
  if (layer.type === "text") {
    if (layer.anchor === "bottom") return { x: round(layer.x + ux), y: round(layer.y - uy) };
    // "stackBelow" makes y a small gap under the headline. Dragging turns it into a free position.
    if (layer.stackBelow) {
      return { stackBelow: undefined, x: round(layer.x + ux), y: round(((box.y + dy) / c.width) * 100) };
    }
  }
  return { x: round(layer.x + ux), y: round(layer.y + uy) };
}

/** Scales a layer about its own center by `s` (1 = unchanged). Text scales its font size instead. */
export function scaleBy(layer: Layer, box: Box, s: number, c: CanvasSize): Patch {
  const next = scaleBox(box, s);
  const uy = verticalUnit(layer, c);
  if (layer.type === "text") return { fontSize: round(clamp(layer.fontSize * s, 1, 40)) };
  if (layer.type === "device") {
    const aspect = box.w / box.h;
    const w = clamp((box.w / c.width) * 100 * s, 12, 250);
    const cx = ((box.x + box.w / 2) / c.width) * 100;
    const cy = ((box.y + box.h / 2) / c.width) * 100;
    return { bleed: true, x: round(cx - w / 2), y: round(cy - w / aspect / 2), w: round(w) };
  }
  if (layer.type === "shape" && layer.shape === "polygon" && layer.points) {
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    const points = layer.points.map(([px, py]): [number, number] => {
      const x = (px / 100) * c.width;
      const y = (py / 100) * uy;
      return [round(((cx + (x - cx) * s) / c.width) * 100), round(((cy + (y - cy) * s) / uy) * 100)];
    });
    return { points };
  }
  if (layer.type === "shape") {
    const patch: Patch = {
      x: round((next.x / c.width) * 100),
      y: round((next.y / uy) * 100),
      w: round(Math.max(2, (next.w / c.width) * 100)),
    };
    if (layer.h !== undefined) (patch as { h: number }).h = round(Math.max(2, (next.h / uy) * 100));
    return patch;
  }
  return {};
}

/** Resizes the width of a text block, card or list by dragging its left or right edge. */
export function widthBy(layer: Layer, side: "left" | "right", dx: number, c: CanvasSize): Patch {
  if (layer.type !== "text" && layer.type !== "callout" && layer.type !== "bullets") return {};
  const u = (dx / c.width) * 100;
  const min = 8;
  if (side === "right") return { w: round(Math.max(min, layer.w + u)) };
  const w = Math.max(min, layer.w - u);
  return { x: round(layer.x + (layer.w - w)), w: round(w) };
}

/** Wraps an angle to -180..180 and limits it to what the layer allows. */
export function rotationFor(layer: Layer, degrees: number, snap: boolean): Patch {
  let deg = ((((degrees + 180) % 360) + 360) % 360) - 180;
  if (snap) deg = Math.round(deg / 15) * 15;
  if (layer.type === "callout") deg = clamp(deg, -45, 45);
  return { rotate: round(deg) } as Patch;
}

/** The box a drag is showing while the pointer moves (rotation is drawn separately). */
export function boxAfter(
  kind: "move" | "scale" | "left" | "right" | "rotate",
  box: Box,
  amount: { dx: number; dy: number; s: number },
): Box {
  switch (kind) {
    case "move":
      return translateBox(box, amount.dx, amount.dy);
    case "scale":
      return scaleBox(box, amount.s);
    case "right":
      return { ...box, w: Math.max(1, box.w + amount.dx) };
    case "left":
      return { ...box, x: box.x + Math.min(amount.dx, box.w - 1), w: Math.max(1, box.w - amount.dx) };
    default:
      return box;
  }
}

/**
 * Snaps a box that is being moved to the canvas edges and center and to the edges and centers of
 * the other layers. Returns the extra shift to apply and the guide lines to draw.
 */
export function snapMove(
  box: Box,
  others: Box[],
  c: CanvasSize,
  threshold: number,
): { dx: number; dy: number; guides: Guide[] } {
  const xs = [0, c.width / 2, c.width];
  const ys = [0, c.height / 2, c.height];
  for (const o of others) {
    xs.push(o.x, o.x + o.w / 2, o.x + o.w);
    ys.push(o.y, o.y + o.h / 2, o.y + o.h);
  }
  const pull = (edges: number[], lines: number[]) => {
    let best: { delta: number; at: number } | null = null;
    for (const edge of edges) {
      for (const line of lines) {
        const delta = line - edge;
        if (Math.abs(delta) <= threshold && (!best || Math.abs(delta) < Math.abs(best.delta))) {
          best = { delta, at: line };
        }
      }
    }
    return best;
  };
  const bx = pull([box.x, box.x + box.w / 2, box.x + box.w], xs);
  const by = pull([box.y, box.y + box.h / 2, box.y + box.h], ys);
  const guides: Guide[] = [];
  if (bx) guides.push({ axis: "x", at: bx.at });
  if (by) guides.push({ axis: "y", at: by.at });
  return { dx: bx?.delta ?? 0, dy: by?.delta ?? 0, guides };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hit testing: which layer is under the pointer?
// ─────────────────────────────────────────────────────────────────────────────

export interface Point {
  x: number;
  y: number;
}

const PHONE_RADIUS = 0.13;
const TABLET_RADIUS = 0.055;
/** How far (canvas pixels) from a ring's line still counts as a click on the ring. */
const RING_GRAB = 6;

/** Big soft shapes (glows, background bands) are backdrops: select them from the layers list. */
export function isBackdropLayer(layer: Layer, box: Box, c: CanvasSize): boolean {
  return layer.type === "shape" && isBackdrop(box, c);
}

/** Rotation (and, for phones, skew) a layer is drawn with, about the center of its box. */
function localPoint(layer: Layer, box: Box, p: Point): Point {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const rotate = layer.type === "bullets" ? 0 : (layer.rotate ?? 0);
  const skewX = layer.type === "device" ? (layer.skewX ?? 0) : 0;
  const skewY = layer.type === "device" ? (layer.skewY ?? 0) : 0;
  if (!rotate && !skewX && !skewY) return p;
  // The renderer draws: rotate, then skew (screen = center + R · S · (local - center)). Undo it.
  const cos = Math.cos(rad(rotate));
  const sin = Math.sin(rad(rotate));
  const tx = Math.tan(rad(skewX));
  const ty = Math.tan(rad(skewY));
  const a = cos - sin * ty;
  const b = cos * tx - sin;
  const cc = sin + cos * ty;
  const d = sin * tx + cos;
  const det = a * d - b * cc;
  const dx = p.x - cx;
  const dy = p.y - cy;
  return { x: cx + (d * dx - b * dy) / det, y: cy + (-cc * dx + a * dy) / det };
}

function insidePolygon(p: Point, polygon: Array<[number, number]>): boolean {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

const insideBox = (p: Point, b: Box) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;

/** Is the point on this layer as it is actually drawn (not just inside its rectangle)? */
export function hitsLayer(layer: Layer, box: Box, point: Point, c: CanvasSize): boolean {
  const p = localPoint(layer, box, point);
  if (layer.type === "shape") {
    if (layer.shape === "polygon" && layer.points) {
      const uy = layer.yUnit === "height" ? c.height : c.width;
      return insidePolygon(
        p,
        layer.points.map(([x, y]): [number, number] => [(x / 100) * c.width, (y / 100) * uy]),
      );
    }
    if (layer.shape === "circle") {
      const rx = box.w / 2;
      const ry = box.h / 2;
      const dist = Math.hypot((p.x - (box.x + rx)) / rx, (p.y - (box.y + ry)) / ry);
      if (layer.fill) return dist <= 1;
      // A ring is only there along its line.
      const grab = RING_GRAB / Math.min(rx, ry);
      return Math.abs(dist - 1) <= grab;
    }
    return insideBox(p, box);
  }
  if (layer.type === "device" && layer.cuts?.length) {
    const radius = (layer.frame === "tablet-generic" ? TABLET_RADIUS : PHONE_RADIUS) * box.w;
    return insidePolygon(
      p,
      cutPolygon(box, radius, layer.cuts).map(([x, y]): [number, number] => [x, y]),
    );
  }
  return insideBox(p, box);
}

/**
 * The layer a click at `point` lands on: the front-most one that is really drawn there. Backdrop
 * shapes are skipped. With `prefer`, that layer wins whenever the point is on it, so a selected
 * item can still be dragged when something transparent sits in front of it.
 */
export function hitTest(
  layers: Layer[],
  boxes: Array<Box | null>,
  point: Point,
  c: CanvasSize,
  prefer: number | null = null,
): number | null {
  if (prefer !== null) {
    const layer = layers[prefer];
    const box = boxes[prefer];
    if (layer && box && hitsLayer(layer, box, point, c)) return prefer;
  }
  for (let i = layers.length - 1; i >= 0; i--) {
    const box = boxes[i];
    if (!box || isBackdropLayer(layers[i], box, c)) continue;
    if (hitsLayer(layers[i], box, point, c)) return i;
  }
  return null;
}

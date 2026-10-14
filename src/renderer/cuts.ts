import type { DeviceCut } from "@/types";

import type { Ctx } from "./canvas";
import type { Rect } from "./frames";

export type Point = [number, number];

const CORNER_STEPS = 12;

export function roundedRectPoints(box: Rect, radius: number): Point[] {
  const r = Math.min(radius, box.w / 2, box.h / 2);
  const corners: Array<[number, number, number]> = [
    [box.x + box.w - r, box.y + r, -Math.PI / 2],
    [box.x + box.w - r, box.y + box.h - r, 0],
    [box.x + r, box.y + box.h - r, Math.PI / 2],
    [box.x + r, box.y + r, Math.PI],
  ];
  const points: Point[] = [];
  for (const [cx, cy, start] of corners) {
    for (let i = 0; i <= CORNER_STEPS; i++) {
      const angle = start + ((Math.PI / 2) * i) / CORNER_STEPS;
      points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
    }
  }
  return points;
}

function sideOf(p: Point, a: Point, b: Point): number {
  return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
}

function clipToHalfPlane(points: Point[], a: Point, b: Point, keep: DeviceCut["keep"]): Point[] {
  const sign = keep === "left" ? -1 : 1;
  const inside = (p: Point) => sign * sideOf(p, a, b) >= 0;
  const result: Point[] = [];
  points.forEach((current, i) => {
    const previous = points[(i + points.length - 1) % points.length];
    if (inside(current) !== inside(previous)) {
      const sp = sideOf(previous, a, b);
      const sc = sideOf(current, a, b);
      const t = sp / (sp - sc);
      result.push([
        previous[0] + (current[0] - previous[0]) * t,
        previous[1] + (current[1] - previous[1]) * t,
      ]);
    }
    if (inside(current)) result.push(current);
  });
  return result;
}

export function cutEnds(body: Rect, cut: DeviceCut): [Point, Point] {
  return [
    [body.x + cut.x1 * body.w, body.y + cut.y1 * body.h],
    [body.x + cut.x2 * body.w, body.y + cut.y2 * body.h],
  ];
}

export function cutPolygon(body: Rect, radius: number, cuts: DeviceCut[]): Point[] {
  let points = roundedRectPoints(body, radius);
  for (const cut of cuts) {
    const [a, b] = cutEnds(body, cut);
    points = clipToHalfPlane(points, a, b, cut.keep);
  }
  return points;
}

export function polygonPath(ctx: Ctx, points: Point[], dx = 0, dy = 0) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x + dx, y + dy) : ctx.lineTo(x + dx, y + dy)));
  ctx.closePath();
}

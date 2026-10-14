import type { ShapeFill } from "@/types";

import { hexToRgb, type Ctx } from "./canvas";
import type { Rect } from "./frames";

export function fillStyleFor(ctx: Ctx, fill: ShapeFill, box: Rect): string | CanvasGradient {
  if (fill.type === "solid") return fill.color;

  if (fill.type === "radial") {
    const rgb = hexToRgb(fill.color);
    if (!rgb) return fill.color;
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(box.w, box.h) / 2);
    g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},1)`);
    g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
    return g;
  }

  const a = (fill.angle * Math.PI) / 180;
  const dx = Math.sin(a);
  const dy = -Math.cos(a);
  const half = (Math.abs(box.w * dx) + Math.abs(box.h * dy)) / 2;
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const g = ctx.createLinearGradient(cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half);
  g.addColorStop(0, fill.stops[0]);
  g.addColorStop(1, fill.stops[1]);
  return g;
}

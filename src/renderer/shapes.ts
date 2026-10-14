import type { ShapeLayer } from "@/types";

import type { Ctx } from "./canvas";
import { fillStyleFor } from "./fills";
import { roundRectPath, type Rect } from "./frames";

function polygonBox(points: Array<[number, number]>): Rect {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

export function drawShape(ctx: Ctx, layer: ShapeLayer, W: number, H: number): Rect {
  const unitY = layer.yUnit === "height" ? H : W;
  const toX = (v: number) => (v / 100) * W;
  const toY = (v: number) => (v / 100) * unitY;

  const points = layer.points?.map(([x, y]): [number, number] => [toX(x), toY(y)]);
  const box: Rect =
    layer.shape === "polygon" && points
      ? polygonBox(points)
      : {
          x: toX(layer.x),
          y: toY(layer.y),
          w: toX(layer.w),
          h: layer.h === undefined ? toX(layer.w) : toY(layer.h),
        };

  ctx.save();
  ctx.globalAlpha = layer.opacity ?? 1;
  if (layer.blend) ctx.globalCompositeOperation = layer.blend;
  if (layer.rotate) {
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    ctx.translate(cx, cy);
    ctx.rotate((layer.rotate * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }
  if (layer.shadow) {
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = W * 0.05;
    ctx.shadowOffsetY = W * 0.02;
  }

  if (layer.shape === "circle") {
    ctx.beginPath();
    ctx.ellipse(box.x + box.w / 2, box.y + box.h / 2, box.w / 2, box.h / 2, 0, 0, Math.PI * 2);
  } else if (layer.shape === "roundRect") {
    roundRectPath(ctx, box.x, box.y, box.w, box.h, toX(layer.radius ?? 4));
  } else {
    ctx.beginPath();
    (points ?? []).forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
  }
  if (layer.fill) {
    ctx.fillStyle = fillStyleFor(ctx, layer.fill, box);
    ctx.fill();
  }
  if (layer.stroke) {
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = layer.stroke;
    ctx.lineWidth = toX(layer.strokeWidth ?? 0.4);
    ctx.lineJoin = "round";
    if (layer.dash) ctx.setLineDash(layer.dash.map(toX));
    ctx.stroke();
  }
  ctx.restore();
  return box;
}

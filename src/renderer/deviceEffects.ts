import type { Ctx } from "./canvas";
import type { Rect } from "./frames";
import { roundRectPath } from "./frames";

export function drawRim(
  ctx: Ctx,
  traceBody: (dx: number, dy: number) => void,
  color: string,
  canvasWidth: number,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = canvasWidth * 0.006;
  ctx.shadowColor = color;
  ctx.shadowBlur = canvasWidth * 0.035;
  traceBody(0, 0);
  ctx.stroke();
  ctx.restore();
}

export function drawGloss(ctx: Ctx, screen: Rect, radius: number) {
  ctx.save();
  roundRectPath(ctx, screen.x, screen.y, screen.w, screen.h, radius);
  ctx.clip();
  const sheen = ctx.createLinearGradient(screen.x, screen.y, screen.x + screen.w, screen.y + screen.h * 0.7);
  sheen.addColorStop(0, "rgba(255,255,255,0.32)");
  sheen.addColorStop(0.38, "rgba(255,255,255,0.08)");
  sheen.addColorStop(0.39, "rgba(255,255,255,0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(screen.x, screen.y, screen.w, screen.h);
  ctx.restore();
}

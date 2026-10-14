import type { Ctx } from "./canvas";

export function drawTickIcon(
  ctx: Ctx,
  cx: number,
  cy: number,
  radius: number,
  color: string,
  stroke: number,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = stroke;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(cx - radius * 0.45, cy);
  ctx.lineTo(cx - radius * 0.1, cy + radius * 0.35);
  ctx.lineTo(cx + radius * 0.5, cy - radius * 0.4);
  ctx.stroke();
}

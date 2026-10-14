import type { FrameId, FrameStyle } from "@/types";

import type { Ctx } from "./canvas";

interface FrameColors {
  body: [string, string, string];
  button: string;
  bezel: string;
}

const FRAME_STYLES: Record<FrameStyle, FrameColors> = {
  dark: { body: ["#3a3a42", "#17171b", "#2e2e35"], button: "#2b2b30", bezel: "#050507" },
  silver: { body: ["#F4F5F8", "#B4B9C2", "#E3E6EB"], button: "#A9AEB8", bezel: "#0A0A0D" },
  gold: { body: ["#F8E7B8", "#C19A52", "#EFD9A0"], button: "#B8924A", bezel: "#0A0A0D" },
  titanium: { body: ["#9096A0", "#4B4F58", "#7E838D"], button: "#3F434B", bezel: "#050507" },
  white: { body: ["#FFFFFF", "#D9DCE3", "#F3F4F8"], button: "#C7CBD3", bezel: "#111114" },
};

export interface FrameSpec {
  aspect: number;
  bezel: number;
  radius: number;
}

export const FRAMES: Record<Exclude<FrameId, "none">, FrameSpec> = {
  "phone-generic": { aspect: 0.462, bezel: 0.038, radius: 0.13 },
  "tablet-generic": { aspect: 0.74, bezel: 0.045, radius: 0.055 },
};

export function screenAspect(frame: Exclude<FrameId, "none">): number {
  const f = FRAMES[frame];
  const w = 1 - 2 * f.bezel;
  const h = 1 / f.aspect - 2 * f.bezel;
  return w / h;
}

export function roundRectPath(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function drawFrame(
  ctx: Ctx,
  frame: Exclude<FrameId, "none">,
  body: Rect,
  shadow: boolean,
  canvasWidth: number,
  style: FrameStyle = "dark",
): { screen: Rect; radius: number } {
  const colors = FRAME_STYLES[style];
  const spec = FRAMES[frame];
  const bezel = spec.bezel * body.w;
  const radius = spec.radius * body.w;

  ctx.save();
  if (shadow) {
    ctx.shadowColor = "rgba(0,0,0,0.38)";
    ctx.shadowBlur = canvasWidth * 0.04;
    ctx.shadowOffsetY = canvasWidth * 0.014;
  }
  ctx.fillStyle = colors.button;
  const bw = body.w * 0.012;
  if (frame === "phone-generic") {
    ctx.fillRect(body.x - bw, body.y + body.h * 0.16, bw, body.h * 0.05);
    ctx.fillRect(body.x - bw, body.y + body.h * 0.23, bw, body.h * 0.08);
    ctx.fillRect(body.x + body.w, body.y + body.h * 0.2, bw, body.h * 0.11);
  } else {
    ctx.fillRect(body.x + body.w * 0.15, body.y - bw, body.w * 0.08, bw);
  }
  const grad = ctx.createLinearGradient(body.x, body.y, body.x + body.w, body.y + body.h);
  grad.addColorStop(0, colors.body[0]);
  grad.addColorStop(0.5, colors.body[1]);
  grad.addColorStop(1, colors.body[2]);
  ctx.fillStyle = grad;
  roundRectPath(ctx, body.x, body.y, body.w, body.h, radius);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = colors.bezel;
  const inset = body.w * 0.008;
  roundRectPath(ctx, body.x + inset, body.y + inset, body.w - 2 * inset, body.h - 2 * inset, radius - inset);
  ctx.fill();

  const screen: Rect = {
    x: body.x + bezel,
    y: body.y + bezel,
    w: body.w - 2 * bezel,
    h: body.h - 2 * bezel,
  };
  return { screen, radius: Math.max(radius - bezel, 0) };
}

export function drawFrameOverlay(ctx: Ctx, frame: Exclude<FrameId, "none">, body: Rect) {
  ctx.fillStyle = "#050507";
  if (frame === "phone-generic") {
    const w = body.w * 0.27;
    const h = body.w * 0.075;
    roundRectPath(ctx, body.x + (body.w - w) / 2, body.y + body.w * 0.06, w, h, h / 2);
    ctx.fill();
  } else {
    const r = body.w * 0.011;
    ctx.beginPath();
    ctx.arc(body.x + body.w / 2, body.y + FRAMES[frame].bezel * body.w * 0.5, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawExtrusion(
  ctx: Ctx,
  traceBody: (dx: number, dy: number) => void,
  length: number,
  angleDegrees: number,
  color: string,
) {
  const angle = (angleDegrees * Math.PI) / 180;
  const steps = Math.max(8, Math.round(length / 2));
  ctx.save();
  ctx.fillStyle = color;
  for (let i = steps; i >= 1; i--) {
    const d = (length * i) / steps;
    traceBody(Math.cos(angle) * d, Math.sin(angle) * d);
    ctx.fill();
  }
  ctx.restore();
}

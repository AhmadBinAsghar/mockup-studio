import type { CalloutLayer } from "@/types";

import type { Ctx } from "./canvas";
import { roundRectPath } from "./frames";
import { drawTickIcon } from "./icons";
import { isRtl } from "./language";
import { drawBlock, fitFontPx, measureBlock, type TextBlockOptions } from "./text";

/** A card's text is stored as one string: "Title|Description". The description is optional. */
export function splitCard(raw: string): { title: string; detail: string } {
  const [title, ...rest] = raw.split("|");
  return { title: title.trim(), detail: rest.join("|").trim() };
}

export function joinCard(title: string, detail: string): string {
  const t = title.replace(/\|/g, "");
  const d = detail.replace(/\|/g, "");
  return d ? `${t}|${d}` : t;
}

export interface CalloutContext {
  raw: string;
  family: string;
  lang?: string;
  brandColor: string;
  /** The slide's own text colour; ignored on light "solid" cards where it would be unreadable. */
  textColor?: string;
}

const LOOK_DEFAULTS = {
  glass: { fill: "rgba(255,255,255,0.16)", text: "#FFFFFF" },
  solid: { fill: "#FFFFFF", text: "#111827" },
  outline: { fill: undefined, text: "#FFFFFF" },
  accent: { fill: "rgba(255,255,255,0.1)", text: "#FFFFFF" },
} as const;

const TITLE_MAX_LINES = 2;
const DETAIL_MAX_LINES = 3;

/** Draws one feature card and returns its height in pixels. Draws nothing (0) when the slide has no text for it. */
export function drawCallout(ctx: Ctx, layer: CalloutLayer, c: CalloutContext, W: number): number {
  const { title, detail } = splitCard(c.raw);
  if (!title && !detail) return 0;

  const look = layer.look ?? "glass";
  const defaults = LOOK_DEFAULTS[look];
  const rtl = isRtl(c.lang);
  const accent = layer.accentColor ?? c.brandColor;
  const textColor = (look !== "solid" ? c.textColor : undefined) ?? layer.color ?? defaults.text;

  const x = (layer.x / 100) * W;
  const y = (layer.y / 100) * W;
  const width = (layer.w / 100) * W;
  const fontPx = (layer.fontSize / 100) * W;
  const pad = fontPx * 0.9;
  const icon = layer.icon ?? "none";
  const iconRadius = fontPx * 0.78;
  const iconSpace = icon === "none" ? 0 : iconRadius * 2 + fontPx * 0.7;
  const barSpace = look === "accent" ? fontPx * 0.35 : 0;
  const textWidth = width - pad * 2 - iconSpace - barSpace;
  const align = layer.align ?? "left";

  const base = { family: c.family, maxWidth: textWidth, align, color: textColor, accent, lang: c.lang };
  const titleOpts: TextBlockOptions = { ...base, text: title, weight: 800, fontPx, lineHeight: 1.15 };
  const detailOpts: TextBlockOptions = {
    ...base,
    text: detail,
    weight: 500,
    fontPx: fontPx * 0.78,
    lineHeight: 1.3,
    opacity: 0.85,
  };
  if (title) titleOpts.fontPx = fitFontPx(ctx, titleOpts, TITLE_MAX_LINES);
  if (detail) detailOpts.fontPx = fitFontPx(ctx, detailOpts, DETAIL_MAX_LINES);
  const titleH = title ? measureBlock(ctx, titleOpts).height : 0;
  const detailH = detail ? measureBlock(ctx, detailOpts).height : 0;
  const gap = title && detail ? fontPx * 0.35 : 0;
  const height = Math.max(pad * 2 + titleH + gap + detailH, icon === "none" ? 0 : pad * 2 + iconRadius * 2);
  const radius = ((layer.radius ?? 2.4) / 100) * W;

  ctx.save();
  ctx.globalAlpha = layer.opacity ?? 1;
  if (layer.rotate) {
    ctx.translate(x + width / 2, y + height / 2);
    ctx.rotate((layer.rotate * Math.PI) / 180);
    ctx.translate(-(x + width / 2), -(y + height / 2));
  }

  const shadow = layer.shadow ?? (look === "solid" || look === "glass");
  const fill = layer.fill ?? defaults.fill;
  if (fill) {
    ctx.save();
    if (shadow) {
      ctx.shadowColor = "rgba(0,0,0,0.28)";
      ctx.shadowBlur = W * 0.035;
      ctx.shadowOffsetY = W * 0.012;
    }
    ctx.fillStyle = fill;
    roundRectPath(ctx, x, y, width, height, radius);
    ctx.fill();
    ctx.restore();
  }
  if (look === "glass" || look === "outline") {
    ctx.strokeStyle = look === "outline" ? accent : "rgba(255,255,255,0.35)";
    ctx.lineWidth = W * (look === "outline" ? 0.004 : 0.003);
    roundRectPath(ctx, x, y, width, height, radius);
    ctx.stroke();
  }
  if (look === "accent") {
    ctx.save();
    roundRectPath(ctx, x, y, width, height, radius);
    ctx.clip();
    ctx.fillStyle = accent;
    ctx.fillRect(rtl ? x + width - barSpace : x, y, barSpace, height);
    ctx.restore();
  }

  const startX = rtl ? x + pad : x + pad + barSpace + iconSpace;
  const top = y + (height - (titleH + gap + detailH)) / 2;
  if (icon !== "none") {
    const cx = rtl ? x + width - pad - iconRadius : x + pad + barSpace + iconRadius;
    const cy = y + height / 2;
    if (icon === "tick") {
      drawTickIcon(ctx, cx, cy, iconRadius, accent, fontPx * 0.16);
    } else {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(cx, cy, iconRadius, 0, Math.PI * 2);
      ctx.fill();
      drawBlock(ctx, cx - iconRadius, cy - fontPx * 0.67, {
        ...base,
        text: String(layer.index + 1),
        weight: 800,
        fontPx: fontPx * 0.95,
        lineHeight: 1.15,
        maxWidth: iconRadius * 2,
        align: "center",
        color: "#FFFFFF",
      });
    }
  }
  if (title) drawBlock(ctx, startX, top, titleOpts);
  if (detail) drawBlock(ctx, startX, top + titleH + gap, detailOpts);
  ctx.restore();
  return height;
}

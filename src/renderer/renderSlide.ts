import type {
  Background,
  Brand,
  DeviceLayer,
  Slide,
  SlideStyle,
  TextLayer,
  Template,
  BulletsLayer,
} from "@/types";

import type { Ctx, ImageSource } from "./canvas";
import { cutEnds, cutPolygon, polygonPath } from "./cuts";
import { fillStyleFor } from "./fills";
import { drawExtrusion, drawFrame, drawFrameOverlay, FRAMES, roundRectPath, type Rect } from "./frames";
import { drawGloss, drawRim } from "./deviceEffects";
import { drawShape } from "./shapes";
import { DEFAULT_FIT_COLOR, placeImage, resolveFit } from "./fit";
import { isRtl } from "./language";
import { drawCallout, splitCard } from "./callouts";
import { drawTickIcon } from "./icons";
import { drawBlock, fitFontPx, measureBlock, type TextBlockOptions } from "./text";
import { layoutKind, resolveTemplate, type SizeSpec } from "./resolve";

export interface RenderableSlide extends Slide {
  image: ImageSource | null;
  brand: Brand;
  index: number;
  count: number;
  prevImage?: ImageSource | null;
  nextImage?: ImageSource | null;
}

interface RenderInput {
  slide: RenderableSlide;
  template: Template;
  size: SizeSpec;
}

export interface RenderReport {
  textAreaRatio: number;
  /**
   * Where each layer was drawn, in canvas pixels and in the same order as the template's layers
   * (null when a layer drew nothing). Rotation is not applied. The builder uses this for dragging.
   */
  boxes: Array<Rect | null>;
  canvas: { width: number; height: number };
}

function paintFill(ctx: Ctx, fill: Background, box: Rect) {
  ctx.fillStyle = fillStyleFor(ctx, fill, box);
  ctx.fillRect(box.x, box.y, box.w, box.h);
}

function styleOf(input: RenderInput): SlideStyle {
  return input.slide.styles?.[input.template.id] ?? {};
}

const DEFAULT_MAX_LINES = { headline: 3, subheadline: 3 } as const;
const MAX_STACK_GAP = 4;

type TextBottoms = Partial<Record<TextLayer["role"], number>>;

function drawText(
  ctx: Ctx,
  layer: TextLayer,
  input: RenderInput,
  W: number,
  H: number,
  bottoms: TextBottoms,
) {
  const { slide } = input;
  const { brand } = slide;
  const raw = layer.role === "headline" ? slide.headline : slide.subheadline;
  const text = layer.uppercase ? raw.toUpperCase() : raw;
  const offset = (layer.y / 100) * W;
  const stackTop = layer.stackBelow ? bottoms[layer.stackBelow] : undefined;
  if (!text.trim()) {
    bottoms[layer.role] = stackTop === undefined ? offset : stackTop;
    return null;
  }
  const opts: TextBlockOptions = {
    text,
    family: slide.font ?? brand.font,
    weight: layer.weight ?? (layer.role === "headline" ? 800 : 400),
    fontPx: (layer.fontSize / 100) * W,
    lineHeight: layer.lineHeight ?? (layer.role === "headline" ? 1.15 : 1.35),
    maxWidth: (layer.w / 100) * W,
    align: layer.align ?? "center",
    color: styleOf(input).textColor ?? layer.color ?? "#FFFFFF",
    accent: layer.accentColor ?? brand.color,
    lang: slide.lang,
    stroke: layer.stroke ? { color: layer.stroke, width: ((layer.strokeWidth ?? 0.4) / 100) * W } : undefined,
    shadow: layer.shadow,
    opacity: layer.opacity,
  };
  opts.fontPx = fitFontPx(ctx, opts, layer.maxLines ?? DEFAULT_MAX_LINES[layer.role]);
  const x = (layer.x / 100) * W;
  // With stackBelow, y is only the gap under the headline. AI-made templates often
  // keep an absolute y (e.g. 21) here, which would push the text below the phone.
  let y = stackTop === undefined ? offset : stackTop + Math.min(offset, (MAX_STACK_GAP / 100) * W);
  if (layer.anchor === "bottom") y = H - offset - measureBlock(ctx, opts).height;
  const measured = layer.rotate ? measureBlock(ctx, opts) : null;
  if (layer.rotate && measured) {
    const cx = x + opts.maxWidth / 2;
    const cy = y + measured.height / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((layer.rotate * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }
  const m = drawBlock(ctx, x, y, opts);
  if (layer.rotate) ctx.restore();
  bottoms[layer.role] = y + m.height;
  return { width: m.width, height: m.height, box: { x, y, w: opts.maxWidth, h: m.height } };
}

function imageFor(layer: DeviceLayer, slide: RenderableSlide): ImageSource | null {
  if (layer.show === "prev") return slide.prevImage ?? slide.image;
  if (layer.show === "next") return slide.nextImage ?? slide.image;
  return slide.image;
}

function drawDevice(ctx: Ctx, layer: DeviceLayer, input: RenderInput, W: number, H: number): Rect {
  const { slide, template, size } = input;
  const kind = layoutKind(size);
  const framed = slide.deviceFrame ?? template.defaultFrame ?? true;
  const frameId =
    layer.frame === "none" ? (kind === "tablet" ? "tablet-generic" : "phone-generic") : layer.frame;
  const spec = FRAMES[frameId];

  const scale = slide.deviceScale ?? 1;
  let w = (layer.w / 100) * W * scale;
  let h = w / spec.aspect;
  // Scale around the layer's own center, then apply the user's nudge.
  let x =
    (layer.x / 100) * W -
    (w - (layer.w / 100) * W) / 2 +
    ((slide.deviceOffsetX ?? 0) / 100) * W +
    (input.slide.index % 2 === 1 ? ((layer.alternateOffset ?? 0) / 100) * W : 0);
  const y =
    (layer.y / 100) * W -
    (h - ((layer.w / 100) * W) / spec.aspect) / 2 +
    ((slide.deviceOffsetY ?? 0) / 100) * W;
  if (!layer.bleed) {
    const limit = H - ((layer.bottomMargin ?? 4) / 100) * W - y;
    if (h > limit && limit > 0) {
      const s = limit / h;
      x += (w - w * s) / 2;
      w *= s;
      h = limit;
    }
  }
  const body: Rect = { x, y, w, h };

  ctx.save();
  if (layer.rotate || layer.skewX || layer.skewY) {
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(((layer.rotate ?? 0) * Math.PI) / 180);
    const tanX = Math.tan(((layer.skewX ?? 0) * Math.PI) / 180);
    const tanY = Math.tan(((layer.skewY ?? 0) * Math.PI) / 180);
    ctx.transform(1, tanY, tanX, 1, 0, 0);
    ctx.translate(-(x + w / 2), -(y + h / 2));
  }

  const bodyRadius = framed ? spec.radius * w : ((layer.radius ?? 4) / 100) * W;
  const piece = layer.cuts?.length ? cutPolygon(body, bodyRadius, layer.cuts) : null;
  const traceBody = (dx: number, dy: number) =>
    piece
      ? polygonPath(ctx, piece, dx, dy)
      : roundRectPath(ctx, body.x + dx, body.y + dy, body.w, body.h, bodyRadius);

  if (layer.depth) {
    drawExtrusion(
      ctx,
      traceBody,
      (layer.depth / 100) * W,
      layer.depthAngle ?? 55,
      layer.depthColor ?? "#0c0c10",
    );
  }

  const shadow = layer.shadow ?? false;
  if (piece && shadow) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.38)";
    ctx.shadowBlur = W * 0.04;
    ctx.shadowOffsetY = W * 0.014;
    ctx.fillStyle = "#17171b";
    polygonPath(ctx, piece);
    ctx.fill();
    ctx.restore();
  }
  const bodyShadow = shadow && !piece;

  if (piece) {
    ctx.save();
    polygonPath(ctx, piece);
    ctx.clip();
  }

  let screen: Rect = body;
  let radius = ((layer.radius ?? 4) / 100) * W;
  if (framed) {
    ({ screen, radius } = drawFrame(ctx, frameId, body, bodyShadow, W, layer.frameStyle));
  } else if (bodyShadow) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.shadowBlur = W * 0.04;
    ctx.shadowOffsetY = W * 0.014;
    ctx.fillStyle = "#000";
    roundRectPath(ctx, body.x, body.y, body.w, body.h, radius);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  roundRectPath(ctx, screen.x, screen.y, screen.w, screen.h, radius);
  ctx.clip();
  drawScreenshot(ctx, imageFor(layer, input.slide), screen, slide);
  ctx.restore();
  if (layer.gloss) drawGloss(ctx, screen, radius);
  if (framed) drawFrameOverlay(ctx, frameId, body);
  if (layer.rim) drawRim(ctx, traceBody, layer.rim, W);
  if (layer.dim) {
    ctx.fillStyle = `rgba(0,0,0,${layer.dim})`;
    traceBody(0, 0);
    ctx.fill();
  }

  if (piece) {
    if (layer.cutGlow) {
      ctx.strokeStyle = layer.cutGlow;
      ctx.lineWidth = W * 0.012;
      for (const cut of layer.cuts ?? []) {
        const [from, to] = cutEnds(body, cut);
        ctx.beginPath();
        ctx.moveTo(from[0], from[1]);
        ctx.lineTo(to[0], to[1]);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  ctx.restore();
  return body;
}

function drawScreenshot(ctx: Ctx, image: ImageSource | null, box: Rect, slide: Slide) {
  ctx.fillStyle = slide.fitColor ?? DEFAULT_FIT_COLOR;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  if (!image) return;
  const iw = (image as { width: number }).width;
  const ih = (image as { height: number }).height;
  const fit = resolveFit(slide.fit ?? "auto", iw / ih, box.w / box.h);
  const { source: s, dest: d } = placeImage(fit, iw, ih, box);
  ctx.drawImage(image, s.x, s.y, s.w, s.h, d.x, d.y, d.w, d.h);
}

function drawBullets(ctx: Ctx, layer: BulletsLayer, input: RenderInput, W: number): Rect | null {
  const { slide } = input;
  const { brand } = slide;
  const rtl = isRtl(slide.lang);
  const fontPx = (layer.fontSize / 100) * W;
  const left = (layer.x / 100) * W;
  const width = (layer.w / 100) * W;
  const rowHeight = fontPx * 2.1;
  const radius = fontPx * 0.75;
  const textWidth = width - radius * 2 - fontPx;

  const rows = slide.bullets.filter((b) => b.trim()).slice(0, 3);
  rows.forEach((raw, i) => {
    // A bullet may also carry a card description ("Title|Description"); ticks show the title only.
    const text = splitCard(raw).title;
    const cy = (layer.y / 100) * W + rowHeight * i + rowHeight / 2;
    const iconX = rtl ? left + width - radius : left + radius;
    drawTickIcon(ctx, iconX, cy, radius, layer.iconColor ?? brand.color, fontPx * 0.16);
    drawBlock(ctx, rtl ? left : left + radius * 2 + fontPx * 0.6, cy - fontPx * 0.6, {
      text,
      family: slide.font ?? brand.font,
      weight: layer.weight ?? 700,
      fontPx,
      lineHeight: 1.2,
      maxWidth: textWidth,
      align: rtl ? "right" : "left",
      color: styleOf(input).textColor ?? layer.color ?? "#FFFFFF",
      accent: brand.color,
      lang: slide.lang,
    });
  });
  return rows.length ? { x: left, y: (layer.y / 100) * W, w: width, h: rowHeight * rows.length } : null;
}

export function renderSlide(
  slide: RenderableSlide,
  template: Template,
  preset: SizeSpec,
  ctx: Ctx,
): RenderReport {
  const input: RenderInput = { slide, template, size: preset };
  const W = preset.width;
  const H = preset.height;
  const layout = resolveTemplate(template, preset, slide.brand.color, slide.brand.tint);

  ctx.save();
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);
  const own = styleOf(input).background;
  if (own) {
    paintFill(ctx, own, { x: 0, y: 0, w: W, h: H });
  } else if (layout.background.span && slide.count > 1) {
    paintFill(ctx, layout.background, { x: -slide.index * W, y: 0, w: W * slide.count, h: H });
  } else {
    paintFill(ctx, layout.background, { x: 0, y: 0, w: W, h: H });
  }

  let textArea = 0;
  const bottoms: TextBottoms = {};
  const boxes: Array<Rect | null> = layout.layers.map(() => null);
  layout.layers.forEach((layer, i) => {
    if (layer.type === "text") {
      const m = drawText(ctx, layer, input, W, H, bottoms);
      const decorative = layer.opacity !== undefined && layer.opacity < 0.5;
      if (m && !decorative) textArea += (m.width * m.height) / (W * H);
      boxes[i] = m?.box ?? null;
    } else if (layer.type === "device") {
      boxes[i] = drawDevice(ctx, layer, input, W, H);
    } else if (layer.type === "shape") {
      if (!(own && layer.paintsBackground)) boxes[i] = drawShape(ctx, layer, W, H);
    } else if (layer.type === "callout") {
      const height = drawCallout(
        ctx,
        layer,
        {
          raw: slide.bullets[layer.index] ?? "",
          family: slide.font ?? slide.brand.font,
          lang: slide.lang,
          brandColor: slide.brand.color,
          textColor: styleOf(input).textColor,
        },
        W,
      );
      if (height > 0)
        boxes[i] = { x: (layer.x / 100) * W, y: (layer.y / 100) * W, w: (layer.w / 100) * W, h: height };
    } else {
      boxes[i] = drawBullets(ctx, layer, input, W);
    }
  });
  ctx.restore();
  return { textAreaRatio: textArea, boxes, canvas: { width: W, height: H } };
}

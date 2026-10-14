import type { Ctx } from "./canvas";
import { fontString } from "./fonts";
import { isRtl, isUnspacedScript } from "./language";

interface Word {
  text: string;
  accent: boolean;
  spaceBefore: boolean;
}

interface Line {
  words: Word[];
  width: number;
}

export function parseWords(text: string): Word[] {
  const words: Word[] = [];
  let accent = false;
  let current = "";
  let currentAccent = false;
  let pendingSpace = true;

  const flush = () => {
    if (!current) return;
    words.push({ text: current, accent: currentAccent, spaceBefore: pendingSpace });
    current = "";
    pendingSpace = false;
  };

  for (const ch of text) {
    if (ch === "[" || ch === "]") {
      flush();
      accent = ch === "[";
    } else if (/\s/.test(ch)) {
      flush();
      pendingSpace = true;
    } else if (isUnspacedScript(ch)) {
      flush();
      words.push({ text: ch, accent, spaceBefore: pendingSpace });
      pendingSpace = false;
    } else {
      if (!current) currentAccent = accent;
      current += ch;
    }
  }
  flush();
  return words;
}

export interface TextBlockOptions {
  text: string;
  family: string;
  weight: number;
  fontPx: number;
  lineHeight: number;
  maxWidth: number;
  align: "left" | "center" | "right";
  color: string;
  accent: string;
  lang?: string;
  stroke?: { color: string; width: number };
  shadow?: boolean;
  opacity?: number;
}

export interface TextMetrics {
  height: number;
  width: number;
}

function setFont(ctx: Ctx, o: TextBlockOptions, px = o.fontPx) {
  ctx.font = fontString(o.family, o.weight, px, o.lang);
}

export function wrapWords(ctx: Ctx, words: Word[], maxWidth: number): Line[] {
  const space = ctx.measureText(" ").width;
  const lines: Line[] = [];
  let line: Line = { words: [], width: 0 };
  for (const word of words) {
    const w = ctx.measureText(word.text).width;
    const gap = line.words.length && word.spaceBefore ? space : 0;
    if (line.words.length && line.width + gap + w > maxWidth) {
      lines.push(line);
      line = { words: [word], width: w };
    } else {
      line.words.push(word);
      line.width += gap + w;
    }
  }
  if (line.words.length) lines.push(line);
  return lines;
}

export function measureBlock(ctx: Ctx, o: TextBlockOptions): TextMetrics {
  setFont(ctx, o);
  const lines = wrapWords(ctx, parseWords(o.text), o.maxWidth);
  return {
    height: lines.length * o.fontPx * o.lineHeight,
    width: lines.reduce((m, l) => Math.max(m, l.width), 0),
  };
}

function effectiveAlign(o: TextBlockOptions): TextBlockOptions["align"] {
  if (!isRtl(o.lang) || o.align === "center") return o.align;
  return o.align === "left" ? "right" : "left";
}

export function drawBlock(ctx: Ctx, x: number, y: number, o: TextBlockOptions): TextMetrics {
  setFont(ctx, o);
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  const lines = wrapWords(ctx, parseWords(o.text), o.maxWidth);
  const space = ctx.measureText(" ").width;
  const lh = o.fontPx * o.lineHeight;
  const align = effectiveAlign(o);
  const rtl = isRtl(o.lang);

  ctx.save();
  if (o.opacity !== undefined) ctx.globalAlpha = o.opacity;
  if (o.shadow) {
    ctx.shadowColor = "rgba(0,0,0,0.38)";
    ctx.shadowBlur = o.fontPx * 0.18;
    ctx.shadowOffsetY = o.fontPx * 0.07;
  }
  if (o.stroke) {
    ctx.lineJoin = "round";
    ctx.lineWidth = o.stroke.width;
    ctx.strokeStyle = o.stroke.color;
  }

  lines.forEach((line, i) => {
    let cx = x;
    if (align === "center") cx = x + (o.maxWidth - line.width) / 2;
    else if (align === "right") cx = x + o.maxWidth - line.width;
    const baseline = y + i * lh + (lh + o.fontPx * 0.72) / 2 - o.fontPx * 0.1;
    const ordered = rtl ? [...line.words].reverse() : line.words;
    ordered.forEach((word, index) => {
      const later = rtl ? ordered[index - 1] : word;
      if (index > 0 && later.spaceBefore) cx += space;
      if (o.stroke) ctx.strokeText(word.text, cx, baseline);
      ctx.fillStyle = word.accent ? o.accent : o.color;
      ctx.fillText(word.text, cx, baseline);
      cx += ctx.measureText(word.text).width;
    });
  });
  ctx.restore();
  return {
    height: lines.length * lh,
    width: lines.reduce((m, l) => Math.max(m, l.width), 0),
  };
}

const MIN_FIT_SCALE = 0.55;
const FIT_STEP = 0.94;

export function fitFontPx(ctx: Ctx, o: TextBlockOptions, maxLines: number): number {
  const minPx = o.fontPx * MIN_FIT_SCALE;
  let px = o.fontPx;
  while (px > minPx) {
    setFont(ctx, o, px);
    if (wrapWords(ctx, parseWords(o.text), o.maxWidth).length <= maxLines) break;
    px *= FIT_STEP;
  }
  return px;
}

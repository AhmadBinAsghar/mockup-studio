import type { FitMode } from "@/types";

import type { Rect } from "./frames";

export const FIT_TOLERANCE = 0.12;

export const DEFAULT_FIT_COLOR = "#FFFFFF";

export function resolveFit(mode: FitMode, imageAspect: number, screenAspect: number): "cover" | "contain" {
  if (mode !== "auto") return mode;
  const mismatch = Math.abs(imageAspect - screenAspect) / screenAspect;
  return mismatch > FIT_TOLERANCE ? "contain" : "cover";
}

export interface FitPlacement {
  source: Rect;
  dest: Rect;
}

export function placeImage(fit: "cover" | "contain", iw: number, ih: number, box: Rect): FitPlacement {
  if (fit === "cover") {
    const scale = Math.max(box.w / iw, box.h / ih);
    const sw = box.w / scale;
    const sh = box.h / scale;
    return { source: { x: (iw - sw) / 2, y: (ih - sh) / 2, w: sw, h: sh }, dest: box };
  }
  const scale = Math.min(box.w / iw, box.h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  return {
    source: { x: 0, y: 0, w: iw, h: ih },
    dest: { x: box.x + (box.w - dw) / 2, y: box.y + (box.h - dh) / 2, w: dw, h: dh },
  };
}

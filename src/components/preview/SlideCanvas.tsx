"use client";

import { useEffect, useRef } from "react";

import { getBitmap } from "@/lib/imageCache";
import { loadFontsFor } from "@/renderer/fonts";
import { renderSlide, type RenderReport } from "@/renderer/renderSlide";
import type { Brand, Slide, Template } from "@/types";

interface Props {
  slide: Slide;
  prev?: Slide;
  next?: Slide;
  template: Template;
  brand: Brand;
  width: number;
  height: number;
  kind?: "phone" | "tablet";
  index?: number;
  count?: number;
  renderWidth?: number;
  className?: string;
  onReport?: (r: RenderReport) => void;
}

export function SlideCanvas({
  slide,
  prev,
  next,
  template,
  brand,
  width,
  height,
  kind,
  index = 0,
  count = 1,
  renderWidth = 360,
  className,
  onReport,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const rw = Math.min(renderWidth, width);
  const rh = Math.round((rw * height) / width);
  const family = slide.font ?? brand.font;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [image, prevImage, nextImage] = await Promise.all([
        getBitmap(slide),
        prev ? getBitmap(prev) : undefined,
        next ? getBitmap(next) : undefined,
        loadFontsFor(document, family, slide.lang).catch(() => undefined),
      ]);
      const canvas = ref.current;
      const ctx = canvas?.getContext("2d");
      if (cancelled || !canvas || !ctx) return;
      const report = renderSlide(
        { ...slide, brand, index, count, image, prevImage, nextImage },
        template,
        { width: rw, height: rh, kind },
        ctx,
      );
      onReport?.(report);
    })();
    return () => {
      cancelled = true;
    };
  }, [slide, prev, next, template, brand, rw, rh, kind, index, count, family, onReport]);

  return (
    <canvas
      ref={ref}
      width={rw}
      height={rh}
      className={className}
      style={{ aspectRatio: `${width} / ${height}` }}
    />
  );
}

import type { Slide } from "@/types";

import { PNG_HEADER_LENGTH, readPngSize, type ImageSize } from "./imageSize";

const PREVIEW_MAX_WIDTH = 720;

const cache = new WeakMap<Blob, Promise<ImageBitmap>>();

export function getBitmap(slide: Slide): Promise<ImageBitmap> {
  let p = cache.get(slide.blob);
  if (!p) {
    const shrink: ImageBitmapOptions | undefined =
      slide.width > PREVIEW_MAX_WIDTH ? { resizeWidth: PREVIEW_MAX_WIDTH, resizeQuality: "high" } : undefined;
    p = createImageBitmap(slide.blob, shrink);
    cache.set(slide.blob, p);
  }
  return p;
}

export async function readImageFile(file: File): Promise<ImageSize> {
  if (file.type === "image/png") {
    const header = new Uint8Array(await file.slice(0, PNG_HEADER_LENGTH).arrayBuffer());
    const size = readPngSize(header);
    if (size) return size;
  }
  const bmp = await createImageBitmap(file);
  const size = { width: bmp.width, height: bmp.height };
  bmp.close();
  return size;
}

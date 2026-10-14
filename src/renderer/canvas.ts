export type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface CanvasLike {
  width: number;
  height: number;
  getContext(type: "2d", options?: { alpha?: boolean }): Ctx | null;
}

export type CanvasFactory = (width: number, height: number) => CanvasLike;

export type ImageSource = CanvasImageSource;

export function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

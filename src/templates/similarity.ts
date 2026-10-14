import type { Template } from "@/types";

const HEX_OR_TOKEN = /#[0-9a-fA-F]{6}|\{brand[a-z-]*\}/g;

export function paletteOf(template: Template): Set<string> {
  const text = JSON.stringify([template.background, template.layers]);
  return new Set((text.match(HEX_OR_TOKEN) ?? []).map((c) => c.toUpperCase()));
}

export function geometryOf(template: Template): string[] {
  return template.layers.map((layer) => {
    if (layer.type === "shape" && layer.shape === "polygon") {
      const points = layer.points ?? [];
      const sum = points.reduce((s, [x, y]) => s + x + y, 0);
      return `polygon:${points.length}:${Math.round(sum / 20)}`;
    }
    const kind =
      layer.type === "text"
        ? `text-${layer.role}`
        : layer.type === "shape"
          ? `shape-${layer.shape}`
          : layer.type;
    const bucket = (n: number) => Math.round(n / 6);
    return `${kind}:${bucket(layer.x)}:${bucket(layer.y)}:${bucket(layer.w)}`;
  });
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let shared = 0;
  for (const item of a) if (b.has(item)) shared++;
  return shared / (a.size + b.size - shared);
}

function multisetOverlap(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  const counts = new Map<string, number>();
  for (const item of b) counts.set(item, (counts.get(item) ?? 0) + 1);
  let shared = 0;
  for (const item of a) {
    const left = counts.get(item) ?? 0;
    if (left > 0) {
      shared++;
      counts.set(item, left - 1);
    }
  }
  return shared / Math.max(a.length, b.length);
}

export function layoutSimilarity(a: Template, b: Template): number {
  return multisetOverlap(geometryOf(a), geometryOf(b));
}

export function similarity(a: Template, b: Template): number {
  return Math.min(jaccard(paletteOf(a), paletteOf(b)), multisetOverlap(geometryOf(a), geometryOf(b)));
}

const SAME_LAYOUT = 0.8;
const SAME_LOOK = 0.6;

export interface Lookalike {
  name: string;
  reason: "layout" | "look";
}

export function findLookalike(template: Template, others: Template[]): Lookalike | null {
  for (const other of others) {
    if (layoutSimilarity(template, other) >= SAME_LAYOUT) return { name: other.name, reason: "layout" };
    if (similarity(template, other) >= SAME_LOOK) return { name: other.name, reason: "look" };
  }
  return null;
}

export function lookalikeMessage(found: Lookalike): string {
  return found.reason === "layout"
    ? `This design uses the same layout as "${found.name}", only with other colors. Ask the AI for a different composition (different positions, phone arrangement and decorations) as well as a different palette.`
    : `This design is almost identical to "${found.name}". Ask the AI for a clearly different palette and composition.`;
}

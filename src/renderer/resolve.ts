import type { Layer, Template, TemplateOverrides } from "@/types";

import { applyBrandTokens, tintHexColors } from "./brand";
import { FRAMES } from "./frames";

export type LayoutKind = "phone" | "tablet" | "wide";

export interface SizeSpec {
  width: number;
  height: number;
  kind?: "phone" | "tablet";
}

const TABLET_MIN_ASPECT = 0.75;
const WIDE_MIN_ASPECT = 1.2;

export function layoutKind(size: SizeSpec): LayoutKind {
  const aspect = size.width / size.height;
  if (aspect > WIDE_MIN_ASPECT) return "wide";
  if (size.kind === "tablet" || aspect > TABLET_MIN_ASPECT) return "tablet";
  return "phone";
}

export function layerKey(layer: Layer): string {
  if (layer.id) return layer.id;
  return layer.type === "text" ? layer.role : layer.type;
}

function replaceBrand<T>(value: T, brand: string, tintFrom?: string): T {
  let json = JSON.stringify(value);
  if (tintFrom) json = tintHexColors(json, brand, tintFrom);
  return JSON.parse(applyBrandTokens(json, brand)) as T;
}

function applyOverrides(template: Template, overrides: TemplateOverrides | undefined): Template {
  if (!overrides) return template;
  return {
    ...template,
    background: overrides.background ?? template.background,
    layers: template.layers.map((layer) => {
      const patch = overrides.layers?.[layerKey(layer)];
      return patch ? ({ ...layer, ...patch } as Layer) : layer;
    }),
  };
}

const TABLET_SCALE = 1.2;
const SLICED_TABLET_SCALE = 1.12;
const MAX_TABLET_WIDTH = 94;

export function toTabletLayout(template: Template): Template {
  const layers = template.layers.map((layer): Layer => {
    if (layer.type !== "device" || layer.frame !== "phone-generic") return layer;
    const scale = layer.cuts?.length ? SLICED_TABLET_SCALE : TABLET_SCALE;
    const w = Math.min(MAX_TABLET_WIDTH, layer.w * scale);
    const phoneHeight = layer.w / FRAMES["phone-generic"].aspect;
    const tabletHeight = w / FRAMES["tablet-generic"].aspect;
    const slack = phoneHeight - tabletHeight;
    return {
      ...layer,
      frame: "tablet-generic",
      w,
      x: layer.x + (layer.w - w) / 2,
      y: layer.y + (layer.bleed ? slack : slack / 2),
    };
  });
  return { ...template, layers };
}

function toWideLayout(template: Template, aspect: number): Template {
  const height = 100 / aspect;
  const headlineSize = height * 0.17;
  const layers: Layer[] = [];
  for (const layer of template.layers) {
    if (layer.type === "text" && layer.hideOnWide) continue;
    if (layer.type === "text" && layer.role === "headline") {
      layers.push({
        ...layer,
        x: 6,
        y: height * 0.2,
        w: 48,
        fontSize: headlineSize,
        align: "left",
        anchor: "top",
        maxLines: 2,
      });
    } else if (layer.type === "text") {
      layers.push({
        ...layer,
        x: 6,
        y: 2,
        w: 48,
        fontSize: headlineSize * 0.45,
        align: "left",
        anchor: "top",
        stackBelow: "headline",
        maxLines: 2,
      });
    } else if (layer.type === "shape") {
      if (!layer.hideOnWide) layers.push(layer);
    } else if (layer.type === "device") {
      layers.push({ ...layer, x: 62, y: height * 0.16, w: 26, bleed: true, alternateOffset: 0 });
    }
  }
  return { ...template, layers };
}

const PHONE_CANVAS_HEIGHT = (1920 / 1080) * 100;

/** A tablet canvas is shorter than a phone's, so cards positioned for the phone move up with it. */
function fitCalloutsToTablet(template: Template, size: SizeSpec): Template {
  const factor = (100 * size.height) / size.width / PHONE_CANVAS_HEIGHT;
  if (factor >= 1) return template;
  return {
    ...template,
    layers: template.layers.map((layer) =>
      layer.type === "callout" && !template.tabletOverrides?.layers?.[layerKey(layer)]
        ? { ...layer, y: layer.y * factor }
        : layer,
    ),
  };
}

export function resolveTemplate(
  template: Template,
  size: SizeSpec,
  brandColor: string,
  tint = false,
): Template {
  const base = replaceBrand(template, brandColor, tint ? template.themeColor : undefined);
  const kind = layoutKind(size);
  if (kind === "tablet") {
    const tablet = base.tabletOverrides ? applyOverrides(base, base.tabletOverrides) : toTabletLayout(base);
    return fitCalloutsToTablet(tablet, size);
  }
  if (kind === "wide") {
    const wide = toWideLayout(base, size.width / size.height);
    return applyOverrides(wide, base.wideOverrides);
  }
  return base;
}

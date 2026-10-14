import type { Template } from "@/types";

import { CATEGORIES } from "./categories";

export const MAX_LAYERS = 80;
export const MAX_POINTS = 200;

const FRAMES = ["phone-generic", "tablet-generic", "none"];
const FRAME_STYLES = ["dark", "silver", "gold", "titanium", "white"];
const BLENDS = ["screen", "overlay", "multiply", "lighter", "soft-light"];
const ALIGNS = ["left", "center", "right"];
const SHAPES = ["circle", "roundRect", "polygon"];

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === "string" && v.length > 0;

class Checker {
  problems: string[] = [];

  constructor(private where: string) {}

  add(message: string) {
    this.problems.push(`${this.where}: ${message}`);
  }

  number(o: Obj, key: string, min: number, max: number, required = false) {
    const v = o[key];
    if (v === undefined) return required && this.add(`"${key}" is required and must be a number`);
    if (!isNum(v) || v < min || v > max) this.add(`"${key}" must be a number between ${min} and ${max}`);
  }

  text(o: Obj, key: string) {
    if (o[key] !== undefined && !isStr(o[key]))
      this.add(`"${key}" must be a color string such as "#FF0000" or "{brand}"`);
  }

  bool(o: Obj, key: string) {
    if (o[key] !== undefined && typeof o[key] !== "boolean") this.add(`"${key}" must be true or false`);
  }

  oneOf(o: Obj, key: string, allowed: string[]) {
    if (o[key] !== undefined && !allowed.includes(o[key] as string))
      this.add(`"${key}" must be one of ${allowed.join(", ")}`);
  }

  fill(value: unknown, key: string, allowRadial: boolean) {
    if (value === undefined) return;
    if (!isObj(value)) return this.add(`"${key}" must be an object like {"type":"solid","color":"#FF0000"}`);
    if (value.type === "solid" || (allowRadial && value.type === "radial")) {
      if (!isStr(value.color)) this.add(`"${key}.color" must be a color string`);
    } else if (value.type === "gradient") {
      const stops = value.stops;
      if (!isNum(value.angle)) this.add(`"${key}.angle" must be a number`);
      if (!Array.isArray(stops) || stops.length !== 2 || !stops.every(isStr)) {
        this.add(`"${key}.stops" must be two color strings`);
      }
    } else {
      this.add(`"${key}.type" must be "solid", "gradient"${allowRadial ? ' or "radial"' : ""}`);
    }
  }
}

function checkText(layer: Obj, c: Checker) {
  c.oneOf(layer, "role", ["headline", "subheadline"]);
  if (layer.role !== "headline" && layer.role !== "subheadline")
    c.add('"role" must be "headline" or "subheadline"');
  c.number(layer, "x", -200, 300, true);
  c.number(layer, "y", -200, 400, true);
  c.number(layer, "w", 5, 300, true);
  c.number(layer, "fontSize", 1, 40, true);
  c.number(layer, "weight", 100, 900);
  c.number(layer, "lineHeight", 0.7, 3);
  c.number(layer, "maxLines", 1, 8);
  c.number(layer, "rotate", -180, 180);
  c.number(layer, "strokeWidth", 0, 10);
  c.number(layer, "opacity", 0, 1);
  c.oneOf(layer, "align", ALIGNS);
  c.oneOf(layer, "anchor", ["top", "bottom"]);
  c.oneOf(layer, "stackBelow", ["headline", "subheadline"]);
  for (const key of ["color", "accentColor", "stroke"]) c.text(layer, key);
  for (const key of ["uppercase", "shadow", "hideOnWide"]) c.bool(layer, key);
}

function checkDevice(layer: Obj, c: Checker) {
  c.oneOf(layer, "frame", FRAMES);
  if (!FRAMES.includes(layer.frame as string)) c.add(`"frame" must be one of ${FRAMES.join(", ")}`);
  c.number(layer, "x", -200, 300, true);
  c.number(layer, "y", -200, 400, true);
  c.number(layer, "w", 10, 250, true);
  for (const key of ["rotate"]) c.number(layer, key, -180, 180);
  for (const key of ["skewX", "skewY"]) c.number(layer, key, -60, 60);
  for (const key of ["radius", "bottomMargin", "alternateOffset", "depthAngle"])
    c.number(layer, key, -360, 360);
  c.number(layer, "depth", 0, 12);
  c.number(layer, "dim", 0, 1);
  c.oneOf(layer, "frameStyle", FRAME_STYLES);
  c.oneOf(layer, "show", ["self", "prev", "next"]);
  for (const key of ["depthColor", "cutGlow", "rim"]) c.text(layer, key);
  for (const key of ["shadow", "bleed", "gloss"]) c.bool(layer, key);
  if (layer.cuts !== undefined) {
    const cuts = layer.cuts;
    if (!Array.isArray(cuts) || cuts.length > 6) return c.add('"cuts" must be a list of up to 6 cuts');
    cuts.forEach((cut, i) => {
      const cc = new Checker(`cuts[${i}]`);
      if (!isObj(cut)) return c.add(`cuts[${i}] must be an object`);
      for (const key of ["x1", "y1", "x2", "y2"]) cc.number(cut, key, -5, 5, true);
      cc.oneOf(cut, "keep", ["left", "right"]);
      if (cut.keep !== "left" && cut.keep !== "right") cc.add('"keep" must be "left" or "right"');
      cc.problems.forEach((p) => c.add(p));
    });
  }
}

function checkBullets(layer: Obj, c: Checker) {
  for (const key of ["x", "y", "w", "fontSize"]) c.number(layer, key, -200, 400, true);
  c.number(layer, "weight", 100, 900);
  for (const key of ["color", "iconColor"]) c.text(layer, key);
}

function checkCallout(layer: Obj, c: Checker) {
  c.number(layer, "index", 0, 2, true);
  if (layer.index !== undefined && !Number.isInteger(layer.index)) c.add('"index" must be 0, 1 or 2');
  c.number(layer, "x", -200, 300, true);
  c.number(layer, "y", -200, 400, true);
  c.number(layer, "w", 8, 300, true);
  c.number(layer, "fontSize", 1, 12, true);
  c.number(layer, "radius", 0, 20);
  c.number(layer, "rotate", -45, 45);
  c.number(layer, "opacity", 0, 1);
  c.oneOf(layer, "look", ["glass", "solid", "outline", "accent"]);
  c.oneOf(layer, "icon", ["none", "number", "tick"]);
  c.oneOf(layer, "align", ["left", "center"]);
  for (const key of ["fill", "color", "accentColor"]) c.text(layer, key);
  c.bool(layer, "shadow");
}

function checkShape(layer: Obj, c: Checker) {
  c.oneOf(layer, "shape", SHAPES);
  if (!SHAPES.includes(layer.shape as string)) c.add(`"shape" must be one of ${SHAPES.join(", ")}`);
  if (layer.shape === "polygon") {
    const points = layer.points;
    const valid =
      Array.isArray(points) &&
      points.length >= 3 &&
      points.length <= MAX_POINTS &&
      points.every((p) => Array.isArray(p) && p.length === 2 && isNum(p[0]) && isNum(p[1]));
    if (!valid) c.add(`"points" must be a list of 3 to ${MAX_POINTS} [x, y] number pairs`);
  } else {
    c.number(layer, "x", -300, 400, true);
    c.number(layer, "y", -300, 600, true);
    c.number(layer, "w", 0.1, 600, true);
    c.number(layer, "h", 0.1, 800);
  }
  c.fill(layer.fill, "fill", true);
  if (layer.fill === undefined && layer.stroke === undefined) c.add('needs a "fill" or a "stroke"');
  c.text(layer, "stroke");
  c.number(layer, "strokeWidth", 0, 20);
  c.number(layer, "opacity", 0, 1);
  c.number(layer, "rotate", -360, 360);
  c.number(layer, "radius", 0, 100);
  c.oneOf(layer, "blend", BLENDS);
  c.oneOf(layer, "yUnit", ["width", "height"]);
  for (const key of ["shadow", "hideOnWide", "paintsBackground"]) c.bool(layer, key);
  if (
    layer.dash !== undefined &&
    !(Array.isArray(layer.dash) && layer.dash.length === 2 && layer.dash.every(isNum))
  ) {
    c.add('"dash" must be two numbers like [2, 1.5]');
  }
}

export function validateTemplate(t: Template): string[] {
  const problems: string[] = [];
  const root = new Checker("template");
  const raw = t as unknown as Obj;

  if (!isStr(raw.id) || !isStr(raw.name)) problems.push("template: missing id or name");
  if (!t.custom && !CATEGORIES.some((c) => c.id === t.category && c.id !== "custom")) {
    problems.push("template: missing or unknown category");
  }
  if (!Array.isArray(raw.supports) || !raw.supports.includes("phone") || !raw.supports.includes("tablet")) {
    problems.push('template: "supports" must include "phone" and "tablet"');
  }
  if (raw.background === undefined) problems.push("template: missing background");
  else {
    root.fill(raw.background, "background", false);
    problems.push(...root.problems);
  }
  if (raw.themeColor !== undefined && !/^#[0-9a-fA-F]{6}$/.test(String(raw.themeColor))) {
    problems.push('template: "themeColor" must be a 6-digit hex color like "#FF0000"');
  }

  const layers = raw.layers;
  if (!Array.isArray(layers) || layers.length === 0) {
    problems.push('template: "layers" must be a list with at least one layer');
    return problems;
  }
  if (layers.length > MAX_LAYERS)
    problems.push(`template: at most ${MAX_LAYERS} layers are allowed (found ${layers.length})`);

  layers.forEach((layer, i) => {
    if (!isObj(layer)) return problems.push(`layers[${i}]: must be an object`);
    const c = new Checker(`layers[${i}] (${String(layer.type)})`);
    if (layer.id !== undefined && !isStr(layer.id)) c.add('"id" must be text');
    if (layer.type === "text") checkText(layer, c);
    else if (layer.type === "device") checkDevice(layer, c);
    else if (layer.type === "bullets") checkBullets(layer, c);
    else if (layer.type === "shape") checkShape(layer, c);
    else if (layer.type === "callout") checkCallout(layer, c);
    else c.add('"type" must be "text", "device", "bullets", "shape" or "callout"');
    problems.push(...c.problems);
  });

  const list = layers as Obj[];
  if (!list.some((l) => isObj(l) && l.type === "device"))
    problems.push('template: needs at least one "device" layer (the phone)');
  if (!list.some((l) => isObj(l) && l.type === "text" && l.role === "headline")) {
    problems.push('template: needs a "text" layer with role "headline"');
  }
  return problems;
}

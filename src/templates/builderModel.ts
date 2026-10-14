import type { DeviceLayer, Fill, Layer, ShapeLayer, Template } from "@/types";

export type ShapeKind = "circle" | "roundRect" | "glow" | "ring" | "band";

export const SHAPE_KINDS: Array<{ kind: ShapeKind; label: string }> = [
  { kind: "circle", label: "Circle" },
  { kind: "roundRect", label: "Rounded square" },
  { kind: "glow", label: "Glow" },
  { kind: "ring", label: "Ring" },
  { kind: "band", label: "Diagonal band" },
];

const gradient = (a: string, b: string): Fill => ({ type: "gradient", angle: 135, stops: [a, b] });

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function startDraft(template: Template): Template {
  const draft = clone(template);
  delete draft.tabletOverrides;
  delete draft.wideOverrides;
  delete draft.thumbnail;
  delete draft.custom;
  delete draft.category;
  return draft;
}

export function layerIndexes(draft: Template, type: Layer["type"]): number[] {
  return draft.layers.flatMap((layer, i) => (layer.type === type ? [i] : []));
}

export function patchLayer(draft: Template, index: number, patch: Partial<Layer>): Template {
  const layers = draft.layers.map((layer, i) => (i === index ? ({ ...layer, ...patch } as Layer) : layer));
  return { ...draft, layers };
}

export function removeLayer(draft: Template, index: number): Template {
  return { ...draft, layers: draft.layers.filter((_, i) => i !== index) };
}

function nextId(draft: Template, prefix: string): string {
  const used = new Set(draft.layers.map((l) => l.id));
  for (let n = 1; ; n++) if (!used.has(`${prefix}-${n}`)) return `${prefix}-${n}`;
}

export function newShape(kind: ShapeKind, id: string): ShapeLayer {
  switch (kind) {
    case "circle":
      return {
        type: "shape",
        id,
        shape: "circle",
        x: 58,
        y: 28,
        w: 34,
        fill: gradient("{brand-light}", "{brand-pop}"),
        opacity: 0.95,
      };
    case "roundRect":
      return {
        type: "shape",
        id,
        shape: "roundRect",
        x: 8,
        y: 120,
        w: 22,
        h: 22,
        radius: 5,
        rotate: 15,
        fill: gradient("{brand}", "{brand-glow}"),
        shadow: true,
      };
    case "glow":
      return {
        type: "shape",
        id,
        shape: "circle",
        x: -10,
        y: 40,
        w: 100,
        fill: { type: "radial", color: "{brand}" },
        opacity: 0.6,
      };
    case "ring":
      return {
        type: "shape",
        id,
        shape: "circle",
        x: 14,
        y: 36,
        w: 72,
        stroke: "#FFFFFF",
        strokeWidth: 0.8,
        opacity: 0.5,
      };
    case "band":
      return {
        type: "shape",
        id,
        shape: "polygon",
        x: 0,
        y: 0,
        w: 100,
        points: [
          [0, 62],
          [100, 46],
          [100, 56],
          [0, 72],
        ],
        yUnit: "height",
        fill: { type: "solid", color: "{brand}" },
        hideOnWide: true,
      };
  }
}

export function addShape(draft: Template, kind: ShapeKind): Template {
  const firstForeground = draft.layers.findIndex((l) => l.type !== "shape");
  const at = firstForeground === -1 ? draft.layers.length : firstForeground;
  const layers = [...draft.layers];
  layers.splice(at, 0, newShape(kind, nextId(draft, "shape")));
  return { ...draft, layers };
}

function withDeviceIds(layers: Layer[]): Layer[] {
  let n = 0;
  return layers.map((layer) => {
    if (layer.type !== "device") return layer;
    n++;
    return layer.id ? layer : { ...layer, id: `phone-${n}` };
  });
}

export function addPhone(draft: Template): Template {
  const named = { ...draft, layers: withDeviceIds(draft.layers) };
  const phones = layerIndexes(named, "device");
  const source = named.layers[phones[0]] as DeviceLayer | undefined;
  if (!source) return draft;
  const copy: DeviceLayer = {
    ...source,
    id: nextId(named, "phone"),
    x: Math.min(source.x + 14, 70),
    y: source.y + 8,
    rotate: -(source.rotate ?? 8) || -8,
    dim: 0,
    cuts: undefined,
    cutGlow: undefined,
  };
  return { ...named, layers: [...named.layers, copy] };
}

export function setBackground(draft: Template, fill: Fill): Template {
  return { ...draft, background: fill };
}

export function finishTemplate(draft: Template, id: string, name: string): Template {
  return { ...draft, id, name, category: "custom", custom: true, supports: ["phone", "tablet"] };
}

export function textIndex(draft: Template, role: "headline" | "subheadline"): number {
  return draft.layers.findIndex((l) => l.type === "text" && l.role === role);
}

export function setSubheadline(draft: Template, on: boolean): Template {
  const at = textIndex(draft, "subheadline");
  if (!on) return at === -1 ? draft : removeLayer(draft, at);
  if (at !== -1) return draft;
  const headline = draft.layers[textIndex(draft, "headline")];
  const y = headline && headline.type === "text" ? headline.y + 17 : 24;
  const layer: Layer = {
    type: "text",
    role: "subheadline",
    x: 10,
    y,
    w: 80,
    fontSize: 3.3,
    align: "center",
    color: "#E5E7EB",
  };
  return { ...draft, layers: [...draft.layers, layer] };
}

// ─────────────────────────────────────────────────────────────────────────────
// Canvas editing: naming, deleting, duplicating and reordering layers
// ─────────────────────────────────────────────────────────────────────────────

export const MAX_PHONES = 4;
export const MAX_CARDS = 3;

export function describeShape(shape: ShapeLayer): string {
  if (shape.shape === "polygon") return "Diagonal band";
  if (shape.stroke && !shape.fill) return "Ring";
  if (shape.fill?.type === "radial") return "Glow";
  return shape.shape === "circle" ? "Circle" : "Rounded square";
}

/** A short human name for a layer, e.g. "Headline", "Phone 2", "Circle 3". */
export function layerLabel(draft: Template, index: number): string {
  const layer = draft.layers[index];
  if (!layer) return "";
  const before = draft.layers.slice(0, index);
  if (layer.type === "text") return layer.role === "headline" ? "Headline" : "Subtitle";
  if (layer.type === "device") return `Phone ${before.filter((l) => l.type === "device").length + 1}`;
  if (layer.type === "callout") return `Card ${layer.index + 1}`;
  if (layer.type === "bullets") return "Bullet list";
  const name = describeShape(layer);
  const same = before.filter((l) => l.type === "shape" && describeShape(l) === name).length;
  return `${name} ${same + 1}`;
}

export function canDeleteLayer(draft: Template, index: number): boolean {
  const layer = draft.layers[index];
  if (!layer) return false;
  if (layer.type === "text") return layer.role === "subheadline";
  if (layer.type === "device") return layerIndexes(draft, "device").length > 1;
  return true;
}

export function deleteLayer(draft: Template, index: number): Template {
  if (!canDeleteLayer(draft, index)) return draft;
  const layer = draft.layers[index];
  if (layer.type === "text") return setSubheadline(draft, false);
  return removeLayer(draft, index);
}

export function canDuplicateLayer(draft: Template, index: number): boolean {
  const layer = draft.layers[index];
  if (!layer) return false;
  if (layer.type === "shape") return true;
  if (layer.type === "device") return layerIndexes(draft, "device").length < MAX_PHONES;
  return false;
}

const COPY_OFFSET = 5;

/** Copies a shape or phone just in front of the original and returns where the copy is. */
export function duplicateLayer(draft: Template, index: number): { draft: Template; index: number } | null {
  if (!canDuplicateLayer(draft, index)) return null;
  const layer = draft.layers[index];
  let copy: Layer;
  if (layer.type === "shape") {
    copy = {
      ...clone(layer),
      id: nextId(draft, "shape"),
      x: layer.x + COPY_OFFSET,
      y: layer.y + COPY_OFFSET,
      ...(layer.points
        ? { points: layer.points.map(([x, y]): [number, number] => [x + COPY_OFFSET, y + COPY_OFFSET]) }
        : {}),
    };
  } else if (layer.type === "device") {
    const named = withDeviceIds(draft.layers);
    const source = named[index] as DeviceLayer;
    copy = {
      ...clone(source),
      id: nextId({ ...draft, layers: named }, "phone"),
      x: source.x + 8,
      y: source.y + 6,
    };
    const layers = [...named];
    layers.splice(index + 1, 0, copy);
    return { draft: { ...draft, layers }, index: index + 1 };
  } else {
    return null;
  }
  const layers = [...draft.layers];
  layers.splice(index + 1, 0, copy);
  return { draft: { ...draft, layers }, index: index + 1 };
}

/** Moves a layer one step toward the front (+1) or the back (-1). */
export function reorderLayer(
  draft: Template,
  index: number,
  step: 1 | -1,
): { draft: Template; index: number } {
  const to = index + step;
  if (!draft.layers[index] || to < 0 || to >= draft.layers.length) return { draft, index };
  const layers = [...draft.layers];
  [layers[index], layers[to]] = [layers[to], layers[index]];
  return { draft: { ...draft, layers }, index: to };
}

export function canAddCallout(draft: Template): boolean {
  return nextCardIndex(draft) !== null;
}

function nextCardIndex(draft: Template): number | null {
  const used = new Set(draft.layers.flatMap((l) => (l.type === "callout" ? [l.index] : [])));
  for (let i = 0; i < MAX_CARDS; i++) if (!used.has(i)) return i;
  return null;
}

/** Adds a feature card (shows the slide's card text) in front of the phones. */
export function addCallout(draft: Template): { draft: Template; index: number } | null {
  const slot = nextCardIndex(draft);
  if (slot === null) return null;
  const card: Layer = {
    type: "callout",
    id: nextId(draft, "card"),
    index: slot,
    x: 6,
    y: 50 + slot * 32,
    w: 38,
    fontSize: 3.2,
    look: "glass",
    icon: "number",
    accentColor: "{brand-pop}",
  };
  const lastDevice = draft.layers.map((l) => l.type).lastIndexOf("device");
  const at = lastDevice === -1 ? draft.layers.length : lastDevice + 1;
  const layers = [...draft.layers];
  layers.splice(at, 0, card);
  return { draft: { ...draft, layers }, index: at };
}

/** Where a layer with this id sits now (used to select a layer that was just added). */
export function indexOfId(draft: Template, id: string | undefined): number {
  return id === undefined ? -1 : draft.layers.findIndex((l) => l.id === id);
}

/** Adds a shape and returns it with its index so the editor can select it. */
export function addShapeSelected(draft: Template, kind: ShapeKind): { draft: Template; index: number } {
  const next = addShape(draft, kind);
  const id = nextId(draft, "shape");
  return { draft: next, index: indexOfId(next, id) };
}

/** Adds a phone (a copy of the first one) and returns it with its index. */
export function addPhoneSelected(draft: Template): { draft: Template; index: number } | null {
  if (layerIndexes(draft, "device").length >= MAX_PHONES) return null;
  const next = addPhone(draft);
  if (next === draft) return null;
  return { draft: next, index: next.layers.length - 1 };
}

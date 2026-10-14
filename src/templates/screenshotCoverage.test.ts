import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";

import { renderSlide } from "@/renderer/renderSlide";
import { nodeCanvas } from "@/renderer/testUtils";
import type { Layer, Template } from "@/types";

import { TEMPLATES } from "./index";
import { pickDesign } from "./promptDesigns";

/**
 * The user's screenshot must never lose content in the middle where a phone is cut.
 * Every pixel of the test screenshot encodes its own (u, v) position, so after rendering we
 * can count how much of the original image is still visible on the canvas.
 */
const W = 540;
const H = 960;
const BINS_U = 20;
const BINS_V = 40;
const SEEDS = Array.from({ length: 150 }, (_, i) => (i + 1) * 7919);

function positionImage() {
  const c = createCanvas(234, 506);
  const g = c.getContext("2d");
  const data = g.createImageData(234, 506);
  for (let y = 0; y < 506; y++) {
    for (let x = 0; x < 234; x++) {
      const i = (y * 234 + x) * 4;
      data.data[i] = (x / 233) * 255;
      data.data[i + 1] = (y / 505) * 255;
      data.data[i + 2] = 128;
      data.data[i + 3] = 255;
    }
  }
  g.putImageData(data, 0, 0);
  return c;
}

const image = positionImage();

/** Share of the screenshot visible: whole image, top 60%, and the centre strip (where cuts happen). */
function visible(devices: Layer[]) {
  const template = {
    id: "coverage",
    name: "coverage",
    background: { type: "solid", color: "#000000" },
    supports: ["phone", "tablet"],
    layers: devices,
  } as unknown as Template;
  const canvas = nodeCanvas(W, H) as unknown as { getContext(k: "2d"): never };
  const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
  renderSlide(
    {
      id: "s",
      name: "s",
      blob: new Blob([]),
      width: 234,
      height: 506,
      headline: "",
      subheadline: "",
      bullets: [],
      deviceFrame: false,
      fit: "cover",
      image: image as never,
      brand: { color: "#6D28D9", font: "Inter" },
      index: 0,
      count: 1,
    },
    template,
    { width: W, height: H, kind: "phone" },
    ctx as never,
  );
  const px = ctx.getImageData(0, 0, W, H).data;
  const seen = new Set<number>();
  for (let i = 0; i < px.length; i += 4) {
    if (Math.abs(px[i + 2] - 128) > 6) continue;
    const u = Math.min(BINS_U - 1, Math.floor((px[i] / 255) * BINS_U));
    const v = Math.min(BINS_V - 1, Math.floor((px[i + 1] / 255) * BINS_V));
    seen.add(v * BINS_U + u);
  }
  const share = (u0: number, u1: number, v1: number) => {
    let hit = 0;
    let total = 0;
    for (let v = 0; v < v1; v++) {
      for (let u = u0; u < u1; u++) {
        total++;
        if (seen.has(v * BINS_U + u)) hit++;
      }
    }
    return hit / total;
  };
  return {
    all: share(0, BINS_U, BINS_V),
    top: share(0, BINS_U, BINS_V * 0.6),
    centre: share(8, 12, BINS_V),
  };
}

/** Effects that only paint over pixels are removed so we measure placement, not decoration. */
function plain(layer: Layer): Layer {
  if (layer.type !== "device") return layer;
  const rest: Record<string, unknown> = { ...layer, shadow: false };
  for (const key of ["depth", "depthAngle", "depthColor", "gloss", "rim", "dim", "cutGlow", "frameStyle"]) {
    delete rest[key];
  }
  return rest as unknown as Layer;
}

function devicesOf(devicesText: string): Layer[] {
  return [...devicesText.matchAll(/\{ "frame".*\}/g)].map((m) =>
    plain({ type: "device", ...JSON.parse(m[0]) } as Layer),
  );
}

describe("built-in split templates (the bar to match)", () => {
  it("show the whole screenshot", () => {
    const split = TEMPLATES.filter((t) => t.layers.some((l) => l.type === "device" && l.cuts?.length));
    expect(split.length).toBeGreaterThan(5);
    for (const t of split) {
      const v = visible(t.layers.filter((l) => l.type === "device").map(plain));
      expect(v.top, t.id).toBeGreaterThanOrEqual(0.99);
      expect(v.centre, t.id).toBeGreaterThanOrEqual(0.95);
    }
  });
});

describe.each(["split", "3d"] as const)("generated %s designs", (family) => {
  it("keep the screenshot content complete, including where phones are cut", () => {
    let checked = 0;
    for (const seed of SEEDS) {
      const { design } = pickDesign("wow", seed, TEMPLATES);
      if (design.family !== family) continue;
      // Dimmed ghost phones only repeat the picture; the main phones must carry all of it.
      const main = devicesOf(design.devices).filter(
        (l) => l.type === "device" && !/"dim"/.test(JSON.stringify(l)),
      );
      const v = visible(main);
      const label = `${design.mood} @ ${seed}`;
      expect(v.top, label).toBeGreaterThanOrEqual(0.97);
      expect(v.all, label).toBeGreaterThanOrEqual(0.9);
      expect(v.centre, label).toBeGreaterThanOrEqual(0.9);
      checked++;
    }
    expect(checked).toBeGreaterThan(10);
  });
});

import { describe, expect, it } from "vitest";

import type { DeviceLayer, Template } from "@/types";

import { getTemplate, validateTemplate } from "./index";
import {
  addPhone,
  addShape,
  finishTemplate,
  layerIndexes,
  patchLayer,
  removeLayer,
  startDraft,
} from "./builderModel";

const base = getTemplate("classic-top");

describe("template builder model", () => {
  it("starts from a copy without the source template's identity, thumbnail or tablet tweaks", () => {
    const draft = startDraft(getTemplate("slice-duo"));
    expect(draft.tabletOverrides).toBeUndefined();
    expect(draft.thumbnail).toBeUndefined();
    expect(draft.category).toBeUndefined();
    draft.layers.pop();
    expect(getTemplate("slice-duo").layers.length).toBeGreaterThan(draft.layers.length);
  });

  it("edits and removes layers without touching the original", () => {
    const draft = startDraft(base);
    const [phone] = layerIndexes(draft, "device");
    const edited = patchLayer(draft, phone, { rotate: 12 });
    expect((edited.layers[phone] as DeviceLayer).rotate).toBe(12);
    expect((draft.layers[phone] as DeviceLayer).rotate).not.toBe(12);
    expect(removeLayer(edited, phone).layers.some((l) => l.type === "device")).toBe(false);
  });

  it("adds shapes behind the text and phones, with unique ids", () => {
    let draft = startDraft(base);
    draft = addShape(draft, "glow");
    draft = addShape(draft, "glow");
    const firstForeground = draft.layers.findIndex((l) => l.type !== "shape");
    expect(
      draft.layers.slice(0, firstForeground).filter((l) => l.type === "shape").length,
    ).toBeGreaterThanOrEqual(2);
    const ids = draft.layers.filter((l) => l.type === "shape" && l.id).map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("adds a second phone as a copy of the first", () => {
    const draft = addPhone(startDraft(base));
    expect(layerIndexes(draft, "device")).toHaveLength(2);
  });

  it("finishes a valid custom template filed under My templates", () => {
    const done = finishTemplate(addPhone(startDraft(base)), "custom-1", "Mine");
    expect(validateTemplate(done as Template)).toEqual([]);
    expect(done.custom).toBe(true);
    expect(done.category).toBe("custom");
    expect(done.tabletOverrides).toBeUndefined();
  });
});

describe("subheadline toggle", () => {
  it("removes and restores the subheadline layer", async () => {
    const { setSubheadline, textIndex } = await import("./builderModel");
    const draft = startDraft(base);
    const off = setSubheadline(draft, false);
    expect(textIndex(off, "subheadline")).toBe(-1);
    const on = setSubheadline(off, true);
    expect(textIndex(on, "subheadline")).not.toBe(-1);
    expect(setSubheadline(on, true).layers).toHaveLength(on.layers.length);
  });
});

describe("custom templates from any starting design", () => {
  it("every built-in template can be copied, finished and rendered at phone and tablet sizes", async () => {
    const { TEMPLATES, parseTemplateJson } = await import("./index");
    const { renderSlidePng } = await import("@/renderer/pipeline");
    const { fakeScreenshot, nodeCanvas } = await import("@/renderer/testUtils");
    const { readPngInfo } = await import("@/renderer/png");
    const { image, slide } = fakeScreenshot();
    for (const source of TEMPLATES) {
      const copy = finishTemplate(addShape(startDraft(source), "glow"), `custom-${source.id}`, "Mine");
      expect(validateTemplate(copy), source.id).toEqual([]);
      for (const output of [
        { folder: "p", label: "p", width: 1080, height: 1920, kind: "phone" as const },
        { folder: "t", label: "t", width: 1440, height: 2560, kind: "tablet" as const },
      ]) {
        const png = await renderSlidePng(nodeCanvas, {
          slide,
          template: copy,
          brand: { color: "#6D28D9", font: "Inter" },
          output,
          index: 0,
          count: 1,
          image,
        });
        expect(readPngInfo(png).colorType, `${source.id} ${output.folder}`).toBe(2);
      }
    }
    expect(parseTemplateJson(JSON.stringify(startDraft(TEMPLATES[0]))).errors).toEqual([]);
  });

  it("accepts the sample template JSON from the project brief", async () => {
    const { parseTemplateJson } = await import("./index");
    const sample = {
      id: "gradient-pop",
      name: "Gradient Pop",
      thumbnail: "/templates/gradient-pop.png",
      background: { type: "gradient", angle: 135, stops: ["{brand}", "#1E1B4B"] },
      layers: [
        {
          type: "text",
          role: "headline",
          x: 8,
          y: 6,
          w: 84,
          fontSize: 6.5,
          weight: 800,
          align: "center",
          color: "#FFFFFF",
        },
        {
          type: "text",
          role: "subheadline",
          x: 10,
          y: 15,
          w: 80,
          fontSize: 3.2,
          align: "center",
          color: "#E5E7EB",
        },
        { type: "device", frame: "phone-generic", x: 15, y: 24, w: 70, rotate: 0, shadow: true },
      ],
      supports: ["phone", "tablet"],
    };
    const parsed = parseTemplateJson(JSON.stringify(sample));
    expect(parsed.errors).toEqual([]);
    expect(parsed.template?.custom).toBe(true);
  });
});

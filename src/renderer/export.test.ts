import { describe, expect, it } from "vitest";

import { meetsGooglePlayFormat, PRESETS, isKnownStoreSize, validateCustomSize } from "@/config/storePresets";
import { buildOutputs } from "@/export/outputs";
import { lintHeadline } from "@/validation/lint";
import { TEMPLATES, validateTemplate } from "@/templates";

import { renderSlidePng, runExport } from "./pipeline";
import { readPngInfo } from "./png";
import { renderSlide } from "./renderSlide";
import { fakeScreenshot, nodeCanvas } from "./testUtils";

const brand = { color: "#6D28D9", font: "Inter" };
const allOutputs = buildOutputs({
  presetIds: PRESETS.map((p) => p.id),
  customSizes: [{ id: "c", width: 1600, height: 3200, label: "" }],
});

describe("store presets", () => {
  it("match the documented sizes exactly", () => {
    const size = (id: string) => {
      const p = PRESETS.find((x) => x.id === id)!;
      return [p.width, p.height];
    };
    expect(size("gp-phone")).toEqual([1080, 1920]);
    expect(size("gp-tablet-7")).toEqual([1440, 2560]);
    expect(size("gp-tablet-10")).toEqual([1440, 2560]);
    expect(size("as-iphone-6.3")).toEqual([1206, 2622]);
    expect(size("as-iphone-6.9")).toEqual([1320, 2868]);
    expect(size("as-iphone-6.5")).toEqual([1284, 2778]);
    expect(size("as-ipad-13")).toEqual([2064, 2752]);
  });

  it("Google Play screenshot presets satisfy the format rules (the feature graphic has its own rules)", () => {
    for (const p of PRESETS.filter((x) => x.store === "google-play" && !x.singleImage)) {
      expect(meetsGooglePlayFormat(p.width, p.height)).toBe(true);
    }
  });

  it("has unique ids and folders per id", () => {
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(PRESETS.length);
    expect(new Set(PRESETS.map((p) => p.folder)).size).toBe(PRESETS.length);
  });

  it("recognises store sizes and validates custom ones", () => {
    expect(isKnownStoreSize(1080, 1920)).toBe(true);
    expect(isKnownStoreSize(1920, 1080)).toBe(true);
    expect(isKnownStoreSize(1179, 2556)).toBe(true);
    expect(isKnownStoreSize(1600, 3200)).toBe(false);
    expect(validateCustomSize(1600, 3200)).toBeNull();
    expect(validateCustomSize(100, 3200)).not.toBeNull();
    expect(validateCustomSize(9000, 3200)).not.toBeNull();
  });
});

describe("headline lint", () => {
  it("flags discouraged words", () => {
    expect(lintHeadline("The Best app")).toHaveLength(1);
    expect(lintHeadline("#1 in tools")).toHaveLength(1);
    expect(lintHeadline("Free forever, download now")).toHaveLength(2);
    expect(lintHeadline("Plan your day")).toHaveLength(0);
  });
});

describe("templates", () => {
  it("ships at least 8 valid templates", () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(8);
    for (const t of TEMPLATES) expect(validateTemplate(t), t.id).toEqual([]);
  });

  it("renders every template at every preset: exact size, PNG without alpha", async () => {
    const { image, slide } = fakeScreenshot();
    for (const template of TEMPLATES) {
      for (const output of allOutputs) {
        const png = await renderSlidePng(nodeCanvas, {
          slide,
          template,
          brand,
          output,
          index: 1,
          count: 3,
          image,
        });
        const info = readPngInfo(png);
        const label = `${template.id} @ ${output.folder}`;
        expect([info.width, info.height], label).toEqual([output.width, output.height]);
        expect(info.colorType, `${label} must be RGB without alpha`).toBe(2);
      }
    }
    // Renders every template at every preset, so it grows with each template added.
  }, 360_000);

  it("renders frameless without throwing", async () => {
    const { image, slide } = fakeScreenshot();
    for (const template of TEMPLATES) {
      const canvas = nodeCanvas(540, 960);
      const ctx = canvas.getContext("2d")!;
      const report = renderSlide(
        { ...slide, deviceFrame: false, brand, index: 0, count: 1, image },
        template,
        { width: 540, height: 960 },
        ctx,
      );
      expect(report.textAreaRatio).toBeLessThan(0.2);
    }
  });
});

describe("preview and export agree", () => {
  const PREVIEW = { width: 270, height: 480 };
  const EXPORT = { width: 1080, height: 1920 };

  function draw(size: { width: number; height: number }, templateIndex: number) {
    const { image, slide } = fakeScreenshot();
    const canvas = nodeCanvas(size.width, size.height);
    const ctx = canvas.getContext("2d")!;
    renderSlide({ ...slide, brand, index: 0, count: 1, image }, TEMPLATES[templateIndex], size, ctx);
    return canvas;
  }

  it.each(TEMPLATES.map((t, i) => [t.id, i] as const))(
    "%s: preview matches the downscaled export",
    (_id, index) => {
      const preview = draw(PREVIEW, index);
      const shrunk = nodeCanvas(PREVIEW.width, PREVIEW.height);
      const shrunkCtx = shrunk.getContext("2d")!;
      shrunkCtx.drawImage(draw(EXPORT, index) as never, 0, 0, PREVIEW.width, PREVIEW.height);

      const a = preview.getContext("2d")!.getImageData(0, 0, PREVIEW.width, PREVIEW.height).data;
      const b = shrunkCtx.getImageData(0, 0, PREVIEW.width, PREVIEW.height).data;
      let total = 0;
      let far = 0;
      for (let i = 0; i < a.length; i += 4) {
        const diff =
          (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2])) / 3;
        total += diff;
        if (diff > 64) far++;
      }
      const pixels = a.length / 4;
      expect(total / pixels, "mean difference per channel").toBeLessThan(4);
      expect(far / pixels, "share of clearly different pixels").toBeLessThan(0.03);
    },
  );

  it("is deterministic: drawing twice gives the same pixels", () => {
    const first = draw(PREVIEW, 1).getContext("2d")!.getImageData(0, 0, PREVIEW.width, PREVIEW.height).data;
    const second = draw(PREVIEW, 1).getContext("2d")!.getImageData(0, 0, PREVIEW.width, PREVIEW.height).data;
    expect(Buffer.from(first.buffer).equals(Buffer.from(second.buffer))).toBe(true);
  });
});

describe("outputs", () => {
  it("adds rotated landscape copies except for single-image outputs", () => {
    const outputs = buildOutputs({ presetIds: ["gp-phone", "gp-feature"], customSizes: [], landscape: true });
    const sizes = outputs.map((o) => `${o.folder} ${o.width}x${o.height}`);
    expect(sizes).toContain("google-play/phone 1080x1920");
    expect(sizes).toContain("google-play/phone-landscape 1920x1080");
    expect(sizes).toContain("google-play/feature-graphic 1024x500");
    expect(sizes).not.toContain("google-play/feature-graphic-landscape 500x1024");
  });

  it("exports the feature graphic from the first slide only", async () => {
    const { image, slide } = fakeScreenshot();
    const files: string[] = [];
    await runExport(
      nodeCanvas,
      {
        sets: [{ prefix: "", slides: [slide, { ...slide, id: "s2" }] }],
        template: TEMPLATES[0],
        brand,
        outputs: buildOutputs({ presetIds: ["gp-feature"], customSizes: [] }),
      },
      async () => image,
      (file) => {
        files.push(file.path);
      },
    );
    expect(files).toEqual(["google-play/feature-graphic/01.png"]);
  });
});

import { describe, expect, it } from "vitest";

import { buildOutputs } from "@/export/outputs";
import { getTemplate } from "@/templates";

import { runExport, templateForSlide, type ExportFile, type ExportJob } from "./pipeline";
import { fakeScreenshot, nodeCanvas } from "./testUtils";

const brand = { color: "#6D28D9", font: "Inter" };
const classic = getTemplate("classic-top");
const sliced = getTemplate("slice-duo");

describe("a different template per screenshot", () => {
  it("uses the slide's own template and falls back to the default", () => {
    const { slide } = fakeScreenshot();
    const job = { template: classic, templates: [sliced] };
    expect(templateForSlide(job, slide).id).toBe("classic-top");
    expect(templateForSlide(job, { ...slide, templateId: "slice-duo" }).id).toBe("slice-duo");
    expect(templateForSlide(job, { ...slide, templateId: "missing" }).id).toBe("classic-top");
  });

  it("renders a slide with its own template differently from the default", async () => {
    const { image, slide } = fakeScreenshot();
    const files: ExportFile[] = [];
    const job: ExportJob = {
      sets: [{ prefix: "", slides: [slide, { ...slide, id: "s2", templateId: "slice-duo" }] }],
      template: classic,
      templates: [sliced],
      brand,
      outputs: buildOutputs({ presetIds: ["gp-phone"], customSizes: [] }),
    };

    await runExport(
      nodeCanvas,
      job,
      async () => image,
      (file) => {
        files.push(file);
      },
    );

    expect(files.map((f) => f.path)).toEqual(["google-play/phone/01.png", "google-play/phone/02.png"]);
    expect(Buffer.from(files[0].data).equals(Buffer.from(files[1].data))).toBe(false);
  });
});

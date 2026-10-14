import { describe, expect, it } from "vitest";

import type { Slide } from "@/types";

import { summarizeProject, type ProjectContents } from "./projectSummary";

const slide = { id: "1", name: "home.png" } as Slide;
const empty: ProjectContents = {
  slides: [slide],
  presetIds: [],
  customSizes: [],
  landscape: false,
  templateId: null,
  customTemplates: [],
  brand: { color: "#6D28D9", font: "Inter" },
  locales: ["en"],
};

describe("summarizeProject", () => {
  it("lists only the screenshot for an untouched project", () => {
    expect(summarizeProject(empty)).toEqual(["1 screenshot: home.png"]);
  });

  it("lists everything the user added", () => {
    const lines = summarizeProject({
      ...empty,
      presetIds: ["gp-phone", "as-ipad-13"],
      customSizes: [{ id: "c", width: 1600, height: 3200, label: "Web ad" }],
      landscape: true,
      templateId: "tilted-3d",
      locales: ["en", "es"],
      brand: { color: "#112233", font: "Poppins" },
    });
    expect(lines).toEqual([
      "1 screenshot: home.png",
      'Store sizes: Google Play Phone, App Store iPad 13"',
      "Custom sizes: Web ad 1600×3200",
      "Landscape variants switched on",
      "Template: Tilted 3D",
      "Languages: English, Spanish (including translated text)",
      "Brand: #112233, Poppins",
    ]);
  });
});

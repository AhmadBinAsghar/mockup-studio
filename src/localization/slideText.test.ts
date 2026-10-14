import { describe, expect, it } from "vitest";

import type { Slide } from "@/types";

import { buildExportSets, localizeSlide, textFor, textPatch } from "./slideText";

const slide: Slide = {
  id: "1",
  name: "a.png",
  blob: new Blob([]),
  width: 100,
  height: 200,
  headline: "Hello",
  subheadline: "World",
  bullets: ["a", "b", "c"],
};

describe("localisation", () => {
  it("edits the base text for the default language", () => {
    expect(textPatch(slide, "en", { headline: "Hi" })).toEqual({ headline: "Hi" });
  });

  it("stores other languages as translations and falls back to the base text", () => {
    expect(textFor(slide, "es").headline).toBe("Hello");
    const patched = { ...slide, ...textPatch(slide, "es", { headline: "Hola" }) };
    expect(textFor(patched, "es")).toMatchObject({ headline: "Hola", subheadline: "World" });
    expect(localizeSlide(patched, "es").headline).toBe("Hola");
    expect(patched.headline).toBe("Hello");
  });

  it("only prefixes folders when there is more than one language", () => {
    expect(buildExportSets([slide], ["en"])).toEqual([{ prefix: "", slides: [slide] }]);
    const sets = buildExportSets([slide], ["en", "es"]);
    expect(sets.map((s) => s.prefix)).toEqual(["en/", "es/"]);
  });
});

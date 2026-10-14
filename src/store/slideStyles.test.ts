import { describe, expect, it } from "vitest";

import type { Slide } from "@/types";

import { migrateLegacyStyles, styleFor, withoutStyle, withStyle } from "./slideStyles";

const slide = { id: "a", name: "a.png" } as Slide;

describe("per-design slide styles", () => {
  it("keeps a background and text color for each design separately", () => {
    let s = withStyle(slide, "tilted-3d", { background: { type: "solid", color: "#111111" } });
    s = withStyle(s, "tilted-3d", { textColor: "#FFFFFF" });
    s = withStyle(s, "inferno", { textColor: "#FF0000" });
    expect(styleFor(s, "tilted-3d")).toEqual({
      background: { type: "solid", color: "#111111" },
      textColor: "#FFFFFF",
    });
    expect(styleFor(s, "inferno")).toEqual({ textColor: "#FF0000" });
    expect(styleFor(s, "classic-top")).toEqual({});
  });

  it("clears one field, drops empty entries and leaves other designs alone", () => {
    let s = withStyle(slide, "a", { textColor: "#FFFFFF" });
    s = withStyle(s, "b", { textColor: "#000000" });
    s = withoutStyle(s, "a", "textColor");
    expect(s.styles).toEqual({ b: { textColor: "#000000" } });
    expect(withoutStyle(s, "b", "textColor").styles).toBeUndefined();
  });

  it("moves old whole-screenshot colors onto the design they were set for", () => {
    const old = {
      slides: [
        { id: "a", background: { type: "solid", color: "#222222" }, textColor: "#EEEEEE" },
        { id: "b" },
      ],
      templateId: "classic-top",
    };
    const migrated = migrateLegacyStyles(old as never) as { slides: Slide[] };
    expect(migrated.slides[0]).not.toHaveProperty("background");
    expect(styleFor(migrated.slides[0], "classic-top")).toEqual({
      background: { type: "solid", color: "#222222" },
      textColor: "#EEEEEE",
    });
    expect(migrated.slides[1].styles).toBeUndefined();
  });
});

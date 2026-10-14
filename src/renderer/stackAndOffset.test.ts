import { describe, expect, it } from "vitest";

import type { Template, TextLayer } from "@/types";
import { getTemplate } from "@/templates";

import { renderSlide, type RenderableSlide } from "./renderSlide";
import { fakeScreenshot, nodeCanvas } from "./testUtils";

const brand = { color: "#6D28D9", font: "Inter" };
const size = { width: 540, height: 960, kind: "phone" as const };

function render(slide: Partial<RenderableSlide>, template: Template): Buffer {
  const { image, slide: base } = fakeScreenshot();
  const canvas = nodeCanvas(size.width, size.height) as unknown as {
    getContext(k: "2d"): never;
    toBuffer(m: "image/png"): Buffer;
  };
  renderSlide(
    { ...base, image, brand, index: 0, count: 1, ...slide },
    template,
    size,
    canvas.getContext("2d"),
  );
  return canvas.toBuffer("image/png");
}

function withSubheadline(patch: Partial<TextLayer>): Template {
  const t = getTemplate("classic-top");
  return {
    ...t,
    layers: t.layers.map((l) =>
      l.type === "text" && l.role === "subheadline" ? { ...l, stackBelow: "headline", ...patch } : l,
    ),
  };
}

describe("stackBelow subheadline", () => {
  it("treats a large absolute y as a small gap instead of dropping under the phone", () => {
    const absolute = render({}, withSubheadline({ y: 21 }));
    const farther = render({}, withSubheadline({ y: 60 }));
    const gap = render({}, withSubheadline({ y: 2 }));
    expect(absolute.equals(farther)).toBe(true);
    expect(absolute.equals(gap)).toBe(false);
  });
});

describe("screenshot position", () => {
  const t = getTemplate("classic-top");

  it("moves the device when an offset or size is set", () => {
    const base = render({}, t);
    expect(render({ deviceOffsetY: 10 }, t).equals(base)).toBe(false);
    expect(render({ deviceOffsetX: -8 }, t).equals(base)).toBe(false);
    expect(render({ deviceScale: 0.8 }, t).equals(base)).toBe(false);
  });

  it("renders identically to the default when reset", () => {
    const base = render({}, t);
    expect(render({ deviceOffsetX: 0, deviceOffsetY: 0, deviceScale: 1 }, t).equals(base)).toBe(true);
  });
});

import { describe, expect, it } from "vitest";

import { placeImage, resolveFit } from "./fit";

const screen = { x: 100, y: 200, w: 400, h: 800 };

describe("resolveFit", () => {
  it("crops when the screenshot matches the screen", () => {
    expect(resolveFit("auto", 0.48, 0.5)).toBe("cover");
  });

  it("shows the whole image when the shape differs (e.g. a document or landscape capture)", () => {
    expect(resolveFit("auto", 0.707, 0.5)).toBe("contain");
    expect(resolveFit("auto", 1.6, 0.5)).toBe("contain");
  });

  it("respects an explicit choice", () => {
    expect(resolveFit("cover", 1.6, 0.5)).toBe("cover");
    expect(resolveFit("contain", 0.5, 0.5)).toBe("contain");
  });
});

describe("placeImage", () => {
  it("contain keeps the full image and centres it", () => {
    const { source, dest } = placeImage("contain", 2100, 2970, screen);
    expect(source).toEqual({ x: 0, y: 0, w: 2100, h: 2970 });
    expect(dest.w).toBeLessThanOrEqual(screen.w);
    expect(dest.h).toBeLessThanOrEqual(screen.h);
    expect(dest.w / dest.h).toBeCloseTo(2100 / 2970);
    expect(dest.x + dest.w / 2).toBeCloseTo(screen.x + screen.w / 2);
    expect(dest.y + dest.h / 2).toBeCloseTo(screen.y + screen.h / 2);
  });

  it("cover fills the screen and crops the source", () => {
    const { source, dest } = placeImage("cover", 2000, 1000, screen);
    expect(dest).toEqual(screen);
    expect(source.h).toBe(1000);
    expect(source.w).toBeCloseTo(500);
  });
});

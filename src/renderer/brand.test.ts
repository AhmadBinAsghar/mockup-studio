import { describe, expect, it } from "vitest";

import { applyBrandTokens, brandTokens } from "./brand";

describe("brand colour tokens", () => {
  it("keeps the brand colour and derives lighter, darker and shifted shades", () => {
    const t = brandTokens("#6D28D9");
    expect(t.brand).toBe("#6D28D9");
    const lum = (hex: string) =>
      parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16);
    expect(lum(t["brand-light"])).toBeGreaterThan(lum(t.brand));
    expect(lum(t["brand-pale"])).toBeGreaterThan(lum(t["brand-light"]));
    expect(lum(t["brand-dark"])).toBeLessThan(lum(t.brand));
    expect(lum(t["brand-deep"])).toBeLessThan(lum(t["brand-dark"]));
    expect(t["brand-pop"]).not.toBe(t.brand);
    for (const value of Object.values(t)) expect(value).toMatch(/^#[0-9A-F]{6}$/);
  });

  it("replaces every token in template JSON and leaves unknown braces alone", () => {
    const out = applyBrandTokens('{"a":"{brand}","b":"{brand-deep}","c":"{other}"}', "#FF0000");
    expect(out).toContain('"a":"#FF0000"');
    expect(out).toContain('"b":"#');
    expect(out).not.toContain("{brand");
    expect(out).toContain("{other}");
  });

  it("falls back to the given value when the brand is not a hex colour", () => {
    expect(brandTokens("rebeccapurple")["brand-light"]).toBe("rebeccapurple");
  });
});

describe("tinting a themed template to the brand colour", () => {
  it("rotates colourful colours to the brand hue and leaves white, black and greys alone", async () => {
    const { tintHexColors } = await import("./brand");
    const out = tintHexColors('["#EF4444","#FFFFFF","#000000","#808080"]', "#16A34A", "#EF4444");
    const [tinted, white, black, grey] = JSON.parse(out) as string[];
    expect(tinted).not.toBe("#EF4444");
    const g = parseInt(tinted.slice(3, 5), 16);
    const r = parseInt(tinted.slice(1, 3), 16);
    expect(g).toBeGreaterThan(r);
    expect([white, black, grey]).toEqual(["#FFFFFF", "#000000", "#808080"]);
  });

  it("changes nothing when the theme colour already matches the brand", async () => {
    const { tintHexColors } = await import("./brand");
    expect(tintHexColors('"#EF4444"', "#EF4444", "#EF4444")).toBe('"#EF4444"');
  });
});

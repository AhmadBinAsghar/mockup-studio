import { describe, expect, it } from "vitest";

import type { DeviceLayer, Template } from "@/types";

import { resolveTemplate, toTabletLayout } from "./resolve";

const device = (patch: Partial<DeviceLayer> = {}): DeviceLayer => ({
  type: "device",
  frame: "phone-generic",
  x: 20,
  y: 40,
  w: 60,
  ...patch,
});

const template = (layers: DeviceLayer[]): Template => ({
  id: "t",
  name: "T",
  background: { type: "solid", color: "#fff" },
  layers,
  supports: ["phone", "tablet"],
});

describe("automatic tablet layout", () => {
  it("swaps in the tablet frame, widens the phone and keeps it centred on the same spot", () => {
    const [out] = toTabletLayout(template([device()])).layers as DeviceLayer[];
    expect(out.frame).toBe("tablet-generic");
    expect(out.w).toBeGreaterThan(60);
    expect(out.x + out.w / 2).toBeCloseTo(50, 5);
  });

  it("keeps a bleeding phone bottom-aligned and never grows past the canvas width", () => {
    const [out] = toTabletLayout(template([device({ bleed: true, w: 90, x: 5 })])).layers as DeviceLayer[];
    expect(out.w).toBeLessThanOrEqual(94);
    expect(out.y).toBeGreaterThan(40);
  });

  it("is used for tablet sizes only when the template has no tabletOverrides of its own", () => {
    const plain = template([device()]);
    const tablet = resolveTemplate(plain, { width: 1440, height: 2560, kind: "tablet" }, "#6D28D9");
    expect((tablet.layers[0] as DeviceLayer).frame).toBe("tablet-generic");
    const phone = resolveTemplate(plain, { width: 1080, height: 1920 }, "#6D28D9");
    expect((phone.layers[0] as DeviceLayer).frame).toBe("phone-generic");

    const own = { ...plain, tabletOverrides: { layers: { device: { x: 3 } } } };
    const custom = resolveTemplate(own, { width: 1440, height: 2560, kind: "tablet" }, "#6D28D9");
    expect((custom.layers[0] as DeviceLayer).frame).toBe("phone-generic");
    expect((custom.layers[0] as DeviceLayer).x).toBe(3);
  });
});

describe("brand tint", () => {
  it("only recolours templates when tint is on and the template has a theme colour", () => {
    const themed = {
      ...template([device()]),
      themeColor: "#EF4444",
      background: { type: "solid", color: "#EF4444" },
    } as Template;
    const size = { width: 1080, height: 1920 };
    expect(resolveTemplate(themed, size, "#16A34A", false).background).toEqual({
      type: "solid",
      color: "#EF4444",
    });
    expect(resolveTemplate(themed, size, "#16A34A", true).background).not.toEqual({
      type: "solid",
      color: "#EF4444",
    });
    const noTheme = { ...themed, themeColor: undefined } as Template;
    expect(resolveTemplate(noTheme, size, "#16A34A", true).background).toEqual({
      type: "solid",
      color: "#EF4444",
    });
  });
});

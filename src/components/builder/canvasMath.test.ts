import { describe, expect, it } from "vitest";

import type { CalloutLayer, DeviceLayer, Layer, ShapeLayer, TextLayer } from "@/types";

import {
  boxAfter,
  handlesFor,
  isBackdrop,
  moveBy,
  rotationFor,
  scaleBy,
  snapMove,
  widthBy,
  type Box,
} from "./canvasMath";

const C = { width: 400, height: 711 };

const circle: ShapeLayer = { type: "shape", shape: "circle", x: 20, y: 30, w: 40 };
const circleBox: Box = { x: 80, y: 120, w: 160, h: 160 };
const text: TextLayer = { type: "text", role: "headline", x: 8, y: 6, w: 84, fontSize: 7 };
const textBox: Box = { x: 32, y: 24, w: 336, h: 60 };
const phone: DeviceLayer = { type: "device", frame: "phone-generic", x: 20, y: 30, w: 60 };
const phoneBox: Box = { x: 80, y: 120, w: 240, h: 240 / 0.462 };

describe("moving", () => {
  it("turns a pixel drag into percent of the canvas width", () => {
    expect(moveBy(circle, circleBox, 40, 20, C)).toEqual({ x: 30, y: 35 });
    expect(moveBy(phone, phoneBox, -40, 0, C)).toEqual({ bleed: true, x: 10, y: 30, w: 60 });
  });

  it("measures a height-based shape against the canvas height", () => {
    const band: ShapeLayer = { ...circle, yUnit: "height", y: 10 };
    expect(moveBy(band, circleBox, 0, 71.1, C)).toEqual({ x: 20, y: 20 });
  });

  it("shifts every point of a polygon", () => {
    const band: ShapeLayer = {
      type: "shape",
      shape: "polygon",
      x: 0,
      y: 0,
      w: 100,
      yUnit: "height",
      points: [
        [0, 60],
        [100, 50],
        [100, 60],
      ],
    };
    const patch = moveBy(band, circleBox, 40, 71.1, C) as { points: number[][] };
    expect(patch.points).toEqual([
      [10, 70],
      [110, 60],
      [110, 70],
    ]);
  });

  it("moves bottom-anchored text the opposite way", () => {
    const bottom: TextLayer = { ...text, anchor: "bottom", y: 10 };
    expect(moveBy(bottom, textBox, 0, 40, C)).toEqual({ x: 8, y: 0 });
  });

  it("turns a stacked subtitle into a free one at the position it was drawn", () => {
    const sub: TextLayer = { ...text, role: "subheadline", stackBelow: "headline", y: 2 };
    const patch = moveBy(sub, { x: 40, y: 100, w: 320, h: 30 }, 0, 20, C);
    expect(patch).toMatchObject({ stackBelow: undefined, x: 8, y: 30 });
    expect("stackBelow" in patch).toBe(true);
  });
});

describe("resizing", () => {
  it("scales a circle about its center", () => {
    const patch = scaleBy(circle, circleBox, 1.5, C) as { x: number; y: number; w: number };
    expect(patch.w).toBe(60);
    // The center stays at (40%, 30% + half the height).
    expect(patch.x + patch.w / 2).toBeCloseTo(40);
  });

  it("keeps an ellipse's proportions", () => {
    const ellipse: ShapeLayer = { ...circle, h: 20 };
    const patch = scaleBy(ellipse, { ...circleBox, h: 80 }, 2, C) as { w: number; h: number };
    expect(patch.w).toBe(80);
    expect(patch.h).toBe(40);
  });

  it("scales a phone about its center", () => {
    const patch = scaleBy(phone, phoneBox, 0.5, C) as { x: number; y: number; w: number };
    expect(patch.w).toBe(30);
    expect(patch.x + patch.w / 2).toBeCloseTo(50);
  });

  it("moves a phone that the renderer shrank from the size it is drawn at, so it does not jump", () => {
    const shrunk: Box = { x: 90, y: 200, w: 200, h: 200 / 0.462 };
    expect(moveBy(phone, shrunk, 0, 0, C)).toEqual({ bleed: true, x: 22.5, y: 50, w: 50 });
  });

  it("scales a polygon about the middle of its box", () => {
    const band: ShapeLayer = {
      type: "shape",
      shape: "polygon",
      x: 0,
      y: 0,
      w: 100,
      points: [
        [40, 40],
        [60, 40],
        [60, 60],
      ],
    };
    const box = { x: 160, y: 160, w: 80, h: 80 };
    const patch = scaleBy(band, box, 2, C) as { points: number[][] };
    expect(patch.points[0][0]).toBeCloseTo(30);
    expect(patch.points[1][0]).toBeCloseTo(70);
  });

  it("scales text by changing its font size, within limits", () => {
    expect(scaleBy(text, textBox, 2, C)).toEqual({ fontSize: 14 });
    expect(scaleBy(text, textBox, 100, C)).toEqual({ fontSize: 40 });
    expect(scaleBy(text, textBox, 0.01, C)).toEqual({ fontSize: 1 });
  });

  it("changes the width from either edge, keeping the other edge still", () => {
    expect(widthBy(text, "right", 40, C)).toEqual({ w: 94 });
    const left = widthBy(text, "left", 40, C) as { x: number; w: number };
    expect(left).toEqual({ x: 18, w: 74 });
    expect(left.x + left.w).toBe(text.x + text.w);
  });

  it("never makes a block thinner than a few percent", () => {
    expect(widthBy(text, "right", -4000, C)).toEqual({ w: 8 });
  });
});

describe("rotating", () => {
  const card: CalloutLayer = { type: "callout", index: 0, x: 4, y: 40, w: 30, fontSize: 3 };

  it("wraps angles and can snap to 15 degrees", () => {
    expect(rotationFor(circle, 190, false)).toEqual({ rotate: -170 });
    expect(rotationFor(circle, 22, true)).toEqual({ rotate: 15 });
    expect(rotationFor(circle, 23, true)).toEqual({ rotate: 30 });
  });

  it("keeps a card's tilt within the range the template format allows", () => {
    expect(rotationFor(card, 90, false)).toEqual({ rotate: 45 });
  });
});

describe("what each kind of layer can do", () => {
  it("offers the right handles", () => {
    expect(handlesFor(text)).toEqual(["left", "right", "scale", "rotate"]);
    expect(handlesFor(phone)).toEqual(["scale", "rotate"]);
    expect(handlesFor(circle)).toEqual(["scale", "rotate"]);
    expect(handlesFor({ ...circle, shape: "polygon" })).toEqual(["scale"]);
    expect(handlesFor({ type: "callout", index: 0, x: 0, y: 0, w: 10, fontSize: 3 } as Layer)).toEqual([
      "left",
      "right",
      "rotate",
    ]);
  });

  it("treats a canvas-sized glow as a backdrop, not a click target", () => {
    expect(isBackdrop({ x: -50, y: -50, w: 500, h: 800 }, C)).toBe(true);
    expect(isBackdrop(circleBox, C)).toBe(false);
  });

  it("shows the box a drag will produce", () => {
    expect(boxAfter("move", circleBox, { dx: 10, dy: -5, s: 1 })).toEqual({ x: 90, y: 115, w: 160, h: 160 });
    expect(boxAfter("scale", circleBox, { dx: 0, dy: 0, s: 0.5 })).toEqual({ x: 120, y: 160, w: 80, h: 80 });
    expect(boxAfter("right", circleBox, { dx: 20, dy: 0, s: 1 }).w).toBe(180);
    expect(boxAfter("left", circleBox, { dx: 20, dy: 0, s: 1 })).toMatchObject({ x: 100, w: 140 });
  });
});

describe("snapping", () => {
  it("pulls a box to the canvas center line", () => {
    const box = { x: 118, y: 100, w: 160, h: 100 };
    const snap = snapMove(box, [], C, 6);
    // The box center (198) is 2px from the canvas center (200).
    expect(snap.dx).toBe(2);
    expect(snap.guides).toContainEqual({ axis: "x", at: 200 });
  });

  it("pulls a box to another layer's edge", () => {
    const snap = snapMove({ x: 50, y: 300, w: 100, h: 60 }, [{ x: 200, y: 296, w: 100, h: 60 }], C, 6);
    expect(snap.dy).toBe(-4);
    expect(snap.guides).toContainEqual({ axis: "y", at: 296 });
  });

  it("leaves a box alone when nothing is close", () => {
    const snap = snapMove({ x: 60, y: 90, w: 50, h: 50 }, [{ x: 300, y: 500, w: 40, h: 40 }], C, 6);
    expect(snap).toEqual({ dx: 0, dy: 0, guides: [] });
  });
});

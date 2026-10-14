import { describe, expect, it } from "vitest";

import { cutPolygon, roundedRectPoints, type Point } from "./cuts";

const body = { x: 100, y: 200, w: 400, h: 800 };
const RADIUS = 60;
const VERTICAL = { x1: 0.5, y1: -0.1, x2: 0.5, y2: 1.1 };
const DIAGONAL = { x1: -0.1, y1: 0.6, x2: 1.1, y2: 0.4 };

function area(points: Point[]): number {
  let sum = 0;
  points.forEach(([x, y], i) => {
    const [nx, ny] = points[(i + 1) % points.length];
    sum += x * ny - nx * y;
  });
  return Math.abs(sum) / 2;
}

describe("device cuts", () => {
  const whole = area(roundedRectPoints(body, RADIUS));

  it("two complementary pieces add up to the whole phone", () => {
    for (const line of [VERTICAL, DIAGONAL]) {
      const a = cutPolygon(body, RADIUS, [{ ...line, keep: "left" }]);
      const b = cutPolygon(body, RADIUS, [{ ...line, keep: "right" }]);
      expect(area(a) + area(b)).toBeCloseTo(whole, 3);
      expect(area(a)).toBeGreaterThan(0);
      expect(area(b)).toBeGreaterThan(0);
    }
  });

  it("a vertical cut in the middle keeps the east half as 'left' and the west half as 'right'", () => {
    const east = cutPolygon(body, RADIUS, [{ ...VERTICAL, keep: "left" }]);
    const west = cutPolygon(body, RADIUS, [{ ...VERTICAL, keep: "right" }]);
    expect(Math.min(...east.map((p) => p[0]))).toBeGreaterThanOrEqual(300 - 1e-6);
    expect(Math.max(...west.map((p) => p[0]))).toBeLessThanOrEqual(300 + 1e-6);
  });

  it("several cuts keep only the band between them", () => {
    const band = cutPolygon(body, RADIUS, [
      { x1: -0.1, y1: 0.3, x2: 1.1, y2: 0.3, keep: "right" },
      { x1: -0.1, y1: 0.6, x2: 1.1, y2: 0.6, keep: "left" },
    ]);
    const ys = band.map((p) => p[1]);
    expect(Math.min(...ys)).toBeCloseTo(200 + 0.3 * 800, 6);
    expect(Math.max(...ys)).toBeCloseTo(200 + 0.6 * 800, 6);
  });
});

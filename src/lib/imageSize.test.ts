import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";

import { readPngSize } from "./imageSize";

describe("reading a PNG's size from its header", () => {
  it("returns the real width and height without decoding the image", () => {
    const png = createCanvas(1170, 2532).toBuffer("image/png");
    expect(readPngSize(new Uint8Array(png.subarray(0, 24)))).toEqual({ width: 1170, height: 2532 });
  });

  it("returns null for anything that is not a PNG", () => {
    const jpeg = createCanvas(10, 10).toBuffer("image/jpeg");
    expect(readPngSize(new Uint8Array(jpeg.subarray(0, 24)))).toBeNull();
    expect(readPngSize(new Uint8Array(5))).toBeNull();
  });
});

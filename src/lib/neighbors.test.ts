import { describe, expect, it } from "vitest";

import type { Slide } from "@/types";

import { neighborsOf } from "./neighbors";

const slides = ["a", "b", "c"].map((id) => ({ id }) as Slide);

describe("neighbouring screenshots", () => {
  it("wraps around so the first and last slides also get both neighbours", () => {
    expect(neighborsOf(slides, 0)).toEqual({ prev: slides[2], next: slides[1] });
    expect(neighborsOf(slides, 1)).toEqual({ prev: slides[0], next: slides[2] });
    expect(neighborsOf(slides, 2)).toEqual({ prev: slides[1], next: slides[0] });
  });

  it("has no neighbours when there is only one screenshot", () => {
    expect(neighborsOf([slides[0]], 0)).toEqual({});
  });
});

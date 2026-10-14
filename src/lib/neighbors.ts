import type { Slide } from "@/types";

export interface Neighbors {
  prev?: Slide;
  next?: Slide;
}

export function neighborsOf(slides: Slide[], index: number): Neighbors {
  if (slides.length < 2 || index < 0) return {};
  return {
    prev: slides[(index - 1 + slides.length) % slides.length],
    next: slides[(index + 1) % slides.length],
  };
}

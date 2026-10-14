import { createCanvas } from "@napi-rs/canvas";

import type { CanvasFactory, ImageSource } from "./canvas";
import type { Slide } from "@/types";

export const nodeCanvas: CanvasFactory = (w, h) => createCanvas(w, h) as unknown as ReturnType<CanvasFactory>;

export function fakeScreenshot(width = 1170, height = 2532): { image: ImageSource; slide: Slide } {
  const c = createCanvas(width, height);
  const g = c.getContext("2d");
  const grad = g.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, "#22d3ee");
  grad.addColorStop(1, "#a855f7");
  g.fillStyle = grad;
  g.fillRect(0, 0, width, height);
  g.fillStyle = "rgba(255,255,255,0.85)";
  for (let i = 0; i < 6; i++)
    g.fillRect(width * 0.08, height * (0.12 + i * 0.13), width * 0.84, height * 0.09);
  const slide: Slide = {
    id: "s1",
    name: "fake.png",
    blob: new Blob([]),
    width,
    height,
    headline: "Plan your day with [ease]",
    subheadline: "Everything you need, in one place",
    bullets: [
      "Syncs everywhere|Your plans follow you on every device",
      "Works offline|No connection needed, anywhere",
      "Private by design|Your data stays on your device",
    ],
  };
  return { image: c as unknown as ImageSource, slide };
}

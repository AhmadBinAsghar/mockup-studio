import { describe, expect, it } from "vitest";

import { getTemplate } from "@/templates";

import { renderSlidePng } from "./pipeline";
import { fakeScreenshot, nodeCanvas } from "./testUtils";

const brand = { color: "#6D28D9", font: "Inter" };

async function png(templateId: string, styles?: Record<string, { background?: never; textColor?: string }>) {
  const { image, slide } = fakeScreenshot();
  return Buffer.from(
    await renderSlidePng(nodeCanvas, {
      slide: { ...slide, styles: styles as never },
      template: getTemplate(templateId),
      brand,
      output: { folder: "x", label: "x", width: 270, height: 480, kind: "phone" },
      index: 0,
      count: 1,
      image,
    }),
  );
}

const red = { type: "solid", color: "#FF0000" } as never;

describe("a background chosen for one design", () => {
  it("changes only that design, not the other templates of the same screenshot", async () => {
    const styles = { "split-reveal": { background: red, textColor: "#00FF00" } };

    expect((await png("classic-top", styles)).equals(await png("classic-top"))).toBe(true);
    expect((await png("synthwave-arcade", styles)).equals(await png("synthwave-arcade"))).toBe(true);
    expect((await png("split-reveal", styles)).equals(await png("split-reveal"))).toBe(false);
  });
});

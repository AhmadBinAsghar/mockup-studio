import fs from "node:fs";
import path from "node:path";

import { it } from "vitest";

import { renderSlidePng } from "@/renderer/pipeline";
import { fakeScreenshot, nodeCanvas } from "@/renderer/testUtils";
import { TEMPLATES } from "@/templates";

const OUT_DIR = path.resolve(__dirname, "../public/templates");
const WIDTH = 360;
const HEIGHT = 640;
const BRAND = { color: "#6D28D9", font: "Inter" };

it("writes a thumbnail PNG for every template", async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const { image, slide } = fakeScreenshot();

  for (const template of TEMPLATES) {
    const png = await renderSlidePng(nodeCanvas, {
      slide,
      template,
      brand: BRAND,
      output: { folder: "thumbnail", label: template.name, width: WIDTH, height: HEIGHT, kind: "phone" },
      index: 0,
      count: 2,
      image,
    });
    fs.writeFileSync(path.join(OUT_DIR, `${template.id}.png`), png);
  }
});

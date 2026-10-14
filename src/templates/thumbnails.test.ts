import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { TEMPLATES } from "./index";

describe("template thumbnails", () => {
  it("every built-in template points to an existing PNG in /public (run `npm run thumbnails` if one is missing)", () => {
    for (const t of TEMPLATES) {
      expect(t.thumbnail, `${t.id} has no thumbnail field`).toBe(`/templates/${t.id}.png`);
      const file = path.resolve(__dirname, "../../public", `.${t.thumbnail}`);
      expect(fs.existsSync(file), `${file} is missing`).toBe(true);
    }
  });
});

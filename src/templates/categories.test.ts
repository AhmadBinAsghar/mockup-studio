import { describe, expect, it } from "vitest";

import { TEMPLATES } from "./index";
import { CATEGORIES, categoryOf } from "./categories";

const THEMED = CATEGORIES.filter((c) => c.id !== "general" && c.id !== "custom");

describe("template categories", () => {
  it("gives every built-in template a known category", () => {
    const known = new Set(CATEGORIES.map((c) => c.id));
    for (const t of TEMPLATES) expect(known.has(categoryOf(t)), t.id).toBe(true);
  });

  it("ships at least 5 templates for every themed category", () => {
    for (const category of THEMED) {
      const count = TEMPLATES.filter((t) => categoryOf(t) === category.id).length;
      expect(count, category.id).toBeGreaterThanOrEqual(5);
    }
  });

  it("has unique template ids", () => {
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length);
  });

  it("files user-created templates under My templates", () => {
    expect(categoryOf({ custom: true, category: "education" })).toBe("custom");
  });
});

describe("themed templates and the brand colour", () => {
  it("gives every themed template a theme colour so it can be matched to a brand colour", () => {
    for (const t of TEMPLATES.filter((x) => categoryOf(x) !== "general")) {
      expect(t.themeColor, `${t.id} needs a themeColor`).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it("makes every General template follow the brand colour", () => {
    for (const t of TEMPLATES.filter((x) => categoryOf(x) === "general")) {
      expect(JSON.stringify(t), t.id).toContain("{brand");
    }
  });
});

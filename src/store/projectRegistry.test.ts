import { describe, expect, it } from "vitest";

import { nextProjectName, renameProjectIn, type ProjectMeta } from "./projectRegistry";

const meta = (id: string, name: string): ProjectMeta => ({ id, name, createdAt: 0 });

describe("project names", () => {
  it("numbers new projects without reusing a name", () => {
    expect(nextProjectName([])).toBe("Project 1");
    expect(nextProjectName([meta("a", "Project 1")])).toBe("Project 2");
    expect(nextProjectName([meta("a", "Project 1"), meta("b", "My app")])).toBe("Project 3");
    expect(nextProjectName([meta("a", "Project 2")])).toBe("Project 3");
  });

  it("renames one project and ignores blank names", () => {
    const projects = [meta("a", "Project 1"), meta("b", "Project 2")];
    expect(renameProjectIn(projects, "b", "  Fitness app ").map((p) => p.name)).toEqual([
      "Project 1",
      "Fitness app",
    ]);
    expect(renameProjectIn(projects, "a", "   ")).toBe(projects);
  });
});

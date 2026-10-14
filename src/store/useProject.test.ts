import { beforeEach, describe, expect, it } from "vitest";

import type { Slide, Template } from "@/types";

import { createInitialProject, useProject } from "./useProject";

const slide = (id: string): Slide => ({
  id,
  name: `${id}.png`,
  blob: new Blob([]),
  width: 100,
  height: 200,
  headline: "",
  subheadline: "",
  bullets: [],
});

const own = (id: string) => useProject.getState().slides.find((s) => s.id === id)?.templateId;

describe("per-screenshot templates in the project store", () => {
  beforeEach(() => {
    useProject.setState({ ...createInitialProject(), slides: [slide("a"), slide("b")] });
  });

  it("sets and clears a template for one screenshot only", () => {
    useProject.getState().setTemplate("classic-top");
    useProject.getState().setSlideTemplate("b", "slice-duo");
    expect(own("a")).toBeUndefined();
    expect(own("b")).toBe("slice-duo");
    expect(useProject.getState().templateId).toBe("classic-top");

    useProject.getState().setSlideTemplate("b", null);
    expect(own("b")).toBeUndefined();
  });

  it("choosing a template for all screenshots clears the individual choices", () => {
    useProject.getState().setSlideTemplate("a", "slice-duo");
    useProject.getState().setSlideTemplate("b", "split-reveal");
    useProject.getState().setTemplate("tilted-3d");
    expect(own("a")).toBeUndefined();
    expect(own("b")).toBeUndefined();
    expect(useProject.getState().templateId).toBe("tilted-3d");
  });

  it("deleting a custom template resets the screenshots that used it", () => {
    const custom = { id: "mine", name: "Mine", custom: true } as Template;
    useProject.getState().saveCustomTemplate(custom);
    useProject.getState().setSlideTemplate("a", "mine");
    useProject.getState().deleteCustomTemplate("mine");
    expect(own("a")).toBeUndefined();
  });
});

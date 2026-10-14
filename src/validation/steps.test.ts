import { describe, expect, it } from "vitest";

import { furthestStep, type Progress } from "./steps";

const done: Progress = { slideCount: 2, targetCount: 1, templateChosen: true, customizeDone: true };

describe("furthestStep", () => {
  it("opens only Upload until a screenshot is added", () => {
    expect(furthestStep({ ...done, slideCount: 0 })).toBe(0);
  });

  it("finishing a section unlocks exactly the next one", () => {
    expect(furthestStep({ ...done, targetCount: 0, templateChosen: false, customizeDone: false })).toBe(1);
    expect(furthestStep({ ...done, templateChosen: false, customizeDone: false })).toBe(2);
    expect(furthestStep({ ...done, customizeDone: false })).toBe(3);
    expect(furthestStep(done)).toBe(4);
  });

  it("locks later steps again when an earlier section becomes incomplete", () => {
    expect(furthestStep({ ...done, targetCount: 0 })).toBe(1);
  });
});

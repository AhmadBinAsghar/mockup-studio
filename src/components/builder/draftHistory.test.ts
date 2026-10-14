import { describe, expect, it } from "vitest";

import { getTemplate } from "@/templates";
import type { Template } from "@/types";

import { MAX_HISTORY, record, redo, startHistory, undo } from "./draftHistory";

const base = getTemplate("classic-top");
const version = (n: number): Template => ({ ...base, name: `v${n}` });

describe("builder history", () => {
  it("steps back and forward through edits", () => {
    let h = startHistory(version(0));
    h = record(h, version(1), false);
    h = record(h, version(2), false);
    expect(h.present.name).toBe("v2");
    h = undo(h);
    expect(h.present.name).toBe("v1");
    h = undo(h);
    expect(h.present.name).toBe("v0");
    h = redo(h);
    expect(h.present.name).toBe("v1");
  });

  it("does nothing when there is nothing to undo or redo", () => {
    const h = startHistory(version(0));
    expect(undo(h)).toBe(h);
    expect(redo(h)).toBe(h);
  });

  it("merges the edits of one gesture into a single step", () => {
    let h = startHistory(version(0));
    h = record(h, version(1), false);
    for (let i = 2; i <= 30; i++) h = record(h, version(i), true);
    expect(h.past).toHaveLength(1);
    expect(undo(h).present.name).toBe("v0");
  });

  it("drops the redo list when a new edit is made", () => {
    let h = startHistory(version(0));
    h = record(h, version(1), false);
    h = undo(h);
    h = record(h, version(9), false);
    expect(h.future).toEqual([]);
    expect(redo(h).present.name).toBe("v9");
  });

  it("ignores an edit that changed nothing", () => {
    const h = startHistory(version(0));
    expect(record(h, h.present, false)).toBe(h);
  });

  it("keeps a bounded number of steps", () => {
    let h = startHistory(version(0));
    for (let i = 1; i <= MAX_HISTORY + 50; i++) h = record(h, version(i), false);
    expect(h.past).toHaveLength(MAX_HISTORY);
  });
});

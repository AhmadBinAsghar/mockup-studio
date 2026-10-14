import { describe, expect, it } from "vitest";

import { renderSlide, type RenderReport } from "@/renderer/renderSlide";
import { fakeScreenshot, nodeCanvas } from "@/renderer/testUtils";
import { getTemplate, TEMPLATES } from "@/templates";
import {
  addCallout,
  addPhoneSelected,
  addShapeSelected,
  canDeleteLayer,
  canDuplicateLayer,
  deleteLayer,
  duplicateLayer,
  layerLabel,
  patchLayer,
  reorderLayer,
  SHAPE_KINDS,
  startDraft,
} from "@/templates/builderModel";
import type { Layer, Template } from "@/types";

import { hitTest, moveBy, scaleBy, widthBy, type Patch } from "./canvasMath";

const SIZE = { width: 400, height: 711, kind: "phone" as const };
const brand = { color: "#6D28D9", font: "Inter" };

function draw(template: Template): RenderReport {
  const { image, slide } = fakeScreenshot();
  const canvas = nodeCanvas(SIZE.width, SIZE.height) as unknown as { getContext(k: "2d"): never };
  return renderSlide({ ...slide, image, brand, index: 0, count: 1 }, template, SIZE, canvas.getContext("2d"));
}

const apply = (draft: Template, index: number, patch: Patch) => patchLayer(draft, index, patch);
const c = { width: SIZE.width, height: SIZE.height };

describe("the renderer reports where each layer was drawn", () => {
  it("returns one box per layer for every built-in template", () => {
    for (const id of ["classic-top", "split-reveal", "feature-badge", "card-stack", "synthwave-arcade"]) {
      const t = startDraft(getTemplate(id));
      const report = draw(t);
      expect(report.boxes, id).toHaveLength(t.layers.length);
      expect(report.canvas).toEqual({ width: SIZE.width, height: SIZE.height });
      t.layers.forEach((layer, i) => {
        if (layer.type === "text" || layer.type === "device" || layer.type === "shape") {
          expect(report.boxes[i], `${id} layer ${i} (${layer.type})`).not.toBeNull();
        }
      });
    }
  });

  it("measures the real height of wrapped text", () => {
    const t = startDraft(getTemplate("classic-top"));
    const at = t.layers.findIndex((l) => l.type === "text" && l.role === "headline");
    const box = draw(t).boxes[at]!;
    expect(box.x).toBeCloseTo(((t.layers[at] as { x: number }).x / 100) * SIZE.width);
    expect(box.h).toBeGreaterThan(0);
  });
});

describe("dragging changes exactly what is drawn", () => {
  const dx = 24;
  const dy = 36;

  function dragged(id: string, pick: (l: Layer) => boolean) {
    const base = startDraft(getTemplate(id));
    const draft = id === "classic-top" ? addShapeSelected(base, "circle").draft : base;
    const index = draft.layers.findIndex(pick);
    const before = draw(draft).boxes[index]!;
    const patch = moveBy(draft.layers[index], before, dx, dy, c);
    const after = draw(apply(draft, index, patch)).boxes[index]!;
    return { before, after };
  }

  it.each([
    ["a circle", "classic-top", (l: Layer) => l.type === "shape" && l.id === "shape-1"],
    ["a phone", "classic-top", (l: Layer) => l.type === "device"],
    ["the headline", "classic-top", (l: Layer) => l.type === "text" && l.role === "headline"],
    ["a diagonal band", "split-reveal", (l: Layer) => l.type === "shape" && l.shape === "polygon"],
    ["a feature card", "card-stack", (l: Layer) => l.type === "callout"],
  ])("moves %s by the dragged distance", (_name, id, pick) => {
    const { before, after } = dragged(id, pick as (l: Layer) => boolean);
    expect(after.x - before.x).toBeCloseTo(dx, 0);
    expect(after.y - before.y).toBeCloseTo(dy, 0);
    expect(after.w).toBeCloseTo(before.w, 0);
  });

  it("moves a phone rigidly even far down, instead of letting the renderer shrink it", () => {
    const draft = startDraft(getTemplate("classic-top"));
    const index = draft.layers.findIndex((l) => l.type === "device");
    const before = draw(draft).boxes[index]!;
    const far = 150;
    const after = draw(apply(draft, index, moveBy(draft.layers[index], before, 0, far, c))).boxes[index]!;
    expect(after.w).toBeCloseTo(before.w, 0);
    expect(after.y - before.y).toBeCloseTo(far, 0);
  });

  it("moves bottom-anchored text the way the pointer moves", () => {
    const draft = startDraft(getTemplate("classic-top"));
    const at = draft.layers.findIndex((l) => l.type === "text" && l.role === "headline");
    const bottom = patchLayer(draft, at, { anchor: "bottom", y: 20 });
    const before = draw(bottom).boxes[at]!;
    const patch = moveBy(bottom.layers[at], before, 0, dy, c);
    const after = draw(apply(bottom, at, patch)).boxes[at]!;
    expect(after.y - before.y).toBeCloseTo(dy, 0);
  });

  it("frees a stacked subtitle without making it jump", () => {
    const draft = startDraft(getTemplate("classic-top"));
    const at = draft.layers.findIndex((l) => l.type === "text" && l.role === "subheadline");
    const stacked = patchLayer(draft, at, { stackBelow: "headline", y: 2 });
    const before = draw(stacked).boxes[at]!;
    const patch = moveBy(stacked.layers[at], before, 0, 0, c);
    const after = draw(apply(stacked, at, patch)).boxes[at]!;
    expect(after.y).toBeCloseTo(before.y, 0);
    const moved = moveBy(stacked.layers[at], before, 0, dy, c);
    expect(draw(apply(stacked, at, moved)).boxes[at]!.y - before.y).toBeCloseTo(dy, 0);
  });
});

describe("resizing changes exactly what is drawn", () => {
  it("scales a circle about its center", () => {
    const draft = addShapeSelected(startDraft(getTemplate("classic-top")), "circle").draft;
    const index = draft.layers.findIndex((l) => l.id === "shape-1");
    const before = draw(draft).boxes[index]!;
    const after = draw(apply(draft, index, scaleBy(draft.layers[index], before, 1.5, c))).boxes[index]!;
    expect(after.w).toBeCloseTo(before.w * 1.5, 0);
    expect(after.x + after.w / 2).toBeCloseTo(before.x + before.w / 2, 0);
    expect(after.y + after.h / 2).toBeCloseTo(before.y + before.h / 2, 0);
  });

  it("scales a phone about its center", () => {
    const draft = startDraft(getTemplate("classic-top"));
    const index = draft.layers.findIndex((l) => l.type === "device");
    const before = draw(draft).boxes[index]!;
    const after = draw(apply(draft, index, scaleBy(draft.layers[index], before, 0.8, c))).boxes[index]!;
    expect(after.w).toBeCloseTo(before.w * 0.8, 0);
    expect(after.x + after.w / 2).toBeCloseTo(before.x + before.w / 2, 0);
    expect(after.y + after.h / 2).toBeCloseTo(before.y + before.h / 2, 0);
  });

  it("scales text by font size", () => {
    const draft = startDraft(getTemplate("classic-top"));
    const index = draft.layers.findIndex((l) => l.type === "text" && l.role === "headline");
    const small = patchLayer(draft, index, { fontSize: 4 });
    const before = draw(small).boxes[index]!;
    const after = draw(apply(small, index, scaleBy(small.layers[index], before, 1.5, c))).boxes[index]!;
    expect(after.h).toBeGreaterThan(before.h * 1.2);
  });

  it("changes a card's width from its right edge", () => {
    const draft = startDraft(getTemplate("card-stack"));
    const index = draft.layers.findIndex((l) => l.type === "callout");
    const before = draw(draft).boxes[index]!;
    const after = draw(apply(draft, index, widthBy(draft.layers[index], "right", 20, c))).boxes[index]!;
    expect(after.w - before.w).toBeCloseTo(20, 0);
    expect(after.x).toBeCloseTo(before.x, 0);
  });
});

describe("adding, deleting, copying and ordering layers", () => {
  const draft = startDraft(getTemplate("classic-top"));

  it("adds each kind of shape on top of the background and selects it", () => {
    for (const { kind } of SHAPE_KINDS) {
      const made = addShapeSelected(draft, kind);
      expect(made.draft.layers).toHaveLength(draft.layers.length + 1);
      expect(made.draft.layers[made.index].type).toBe("shape");
      expect(made.index).toBeLessThan(made.draft.layers.findIndex((l) => l.type === "text"));
    }
  });

  it("adds a phone, up to the limit", () => {
    let current = draft;
    let made = addPhoneSelected(current);
    while (made) {
      current = made.draft;
      expect(current.layers[made.index].type).toBe("device");
      made = addPhoneSelected(current);
    }
    expect(current.layers.filter((l) => l.type === "device")).toHaveLength(4);
  });

  it("adds up to three feature cards, each with its own slot", () => {
    let current = draft;
    const slots: number[] = [];
    for (let i = 0; i < 5; i++) {
      const made = addCallout(current);
      if (!made) break;
      current = made.draft;
      const layer = current.layers[made.index];
      expect(layer.type).toBe("callout");
      slots.push(layer.type === "callout" ? layer.index : -1);
    }
    expect(slots).toEqual([0, 1, 2]);
  });

  it("never deletes the headline or the last phone, but can delete the rest", () => {
    const headline = draft.layers.findIndex((l) => l.type === "text" && l.role === "headline");
    const phone = draft.layers.findIndex((l) => l.type === "device");
    const sub = draft.layers.findIndex((l) => l.type === "text" && l.role === "subheadline");
    expect(canDeleteLayer(draft, headline)).toBe(false);
    expect(canDeleteLayer(draft, phone)).toBe(false);
    expect(deleteLayer(draft, headline)).toBe(draft);
    expect(canDeleteLayer(draft, sub)).toBe(true);
    expect(deleteLayer(draft, sub).layers.some((l) => l.type === "text" && l.role === "subheadline")).toBe(
      false,
    );
    const withShape = addShapeSelected(draft, "circle");
    expect(deleteLayer(withShape.draft, withShape.index).layers).toHaveLength(draft.layers.length);
  });

  it("duplicates a shape or phone just in front of the original, offset a little", () => {
    const made = addShapeSelected(draft, "circle");
    const copy = duplicateLayer(made.draft, made.index)!;
    expect(copy.index).toBe(made.index + 1);
    const [a, b] = [copy.draft.layers[made.index], copy.draft.layers[copy.index]];
    expect(a.type === "shape" && b.type === "shape" && b.x > a.x && b.y > a.y).toBe(true);
    expect(new Set(copy.draft.layers.map((l) => l.id).filter(Boolean)).size).toBe(
      copy.draft.layers.filter((l) => l.id).length,
    );
    const text = draft.layers.findIndex((l) => l.type === "text");
    expect(canDuplicateLayer(draft, text)).toBe(false);
    expect(duplicateLayer(draft, text)).toBeNull();
  });

  it("moves a layer toward the front or back by one step", () => {
    const made = addShapeSelected(draft, "circle");
    const forward = reorderLayer(made.draft, made.index, 1);
    expect(forward.index).toBe(made.index + 1);
    expect(forward.draft.layers[forward.index]).toBe(made.draft.layers[made.index]);
    const stuck = reorderLayer(made.draft, 0, -1);
    expect(stuck.draft).toBe(made.draft);
  });

  it("names layers in a readable way", () => {
    const withTwo = addShapeSelected(addShapeSelected(draft, "circle").draft, "circle").draft;
    const names = withTwo.layers.map((_, i) => layerLabel(withTwo, i));
    expect(names).toContain("Headline");
    expect(names).toContain("Subtitle");
    expect(names).toContain("Phone 1");
    expect(names).toContain("Circle 1");
    expect(names).toContain("Circle 2");
  });
});

describe("clicking picks what is really drawn under the pointer", () => {
  const point = (box: { x: number; y: number; w: number; h: number }, fx: number, fy: number) => ({
    x: box.x + box.w * fx,
    y: box.y + box.h * fy,
  });

  function scan(draft: Template, report: RenderReport, index: number) {
    const box = report.boxes[index]!;
    let hits = 0;
    let total = 0;
    for (let i = 0; i < 24; i++) {
      for (let j = 0; j < 40; j++) {
        total++;
        const at = point(box, (i + 0.5) / 24, (j + 0.5) / 40);
        if (hitTest(draft.layers, report.boxes, at, report.canvas) === index) hits++;
      }
    }
    return hits / total;
  }

  it("lets you click a normal-sized phone, even though it covers over half the canvas", () => {
    const draft = startDraft(getTemplate("classic-top"));
    const report = draw(draft);
    const phone = draft.layers.findIndex((l) => l.type === "device");
    const box = report.boxes[phone]!;
    expect((box.w * box.h) / (SIZE.width * SIZE.height)).toBeGreaterThan(0.5);
    expect(hitTest(draft.layers, report.boxes, point(box, 0.5, 0.5), report.canvas)).toBe(phone);
  });

  it("lets you click every phone in every built-in template somewhere on it", () => {
    for (const template of TEMPLATES) {
      const draft = startDraft(template);
      const report = draw(draft);
      draft.layers.forEach((layer, i) => {
        if (layer.type !== "device") return;
        expect(
          scan(draft, report, i),
          `${template.id}: ${layerLabel(draft, i)} can never be clicked`,
        ).toBeGreaterThan(0.05);
      });
    }
  });

  it("only treats the drawn half of a cut phone as the phone", () => {
    const draft = startDraft(getTemplate("split-reveal"));
    const report = draw(draft);
    const cut = draft.layers.findIndex((l) => l.type === "device" && l.cuts?.length);
    const share = scan(draft, report, cut);
    // About half of the phone's rectangle is the visible half (less where the other half covers it).
    expect(share).toBeGreaterThan(0.1);
    expect(share).toBeLessThan(0.6);
  });

  it("selects a ring only on its line, and a band only inside the band", () => {
    const withRing = addShapeSelected(startDraft(getTemplate("classic-top")), "ring");
    const ringReport = draw(withRing.draft);
    const ringBox = ringReport.boxes[withRing.index]!;
    const inMiddle = point(ringBox, 0.5, 0.5);
    expect(hitTest(withRing.draft.layers, ringReport.boxes, inMiddle, ringReport.canvas)).not.toBe(
      withRing.index,
    );
    const onLine = { x: ringBox.x + ringBox.w, y: ringBox.y + ringBox.h / 2 };
    expect(hitTest(withRing.draft.layers, ringReport.boxes, onLine, ringReport.canvas)).toBe(withRing.index);

    const withBand = addShapeSelected(startDraft(getTemplate("classic-top")), "band");
    const bandReport = draw(withBand.draft);
    const bandBox = bandReport.boxes[withBand.index]!;
    // The band runs from y=62% to 72% of the height at the left edge and 46%-56% at the right.
    const insideBand = { x: 5, y: SIZE.height * 0.67 };
    const aboveBand = { x: 5, y: SIZE.height * 0.2 };
    expect(bandBox.w).toBeGreaterThan(0);
    expect(hitTest(withBand.draft.layers, bandReport.boxes, insideBand, bandReport.canvas)).toBe(
      withBand.index,
    );
    expect(hitTest(withBand.draft.layers, bandReport.boxes, aboveBand, bandReport.canvas)).not.toBe(
      withBand.index,
    );
  });

  it("skips canvas-sized glows, but still lets the selected layer win under something in front", () => {
    const withGlow = addShapeSelected(startDraft(getTemplate("classic-top")), "glow");
    const report = draw(withGlow.draft);
    const at = point(report.boxes[withGlow.index]!, 0.5, 0.5);
    expect(hitTest(withGlow.draft.layers, report.boxes, at, report.canvas)).not.toBe(withGlow.index);

    // A small circle brought in front of the phone normally wins the click; when the phone is
    // already selected, the phone keeps it.
    let layered = addShapeSelected(withGlow.draft, "circle");
    // Re-read the phone's position each step: it moves back by one every time the circle passes it.
    const phoneIndex = () => layered.draft.layers.findIndex((l) => l.type === "device");
    for (let guard = 0; layered.index < phoneIndex() && guard < 50; guard++) {
      layered = reorderLayer(layered.draft, layered.index, 1);
    }
    const circleIndex = layered.index;
    const patched = patchLayer(layered.draft, circleIndex, { x: 40, y: 80, w: 30 });
    const r2 = draw(patched);
    const phone = patched.layers.findIndex((l) => l.type === "device");
    const circleCenter = point(r2.boxes[circleIndex]!, 0.5, 0.5);
    expect(hitTest(patched.layers, r2.boxes, circleCenter, r2.canvas)).toBe(circleIndex);
    expect(hitTest(patched.layers, r2.boxes, circleCenter, r2.canvas, phone)).toBe(phone);
  });
});

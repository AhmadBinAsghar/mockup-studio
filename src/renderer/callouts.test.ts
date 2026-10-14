import { describe, expect, it } from "vitest";

import { getTemplate, TEMPLATES } from "@/templates";
import { validateTemplate } from "@/templates/validate";
import { cardHeight, cardsAreClear, type Design } from "@/templates/promptDesigns";
import type { CalloutLayer, DeviceLayer, Layer, Template } from "@/types";

import { drawCallout, joinCard, splitCard } from "./callouts";
import { renderSlide, type RenderableSlide } from "./renderSlide";
import { resolveTemplate } from "./resolve";
import { fakeScreenshot, nodeCanvas } from "./testUtils";

const brand = { color: "#6D28D9", font: "Inter" };
const phone = { width: 540, height: 960, kind: "phone" as const };

type Canvas = { getContext(k: "2d"): never; toBuffer(m: "image/png"): Buffer };

function render(slide: Partial<RenderableSlide>, template: Template, size = phone): Buffer {
  const { image, slide: base } = fakeScreenshot();
  const canvas = nodeCanvas(size.width, size.height) as unknown as Canvas;
  renderSlide(
    { ...base, image, brand, index: 0, count: 1, ...slide },
    template,
    size,
    canvas.getContext("2d"),
  );
  return canvas.toBuffer("image/png");
}

const cardTemplates = TEMPLATES.filter((t) => t.layers.some((l) => l.type === "callout"));

describe("card text format", () => {
  it("splits a title from its description and joins them back", () => {
    expect(splitCard("Fast|Open it in seconds")).toEqual({ title: "Fast", detail: "Open it in seconds" });
    expect(splitCard("Just a title")).toEqual({ title: "Just a title", detail: "" });
    expect(splitCard("A|B|C").detail).toBe("B|C");
    expect(joinCard("Fast", "Open it")).toBe("Fast|Open it");
    expect(joinCard("Fast", "")).toBe("Fast");
    expect(joinCard("Fa|st", "Op|en")).toBe("Fast|Open");
  });
});

describe("built-in card templates", () => {
  it("exist, are valid and cover the three card slots", () => {
    expect(cardTemplates.map((t) => t.id).sort()).toEqual(["card-rail", "card-row", "card-stack"]);
    for (const t of cardTemplates) {
      expect(validateTemplate(t), t.id).toEqual([]);
      const indexes = t.layers.flatMap((l) => (l.type === "callout" ? [l.index] : []));
      expect(indexes.sort(), t.id).toEqual([0, 1, 2]);
    }
  });

  it("draw the card text, and hide a card that has no text", () => {
    for (const t of cardTemplates) {
      const full = render({}, t);
      const noCards = render({ bullets: ["", "", ""] }, t);
      const oneCard = render({ bullets: ["Only one|Just this card"] }, t);
      expect(full.equals(noCards), `${t.id}: cards should be visible`).toBe(false);
      expect(oneCard.equals(noCards), `${t.id}: one card should show`).toBe(false);
      expect(oneCard.equals(full), `${t.id}: other cards should hide`).toBe(false);
    }
  });

  it("keep every card inside the canvas and clear of the phone, on phone and tablet sizes", () => {
    const sizes = [
      { width: 1080, height: 1920, kind: "phone" as const },
      { width: 2048, height: 2732, kind: "tablet" as const },
    ];
    for (const t of cardTemplates) {
      for (const size of sizes) {
        const layout = resolveTemplate(t, size, brand.color);
        const cards = layout.layers.filter((l): l is CalloutLayer => l.type === "callout");
        const devices = layout.layers.filter((l): l is DeviceLayer => l.type === "device");
        const ctx = (nodeCanvas(size.width, size.height) as unknown as Canvas).getContext("2d") as never;
        // Longest text the Customize step allows: 40-char title, 90-char description.
        const longest = `${"T".repeat(40)}|${"d".repeat(90)}`;
        for (const card of cards) {
          const height = drawCallout(
            ctx,
            card,
            { raw: longest, family: "Inter", brandColor: brand.color },
            size.width,
          );
          const percent = (height / size.width) * 100;
          const where = `${t.id} ${card.id} on ${size.kind}`;
          expect(percent, `${where} is taller than the layouts allow for`).toBeLessThanOrEqual(
            cardHeight(card.fontSize),
          );
          expect(card.y + percent, `${where} runs off the canvas`).toBeLessThanOrEqual(
            (size.height / size.width) * 100,
          );
        }
        const design = { cards, devs: devices } as unknown as Design;
        expect(cardsAreClear(design), `${t.id} on ${size.kind}: a card overlaps the phone`).toBe(true);
      }
    }
  });
});

describe("callout layer validation", () => {
  const base = (patch: Record<string, unknown>): Template =>
    ({
      ...getTemplate("classic-top"),
      layers: [
        ...getTemplate("classic-top").layers,
        { type: "callout", index: 0, x: 4, y: 40, w: 30, fontSize: 3, ...patch } as unknown as Layer,
      ],
    }) as Template;

  it("accepts a well-formed card", () => {
    expect(validateTemplate(base({ look: "solid", icon: "tick", accentColor: "{brand}" }))).toEqual([]);
  });

  it("rejects bad values with a readable message", () => {
    expect(validateTemplate(base({ index: 3 })).join(" ")).toMatch(/index/);
    expect(validateTemplate(base({ index: 1.5 })).join(" ")).toMatch(/index/);
    expect(validateTemplate(base({ look: "neon" })).join(" ")).toMatch(/look/);
    expect(validateTemplate(base({ icon: "star" })).join(" ")).toMatch(/icon/);
    expect(validateTemplate(base({ fontSize: 30 })).join(" ")).toMatch(/fontSize/);
    expect(validateTemplate(base({ w: undefined })).join(" ")).toMatch(/"w"/);
  });
});

describe("tick bullets and cards share the same text", () => {
  it("a bullets layer shows only the title of a Title|Description string", () => {
    const t = getTemplate("feature-badge");
    const titleOnly = render({ bullets: ["Syncs everywhere", "Works offline", "Private by design"] }, t);
    const withDetail = render(
      {
        bullets: [
          "Syncs everywhere|Your plans follow you",
          "Works offline|No connection needed",
          "Private by design|Stays on your device",
        ],
      },
      t,
    );
    expect(withDetail.equals(titleOnly)).toBe(true);
  });
});

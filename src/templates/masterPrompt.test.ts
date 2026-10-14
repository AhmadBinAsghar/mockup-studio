import { describe, expect, it } from "vitest";

import { TEMPLATES } from "./index";
import { collectExistingTemplateInfo, generateMasterPrompt } from "./masterPrompt";
import { drawCallout } from "@/renderer/callouts";
import { nodeCanvas } from "@/renderer/testUtils";
import type { Layer, Template } from "@/types";

import {
  cardHeight,
  cardsAreClear,
  designDistance,
  pickDesign,
  signatureOf,
  type PromptStyle,
} from "./promptDesigns";
import { validateTemplate } from "./validate";

const SEEDS = Array.from({ length: 40 }, (_, i) => 1_700_000_000_000 + i * 7919);
const info = collectExistingTemplateInfo([]);

/** Anything below this is "same composition, other colours" (split-reveal vs itself is 0). */
const MIN_NOVELTY = 3;

describe.each<PromptStyle>(["wow", "simple", "cards"])("%s master prompt", (style) => {
  it("never lands on the composition of an existing template", () => {
    for (const seed of SEEDS) {
      const { design, nearest } = pickDesign(style, seed, TEMPLATES);
      expect(nearest, `${design.mood} @ ${seed}`).not.toBeNull();
      expect(nearest!.distance, `${design.mood} is too close to ${nearest!.name}`).toBeGreaterThanOrEqual(
        MIN_NOVELTY,
      );
    }
  });

  it("gives a different prompt on every click", () => {
    const prompts = new Set(SEEDS.slice(0, 20).map((seed) => generateMasterPrompt({ ...info, style, seed })));
    expect(prompts.size).toBe(20);
  });

  it("is repeatable for the same seed", () => {
    const a = generateMasterPrompt({ ...info, style, seed: 42 });
    expect(generateMasterPrompt({ ...info, style, seed: 42 })).toBe(a);
  });
});

describe("wow prompt families", () => {
  it("only ever produces split or 3-D designs, and uses both", () => {
    const families = new Set(SEEDS.map((seed) => pickDesign("wow", seed, TEMPLATES).design.family));
    expect([...families].sort()).toEqual(["3d", "split"]);
  });

  it("rotates through every variant instead of repeating one design", () => {
    const moods = new Set<string>();
    for (let i = 1; i <= 120; i++) {
      moods.add(pickDesign("wow", i * 7919, TEMPLATES).design.mood.split(" · ")[0]);
    }
    expect(moods.size).toBeGreaterThanOrEqual(8);
  });

  it("split designs cut the phone and 3-D designs extrude it", () => {
    for (const seed of SEEDS) {
      const { design } = pickDesign("wow", seed, TEMPLATES);
      if (design.family === "split") expect(design.sig.some((d) => d.cuts > 0)).toBe(true);
      else expect(design.sig.some((d) => d.depth >= 1.5 && (d.skewX !== 0 || d.depth >= 6))).toBe(true);
    }
  });
});

describe("simple prompt", () => {
  it("has no cuts, skew or heavy depth", () => {
    for (const seed of SEEDS) {
      const { design } = pickDesign("simple", seed, TEMPLATES);
      expect(design.family).toBe("clean");
      for (const d of design.sig) {
        expect(d.cuts).toBe(0);
        expect(d.skewX).toBe(0);
        expect(d.skewY).toBe(0);
        expect(d.depth).toBeLessThanOrEqual(1.4);
      }
    }
  });
});

describe("prompt text", () => {
  it("no longer offers a balanced / surprise style", () => {
    const text = generateMasterPrompt({ ...info, style: "wow", seed: 1 });
    expect(text).not.toMatch(/surprise|BALANCED/i);
    expect(text).toContain("EXCLUDED IDs");
    expect(text).toContain('"tabletOverrides"');
  });

  it("takes custom templates into account", () => {
    const first = pickDesign("wow", 123, TEMPLATES).design;
    const clone = {
      ...TEMPLATES[0],
      id: "mine",
      name: "Mine",
      layers: [
        ...TEMPLATES[0].layers.filter((l) => l.type !== "device"),
        ...first.sig.map((d) => ({
          type: "device" as const,
          frame: "phone-generic" as const,
          id: "d",
          x: d.x,
          y: d.y,
          w: d.w,
          rotate: d.rotate,
          skewX: d.skewX,
          skewY: d.skewY,
          depth: d.depth,
        })),
      ],
    };
    const again = pickDesign("wow", 123, [...TEMPLATES, clone]);
    expect(designDistance(again.design.sig, signatureOf(clone))).toBeGreaterThanOrEqual(MIN_NOVELTY);
  });
});

describe("feature-cards prompt", () => {
  const designs = SEEDS.map((seed) => ({ seed, ...pickDesign("cards", seed, TEMPLATES) }));

  it("only produces card designs, with 3 cards each and no card on top of a phone", () => {
    for (const { seed, design } of designs) {
      expect(design.family, String(seed)).toBe("cards");
      expect(design.cards, design.mood).toHaveLength(3);
      expect(cardsAreClear(design), `${design.mood} @ ${seed}: a card overlaps the phone`).toBe(true);
    }
  });

  it("uses several different arrangements", () => {
    const layouts = new Set(
      Array.from({ length: 120 }, (_, i) => pickDesign("cards", (i + 1) * 7919, TEMPLATES).design.cardLayout),
    );
    expect(layouts.size).toBeGreaterThanOrEqual(3);
  });

  it("writes callout layers that pass the template validator", () => {
    for (const { design } of designs) {
      const lines = [...(design.cardsText ?? "").matchAll(/{ "type":"callout".*}/g)].map((m) =>
        JSON.parse(m[0]),
      );
      expect(lines, design.mood).toHaveLength(3);
      const devices = [...design.devices.matchAll(/{ "frame".*}/g)].map((m) => ({
        type: "device",
        ...JSON.parse(m[0]),
      }));
      const template = {
        id: "x",
        name: "x",
        custom: true,
        supports: ["phone", "tablet"],
        background: { type: "solid", color: "#000000" },
        layers: [
          { type: "text", role: "headline", x: 8, y: 6, w: 84, fontSize: 7 },
          ...devices,
          ...lines,
        ] as Layer[],
      } as Template;
      expect(validateTemplate(template), design.mood).toEqual([]);
    }
  });

  it("spaces cards for the longest text the app allows", () => {
    const ctx = (nodeCanvas(1080, 1920) as unknown as { getContext(k: "2d"): never }).getContext("2d");
    const longest = `${"T".repeat(40)}|${"d".repeat(90)}`;
    for (const { design } of designs) {
      for (const card of design.cards ?? []) {
        const layer = { type: "callout", ...card } as never;
        const px = drawCallout(ctx, layer, { raw: longest, family: "Inter", brandColor: "#6D28D9" }, 1080);
        expect((px / 1080) * 100, `${design.mood} ${card.id}`).toBeLessThanOrEqual(cardHeight(card.fontSize));
      }
    }
  });

  it("tells the AI to leave card text to the app", () => {
    const text = generateMasterPrompt({ ...info, style: "cards", seed: 5 });
    expect(text).toContain('"callout"');
    expect(text).toContain("do NOT write the card text");
    expect(text).toContain("FEATURE CARD LAYERS");
  });
});

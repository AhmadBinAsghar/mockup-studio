import { cutPolygon, type Point } from "@/renderer/cuts";
import type { DeviceCut, DeviceLayer, Template } from "@/types";

export type PromptStyle = "wow" | "simple" | "cards";

/** The device numbers that decide how recognisable a composition is. */
export interface DeviceSig {
  x: number;
  y: number;
  w: number;
  rotate: number;
  skewX: number;
  skewY: number;
  depth: number;
  cuts: number;
}

export interface Design {
  family: "split" | "3d" | "clean" | "cards";
  mood: string;
  concept: string;
  background: string;
  shapes: string;
  text: string;
  devices: string;
  tablet: string;
  sig: DeviceSig[];
  /** The devices behind the prompt text; used to prove the screenshot stays complete. */
  devs: Dev[];
  /** Feature-card designs only: the callout layers, their prompt text and their layout kind. */
  cards?: Card[];
  cardsText?: string;
  cardLayout?: CardLayout;
}

export interface PickedDesign {
  design: Design;
  /** Closest existing template and how far the design is from it (0 = identical). */
  nearest: { name: string; distance: number } | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Seeded randomness — same seed, same design; new seed, new design.
// ─────────────────────────────────────────────────────────────────────────────

type Rng = () => number;

function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const range = (r: Rng, min: number, max: number, step = 1) =>
  Number((Math.round((min + r() * (max - min)) / step) * step).toFixed(4));
const pick = <T>(r: Rng, list: readonly T[]): T => list[Math.floor(r() * list.length)];
const flip = (r: Rng, chance = 0.5) => r() < chance;
const r2 = (v: number) => Math.round(v * 100) / 100;
const n = (v: number) => String(r2(v));

// ─────────────────────────────────────────────────────────────────────────────
// Device description
// ─────────────────────────────────────────────────────────────────────────────

interface Dev {
  id: string;
  /** Only set when measuring a resolved template; generated prompts are always phones. */
  frame?: "phone-generic" | "tablet-generic" | "none";
  x: number;
  y: number;
  w: number;
  rotate?: number;
  skewX?: number;
  skewY?: number;
  depth?: number;
  depthAngle?: number;
  depthColor?: string;
  cuts?: DeviceCut[];
  cutGlow?: string;
  frameStyle?: string;
  gloss?: boolean;
  rim?: string;
  dim?: number;
  shadow?: boolean;
  show?: "prev" | "next";
}

function deviceLine(d: Dev): string {
  const parts = [
    `"frame":"phone-generic"`,
    `"id":"${d.id}"`,
    `"x":${n(d.x)}`,
    `"y":${n(d.y)}`,
    `"w":${n(d.w)}`,
  ];
  if (d.rotate) parts.push(`"rotate":${n(d.rotate)}`);
  if (d.skewX) parts.push(`"skewX":${n(d.skewX)}`);
  if (d.skewY) parts.push(`"skewY":${n(d.skewY)}`);
  if (d.depth) parts.push(`"depth":${n(d.depth)}`, `"depthAngle":${n(d.depthAngle ?? 55)}`);
  if (d.depth && d.depthColor) parts.push(`"depthColor":"${d.depthColor}"`);
  if (d.cuts)
    parts.push(
      `"cuts":${JSON.stringify(d.cuts.map((c) => ({ x1: r2(c.x1), y1: r2(c.y1), x2: r2(c.x2), y2: r2(c.y2), keep: c.keep })))}`,
    );
  if (d.cutGlow) parts.push(`"cutGlow":"${d.cutGlow}"`);
  if (d.frameStyle) parts.push(`"frameStyle":"${d.frameStyle}"`);
  if (d.gloss) parts.push(`"gloss":true`);
  if (d.rim) parts.push(`"rim":"${d.rim}"`);
  if (d.dim) parts.push(`"dim":${n(d.dim)}`);
  if (d.show) parts.push(`"show":"${d.show}"`);
  parts.push(`"shadow":${d.shadow ?? true}`, `"bleed":true`);
  return `{ ${parts.join(", ")} }`;
}

const sigOf = (d: Dev): DeviceSig => ({
  x: d.x,
  y: d.y,
  w: d.w,
  rotate: d.rotate ?? 0,
  skewX: d.skewX ?? 0,
  skewY: d.skewY ?? 0,
  depth: d.depth ?? 0,
  cuts: d.cuts?.length ?? 0,
});

function devicesPart(list: Dev[]): string {
  const lines = list.map((d, i) => `  ${i + 1}. ${deviceLine(d)}`).join("\n");
  return `${list.length} device layer${list.length > 1 ? "s" : ""}, listed BACK → FRONT (copy these numbers exactly):\n${lines}`;
}

function tabletPart(list: Dev[]): string {
  const rows = list.map(
    (d) =>
      `"${d.id}": { "frame":"tablet-generic", "x":${n(Math.max(2, d.x - 3))}, "y":${n(d.y + 3)}, "w":${n(Math.min(94, d.w * 1.12))} }`,
  );
  return `"tabletOverrides": { "layers": { ${rows.join(", ")} } }`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Text, backgrounds, decoration
// ─────────────────────────────────────────────────────────────────────────────

type Tone = "dark" | "light";

function textPart(r: Rng, tone: Tone, align: "center" | "left" = "center"): string {
  const size = range(r, 7.0, 8.8, 0.1);
  const weight = pick(r, [800, 900]);
  const upper = flip(r, 0.25);
  const headY = range(r, 5, 7);
  const x = align === "left" ? 7 : 8;
  const w = align === "left" ? 74 : 84;
  const head =
    tone === "dark"
      ? `color:"#FFFFFF", accentColor:"${pick(r, ["{brand-pop}", "{brand-glow}", "{brand-pale}"])}", shadow:true`
      : `color:"${pick(r, ["{brand-dark}", "#111827"])}", accentColor:"{brand}"`;
  const sub = tone === "dark" ? pick(r, ["{brand-pale}", "#E2E8F0"]) : pick(r, ["#475569", "#64748B"]);
  return (
    `headline: x:${x}, y:${headY}, w:${w}, fontSize:${size}, weight:${weight}, align:"${align}", maxLines:2, ${head}${upper ? ", uppercase:true" : ""}` +
    ` — subheadline (NO stackBelow, absolute y): x:${x + 2}, y:${headY + 17}, w:${w - 4}, fontSize:${range(r, 3.0, 3.5, 0.1)}, align:"${align}", maxLines:2, color:"${sub}"`
  );
}

interface Backdrop {
  name: string;
  tone: Tone;
  bg: string;
  /** Solid colour A / paint B used when the backdrop is split in two. */
  a: string;
  b: string;
}

const solid = (color: string) => `{ "type":"solid", "color":"${color}" }`;
const gradient = (angle: number, c1: string, c2: string) =>
  `{ "type":"gradient", "angle":${angle}, "stops":["${c1}","${c2}"] }`;

function darkBackdrops(r: Rng): Backdrop[] {
  const angle = range(r, 120, 200, 5);
  return [
    {
      name: "Void",
      tone: "dark",
      bg: solid("#05050D"),
      a: solid("#05050D"),
      b: gradient(angle, "{brand}", "{brand-glow}"),
    },
    {
      name: "Deep",
      tone: "dark",
      bg: solid("{brand-deep}"),
      a: solid("{brand-deep}"),
      b: gradient(angle, "{brand-pop}", "{brand-shift}"),
    },
    {
      name: "Dusk",
      tone: "dark",
      bg: gradient(angle, "{brand-dark}", "#05050D"),
      a: solid("{brand-dark}"),
      b: gradient(angle, "{brand-glow}", "{brand-deep}"),
    },
    {
      name: "Ink",
      tone: "dark",
      bg: solid("#0B1020"),
      a: solid("#0B1020"),
      b: gradient(angle, "{brand-shift}", "{brand}"),
    },
    {
      name: "Flare",
      tone: "dark",
      bg: gradient(angle, "{brand}", "{brand-deep}"),
      a: solid("{brand-deep}"),
      b: gradient(angle, "{brand-light}", "{brand}"),
    },
  ];
}

function haloShapes(r: Rng): string {
  return pick(r, [
    () =>
      `ONE big radial glow behind the devices: shape circle, x:${range(r, 0, 20)}, y:${range(r, 30, 50)}, w:${range(r, 80, 110)}, fill radial {brand-glow}, opacity:${range(r, 0.35, 0.55, 0.05)}, blend:"screen"`,
    () =>
      `TWO stroke-only rings: circle x:${range(r, -10, 5)}, y:${range(r, 25, 45)}, w:${range(r, 85, 115)}, stroke "#FFFFFF", strokeWidth:0.4, opacity:0.14 — circle x:${range(r, 15, 35)}, y:${range(r, 55, 80)}, w:${range(r, 55, 75)}, stroke "{brand-pop}", strokeWidth:0.5, opacity:0.4`,
    () =>
      `THREE slim light beams: roundRect w:${range(r, 8, 14)}, h:${range(r, 120, 160)}, rotate:${range(r, 18, 32)}, fill gradient angle:90 stops ["{brand-pop}","{brand-deep}"], opacity:${range(r, 0.18, 0.3, 0.02)}, blend:"screen" — at x:${range(r, -8, 6)}, x:${range(r, 38, 52)}, x:${range(r, 78, 92)} (y:${range(r, -20, 0)} for all)`,
    () =>
      `FOUR small 8-point starburst polygons (w:${range(r, 2, 4, 0.5)}), fill "#FFFFFF", opacity:0.8 in empty corners — plus ONE soft radial circle x:${range(r, 50, 70)}, y:${range(r, -10, 5)}, w:${range(r, 55, 75)}, fill radial {brand}, opacity:0.5`,
    () =>
      `ONE flat floor shadow ellipse under the devices: circle x:${range(r, 15, 25)}, y:${range(r, 158, 168)}, w:${range(r, 55, 70)}, h:7, fill solid "#000000", opacity:0.3 — ONE radial glow x:${range(r, 30, 50)}, y:${range(r, 70, 90)}, w:${range(r, 70, 95)}, fill radial {brand-shift}, opacity:0.3, blend:"screen"`,
  ])();
}

function splitBackdrop(r: Rng, d: Backdrop): { bg: string; shapes: string } {
  const top = range(r, 40, 62);
  const lean = pick(r, [-1, 1]) * range(r, 6, 18);
  const bottom = Math.min(80, Math.max(20, top + lean));
  const shapes =
    `TWO full-canvas polygon layers FIRST in "layers" (x:0, y:0, w:100, yUnit:"height", paintsBackground:true): ` +
    `(1) points [[0,0],[${top},0],[${bottom},100],[0,100]] fill ${d.a} — ` +
    `(2) points [[${top},0],[100,0],[100,100],[${bottom},100]] fill ${d.b}. ` +
    `Then, above them: ${haloShapes(r)}`;
  return { bg: d.a, shapes };
}

// ─────────────────────────────────────────────────────────────────────────────
// WOW — split designs
// ─────────────────────────────────────────────────────────────────────────────

const GLOWS = ["#FFFFFF", "{brand-pop}", "{brand-pale}", "{brand-glow}"];

function cutLine(r: Rng) {
  const mid = range(r, 0.32, 0.68, 0.02);
  const lean = pick(r, [-1, 1]) * range(r, 0.04, 0.2, 0.02);
  return { x1: mid - lean, y1: -0.1, x2: mid + lean, y2: 1.1 };
}

function splitCutDuo(r: Rng): Design {
  const d = pick(r, darkBackdrops(r));
  const { bg, shapes } = splitBackdrop(r, d);
  const cut = cutLine(r);
  // Sized so both halves stay fully on the canvas (phone height is ~2.165 x its width).
  const w = range(r, 54, 62);
  const ax = range(r, 9, 13);
  const ay = range(r, 31, 34);
  // The halves share a base tilt and differ by at most a few degrees. The more they differ, the
  // further their seams swing toward each other, so the gap grows with it; otherwise one half
  // would cover the other one's edge and hide part of the screenshot.
  const tilt = pick(r, [-1, 1]) * range(r, 3, 10);
  const spread = range(r, 0, 5);
  const rotA = tilt - spread / 2;
  const rotB = tilt + spread / 2;
  const swing = (w / 0.462 / 2) * Math.sin((spread * Math.PI) / 180);
  const dx = Math.ceil(range(r, 10, 16) + swing);
  const glow = pick(r, GLOWS);
  const style = pick(r, ["dark", "titanium", "silver"]);
  // Isometric lean + thick edge keep this apart from the flat split templates that already exist.
  const lean = {
    skewX: range(r, 6, 14),
    skewY: -range(r, 3, 8),
    depth: range(r, 3, 5.5, 0.5),
    depthAngle: range(r, 60, 80),
  };
  const devs: Dev[] = [
    {
      id: "left",
      x: ax,
      y: ay,
      w,
      rotate: rotA,
      ...lean,
      depthColor: "#080812",
      cuts: [{ ...cut, keep: "right" }],
      cutGlow: glow,
      frameStyle: style,
    },
    {
      id: "right",
      x: Math.min(97 - w, ax + dx),
      y: ay + range(r, 6, 12),
      w,
      rotate: rotB,
      ...lean,
      depthColor: "#080812",
      cuts: [{ ...cut, keep: "left" }],
      cutGlow: glow,
      frameStyle: style,
      gloss: true,
    },
  ];
  return {
    family: "split",
    mood: `Offset Cut Duo · ${d.name}`,
    concept:
      "One screenshot is sliced along a leaning line into two thick, isometrically tilted phone halves that sit staggered over a diagonally split backdrop.",
    background: bg,
    shapes,
    text: textPart(r, "dark"),
    devices: devicesPart(devs),
    tablet: tabletPart(devs),
    sig: devs.map(sigOf),
    devs,
  };
}

function shardBreak(r: Rng): Design {
  const d = pick(r, darkBackdrops(r));
  const { bg, shapes } = splitBackdrop(r, d);
  const top = range(r, 0.24, 0.46, 0.02);
  const bottom = range(r, 0.54, 0.76, 0.02);
  const line = { x1: top, y1: -0.1, x2: bottom, y2: 1.1 };
  const w = range(r, 52, 58);
  const x = (100 - w) / 2 + range(r, -3, 3);
  const y = range(r, 30, 32);
  const glow = pick(r, GLOWS);
  const lean = { skewX: range(r, 5, 12), skewY: -range(r, 2, 7) };
  const depth = range(r, 3.5, 6, 0.5);
  // Both shards share ONE rotation and only slide apart along the crack. Opposite rotations
  // would make one shard ride over the other one's cut edge and hide part of the screenshot.
  const tilt = pick(r, [-1, 1]) * range(r, 4, 9);
  const devs: Dev[] = [
    {
      id: "shardL",
      x,
      y,
      w,
      rotate: tilt,
      ...lean,
      depth,
      depthAngle: 70,
      depthColor: "#06060C",
      cuts: [{ ...line, keep: "right" }],
      cutGlow: glow,
      frameStyle: "titanium",
    },
    {
      id: "shardR",
      x: x + range(r, 4, 8),
      y: y + range(r, 4, 7),
      w,
      rotate: tilt,
      ...lean,
      depth,
      depthAngle: 70,
      depthColor: "#06060C",
      cuts: [{ ...line, keep: "left" }],
      cutGlow: glow,
      frameStyle: "titanium",
      gloss: true,
    },
  ];
  return {
    family: "split",
    mood: `Shattered Shards · ${d.name}`,
    concept:
      "A single phone is broken along a steep diagonal; the two shards slide apart along the crack at the same tilt, still showing one continuous screenshot.",
    background: bg,
    shapes,
    text: textPart(r, "dark"),
    devices: devicesPart(devs),
    tablet: tabletPart(devs),
    sig: devs.map(sigOf),
    devs,
  };
}

function openBook(r: Rng): Design {
  const d = pick(r, darkBackdrops(r));
  // keep:"right" on a top→bottom line shows the visual LEFT half (keep:"left" the right half).
  // Each wing keeps only its OUTER half; the right wing starts `gap` further right so the two
  // halves sit close together and every part of the screenshot stays on the canvas.
  const w = range(r, 54, 58);
  const tilt = range(r, 5, 10);
  const skew = range(r, 4, 9);
  const depth = range(r, 3, 5, 0.5);
  const y = range(r, 30, 32);
  // Rotation swings the wings' bottoms toward each other (height x sin(tilt)); the skew below
  // leans the other way and takes part of that back (height x tan(skew)). The gap covers whatever
  // is left, otherwise the front wing would hide the back wing's inner edge.
  const height = w / 0.462;
  const swing = Math.abs(height * (Math.sin((tilt * Math.PI) / 180) - Math.tan((skew * Math.PI) / 180)));
  const gap = Math.ceil(swing + range(r, 3, 6));
  const lx = (100 - w - gap) / 2 + range(r, -1.5, 1.5, 0.5);
  const glow = pick(r, GLOWS);
  const cut = { x1: 0.5, y1: -0.1, x2: 0.5, y2: 1.1 };
  const devs: Dev[] = [
    {
      id: "wingL",
      x: lx,
      y,
      w,
      rotate: -tilt,
      skewX: -skew,
      skewY: 2,
      depth,
      depthAngle: 75,
      depthColor: "#070710",
      cuts: [{ ...cut, keep: "right" }],
      cutGlow: glow,
    },
    {
      id: "wingR",
      x: lx + gap,
      y: y + range(r, 0, 3),
      w,
      rotate: tilt,
      skewX: skew,
      skewY: -2,
      depth,
      depthAngle: 75,
      depthColor: "#070710",
      cuts: [{ ...cut, keep: "left" }],
      cutGlow: glow,
      gloss: true,
    },
  ];
  return {
    family: "split",
    mood: `Open Book Wings · ${d.name}`,
    concept:
      "Two phone halves swing open like book covers, each keeping only its outer half, with a bright seam of light between them.",
    background: d.bg,
    shapes: `ONE tall light seam in the middle: roundRect x:49, y:${range(r, 24, 30)}, w:${range(r, 1.5, 3, 0.5)}, h:${range(r, 100, 130)}, fill gradient angle:90 stops ["#FFFFFF","{brand-pop}"], opacity:0.7, blend:"screen" — ${haloShapes(r)}`,
    text: textPart(r, "dark"),
    devices: devicesPart(devs),
    tablet: tabletPart(devs),
    sig: devs.map(sigOf),
    devs,
  };
}

function staircaseSlices(r: Rng): Design {
  const d = pick(r, darkBackdrops(r));
  const { bg, shapes } = splitBackdrop(r, d);
  const lean = pick(r, [-1, 1]) * range(r, 0.04, 0.12, 0.02);
  const line = (mid: number) => ({ x1: mid - lean, y1: -0.1, x2: mid + lean, y2: 1.1 });
  const c1 = line(0.33);
  const c2 = line(0.67);
  const w = range(r, 54, 58);
  const gap = range(r, 3, 6);
  const x0 = (100 - w - 2 * gap) / 2;
  const down = pick(r, [true, false]);
  const step = range(r, 7, 10);
  const rotate = pick(r, [-1, 1]) * range(r, 4, 8);
  const lookup = {
    skewX: range(r, 3, 8),
    depth: range(r, 2.5, 4.5, 0.5),
    depthAngle: 75,
    depthColor: "#080812",
  };
  const glow = pick(r, GLOWS);
  // keep:"right" = visual left side of a top→bottom line; the three strips tile the whole screenshot.
  const strips: Array<DeviceCut[]> = [
    [{ ...c1, keep: "right" }],
    [
      { ...c1, keep: "left" },
      { ...c2, keep: "right" },
    ],
    [{ ...c2, keep: "left" }],
  ];
  const devs: Dev[] = strips.map((cuts, i) => ({
    id: `strip${i + 1}`,
    x: x0 + i * gap,
    y: 31 + (down ? i : 2 - i) * step,
    w,
    rotate,
    ...lookup,
    cuts,
    cutGlow: glow,
    gloss: i === 2,
  }));
  return {
    family: "split",
    mood: `Staircase Slices · ${d.name}`,
    concept:
      "The screenshot is cut into three vertical strips that step down the canvas like a staircase, with thin gaps between them. Together the strips show the whole screenshot.",
    background: bg,
    shapes,
    text: textPart(r, "dark"),
    devices: devicesPart(devs),
    tablet: tabletPart(devs),
    sig: devs.map(sigOf),
    devs,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// WOW — 3-D designs
// ─────────────────────────────────────────────────────────────────────────────

const FRAME_STYLES = ["dark", "titanium", "silver", "gold"] as const;
const DEPTH_COLORS = ["{brand-deep}", "{brand-dark}", "#05050A"] as const;

function isoSlab(r: Rng): Design {
  const d = pick(r, darkBackdrops(r));
  const w = range(r, 48, 62);
  const devs: Dev[] = [
    {
      id: "phone",
      x: (100 - w) / 2 + range(r, -7, 7),
      y: range(r, 33, 40),
      w,
      rotate: range(r, -14, 14),
      skewX: range(r, 8, 20),
      skewY: -range(r, 5, 16),
      depth: range(r, 2.6, 6, 0.2),
      depthAngle: range(r, 38, 80),
      depthColor: pick(r, DEPTH_COLORS),
      frameStyle: pick(r, FRAME_STYLES),
      gloss: true,
      rim: flip(r, 0.6) ? pick(r, ["{brand-pop}", "{brand-glow}", "#FFFFFF"]) : undefined,
      shadow: false,
    },
  ];
  return {
    family: "3d",
    mood: `Isometric Slab · ${d.name}`,
    concept:
      "One phone leans in true isometric perspective with a thick extruded edge, as if it were a glass slab lying on a table.",
    background: d.bg,
    shapes: haloShapes(r),
    text: textPart(r, "dark"),
    devices: devicesPart(devs),
    tablet: tabletPart(devs),
    sig: devs.map(sigOf),
    devs,
  };
}

function depthStack(r: Rng): Design {
  const d = pick(r, darkBackdrops(r));
  const dir = pick(r, [-1, 1]);
  const w = range(r, 54, 62);
  const sx = range(r, 6, 10);
  const sy = range(r, 4, 7);
  const rot = dir * range(r, 4, 9);
  const baseX = (100 - w) / 2 + dir * -range(r, 4, 8);
  const baseY = range(r, 38, 44);
  const scales = [0.78, 0.89, 1];
  const dims = [0.55, 0.3, 0];
  const devs: Dev[] = scales.map((s, i) => ({
    id: i === 2 ? "front" : `back${i + 1}`,
    x: baseX + dir * (2 - i) * sx + (w - w * s) / 2,
    y: baseY - (2 - i) * sy,
    w: w * s,
    rotate: rot,
    skewX: range(r, 3, 8),
    skewY: -range(r, 2, 6),
    depth: 2,
    depthAngle: 70,
    depthColor: "{brand-deep}",
    dim: dims[i],
    frameStyle: "dark",
    gloss: i === 2,
    rim: i === 2 ? "{brand-pop}" : undefined,
    shadow: i === 2,
  }));
  return {
    family: "3d",
    mood: `Depth Stack · ${d.name}`,
    concept:
      "Three copies of the phone are stacked into the distance, each smaller and darker than the one in front, like a deck of cards fanned in 3-D space.",
    background: d.bg,
    shapes: haloShapes(r),
    text: textPart(r, "dark"),
    devices: devicesPart(devs),
    tablet: tabletPart(devs),
    sig: devs.map(sigOf),
    devs,
  };
}

function heavySlab(r: Rng): Design {
  const d = pick(r, darkBackdrops(r));
  const w = range(r, 50, 60);
  const devs: Dev[] = [
    {
      id: "phone",
      x: (100 - w) / 2 + range(r, -4, 4),
      y: range(r, 34, 40),
      w,
      rotate: range(r, -6, 6),
      skewX: range(r, 0, 6),
      skewY: -range(r, 0, 5),
      depth: range(r, 6.5, 10, 0.5),
      depthAngle: range(r, 58, 78),
      depthColor: pick(r, DEPTH_COLORS),
      frameStyle: pick(r, FRAME_STYLES),
      gloss: true,
      rim: pick(r, ["{brand-pop}", "{brand-pale}"]),
      shadow: false,
    },
  ];
  return {
    family: "3d",
    mood: `Heavy Monolith · ${d.name}`,
    concept:
      "A chunky, deeply extruded phone stands like a monolith: very thick side walls, a glowing rim, almost no tilt so the screen stays readable.",
    background: d.bg,
    shapes: haloShapes(r),
    text: textPart(r, "dark"),
    devices: devicesPart(devs),
    tablet: tabletPart(devs),
    sig: devs.map(sigOf),
    devs,
  };
}

function orbitPair(r: Rng): Design {
  const d = pick(r, darkBackdrops(r));
  const dir = pick(r, [-1, 1]);
  const fw = range(r, 54, 62);
  const bw = range(r, 38, 46);
  const devs: Dev[] = [
    {
      id: "rear",
      x: dir === 1 ? range(r, 54, 62) : range(r, -2, 6),
      y: range(r, 33, 38),
      w: bw,
      rotate: -dir * range(r, 9, 15),
      skewX: dir * range(r, 4, 9),
      depth: 1.6,
      depthAngle: 60,
      depthColor: "#05050A",
      dim: 0.5,
      show: "next",
      frameStyle: "dark",
      shadow: false,
    },
    {
      id: "front",
      x: dir === 1 ? range(r, 6, 14) : range(r, 30, 38),
      y: range(r, 40, 47),
      w: fw,
      rotate: dir * range(r, 5, 11),
      skewX: dir * range(r, 7, 14),
      skewY: -dir * range(r, 3, 8),
      depth: range(r, 3, 5, 0.2),
      depthAngle: range(r, 45, 70),
      depthColor: pick(r, DEPTH_COLORS),
      frameStyle: pick(r, FRAME_STYLES),
      gloss: true,
      rim: pick(r, ["{brand-pop}", "{brand-glow}"]),
      shadow: false,
    },
  ];
  return {
    family: "3d",
    mood: `Orbit Pair · ${d.name}`,
    concept:
      "A large 3-D phone in front and a smaller, dimmed phone behind it showing the next screen, tilted away like two bodies in orbit.",
    background: d.bg,
    shapes: haloShapes(r),
    text: textPart(r, "dark"),
    devices: devicesPart(devs),
    tablet: tabletPart(devs),
    sig: devs.map(sigOf),
    devs,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMPLE — flat, airy designs
// ─────────────────────────────────────────────────────────────────────────────

interface LightBackdrop {
  name: string;
  tone: Tone;
  bg: string;
  frame: string;
}

function lightBackdrops(r: Rng): LightBackdrop[] {
  const angle = range(r, 140, 200, 5);
  return [
    { name: "Paper", tone: "light", bg: solid("#FFFFFF"), frame: "silver" },
    { name: "Mist", tone: "light", bg: gradient(angle, "{brand-pale}", "#FFFFFF"), frame: "silver" },
    { name: "Cloud", tone: "light", bg: gradient(angle, "#F0F4FF", "{brand-pale}"), frame: "white" },
    { name: "Brand block", tone: "dark", bg: solid("{brand}"), frame: "white" },
    { name: "Midnight", tone: "dark", bg: solid("{brand-dark}"), frame: "titanium" },
    { name: "Ink", tone: "dark", bg: solid("#0F172A"), frame: "dark" },
  ];
}

function quietDecor(r: Rng, tone: Tone, y: number): string {
  const line = tone === "dark" ? "#FFFFFF" : "{brand}";
  return pick(r, [
    () => "No decoration at all — just the background, the device and the text.",
    () =>
      `ONE soft circle: x:${range(r, -20, 55)}, y:${range(r, -10, 90)}, w:${range(r, 60, 90)}, fill radial {brand-light}, opacity:${range(r, 0.18, 0.3, 0.02)}`,
    () =>
      `ONE stroke ring: circle x:${range(r, 5, 20)}, y:${y - 6}, w:${range(r, 60, 80)}, stroke "${line}", strokeWidth:0.4, opacity:0.18`,
    () =>
      `ONE thin accent bar: roundRect x:${range(r, 30, 42)}, y:${y - 3}, w:${range(r, 16, 28)}, h:0.9, fill solid {brand}, opacity:0.85`,
    () =>
      `THREE small dots: circle w:${range(r, 2, 3.5, 0.5)}, fill solid {brand}, opacity:0.5, at x:${range(r, 6, 14)}/y:${range(r, 28, 36)}, x:${range(r, 84, 92)}/y:${range(r, 62, 76)}, x:${range(r, 10, 20)}/y:${range(r, 110, 130)}`,
  ])();
}

function simpleLayout(r: Rng): Design {
  const d = pick(r, lightBackdrops(r));
  const lowW = range(r, 48, 52);
  const miniW = range(r, 40, 44);
  const layout = pick(r, [
    {
      name: "Right Hang",
      align: "center" as const,
      dev: { x: range(r, 34, 42), y: range(r, 42, 54), w: range(r, 56, 64), rotate: -range(r, 4, 8) },
    },
    {
      name: "Left Hang",
      align: "center" as const,
      dev: { x: range(r, -4, 6), y: range(r, 42, 54), w: range(r, 56, 64), rotate: range(r, 4, 8) },
    },
    {
      name: "Tall Bleed",
      align: "center" as const,
      dev: { x: range(r, 10, 14), y: range(r, 40, 48), w: range(r, 74, 80), rotate: 0 },
    },
    {
      name: "Small & High",
      align: "center" as const,
      dev: { x: range(r, 25, 29), y: range(r, 30, 33), w: range(r, 46, 50), rotate: 0 },
    },
    {
      name: "Tilted Card",
      align: "center" as const,
      dev: {
        x: range(r, 18, 24),
        y: range(r, 36, 42),
        w: range(r, 56, 62),
        rotate: pick(r, [-1, 1]) * range(r, 4, 7),
      },
    },
    {
      name: "Peek Right",
      align: "left" as const,
      dev: { x: range(r, 46, 56), y: range(r, 30, 38), w: range(r, 58, 66), rotate: 0 },
    },
    {
      name: "Peek Left",
      align: "left" as const,
      dev: { x: range(r, -20, -10), y: range(r, 30, 38), w: range(r, 58, 66), rotate: 0 },
    },
    // Complete layouts that keep the whole phone on the canvas (the Peek ones crop it on purpose).
    {
      name: "Low Phone",
      align: "center" as const,
      dev: { x: (100 - lowW) / 2, y: range(r, 62, 66), w: lowW, rotate: 0 },
    },
    {
      name: "Mini Center",
      align: "center" as const,
      dev: { x: (100 - miniW) / 2, y: range(r, 48, 54), w: miniW, rotate: 0 },
    },
    {
      name: "Left Lean",
      align: "center" as const,
      dev: { x: range(r, 6, 12), y: range(r, 46, 54), w: range(r, 50, 54), rotate: range(r, 6, 10) },
    },
    {
      name: "Right Lean",
      align: "center" as const,
      dev: { x: range(r, 38, 44), y: range(r, 46, 54), w: range(r, 50, 54), rotate: -range(r, 6, 10) },
    },
  ]);
  const devs: Dev[] = [
    {
      id: "phone",
      ...layout.dev,
      depth: flip(r, 0.4) ? range(r, 0.8, 1.4, 0.2) : undefined,
      depthAngle: 90,
      depthColor: "{brand-deep}",
      frameStyle: d.frame,
      shadow: d.tone === "light",
    },
  ];
  return {
    family: "clean",
    mood: `${layout.name} · ${d.name}`,
    concept:
      "Flat and airy: one phone, one calm background, generous empty space, strong readable headline. No 3-D, no cuts, no clutter.",
    background: d.bg,
    shapes: quietDecor(r, d.tone, Math.round(layout.dev.y)),
    text: textPart(r, d.tone, layout.align),
    devices: devicesPart(devs),
    tablet: tabletPart(devs),
    sig: devs.map(sigOf),
    devs,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Coverage — the user's whole screenshot must stay visible
// ─────────────────────────────────────────────────────────────────────────────

const PHONE_ASPECT = 0.462;
const PHONE_RADIUS = 0.13;
const CANVAS_HEIGHT = (1920 / 1080) * 100;
const GRID_U = 20;
const GRID_V = 40;

interface Placed {
  center: Point;
  /** Linear part of the layer transform: rotate · skew, same order as the renderer. */
  m: [number, number, number, number];
  piece: Point[];
  box: { x: number; y: number; w: number; h: number };
}

const TABLET_ASPECT = 0.74;

function place(d: Dev): Placed {
  const w = d.w;
  const h = w / (d.frame === "tablet-generic" ? TABLET_ASPECT : PHONE_ASPECT);
  const box = { x: d.x, y: d.y, w, h };
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const cos = Math.cos(rad(d.rotate ?? 0));
  const sin = Math.sin(rad(d.rotate ?? 0));
  const tx = Math.tan(rad(d.skewX ?? 0));
  const ty = Math.tan(rad(d.skewY ?? 0));
  // R · S with S = [[1, tx], [ty, 1]]
  const m: Placed["m"] = [cos - sin * ty, cos * tx - sin, sin + cos * ty, sin * tx + cos];
  return {
    center: [d.x + w / 2, d.y + h / 2],
    m,
    piece: cutPolygon(box, PHONE_RADIUS * w, d.cuts ?? []),
    box,
  };
}

function inside(p: Point, poly: Point[]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

function toCanvas(pl: Placed, p: Point): Point {
  const [a, b, c, d] = pl.m;
  const dx = p[0] - pl.center[0];
  const dy = p[1] - pl.center[1];
  return [pl.center[0] + a * dx + b * dy, pl.center[1] + c * dx + d * dy];
}

function toLocal(pl: Placed, q: Point): Point {
  const [a, b, c, d] = pl.m;
  const det = a * d - b * c;
  const dx = q[0] - pl.center[0];
  const dy = q[1] - pl.center[1];
  return [pl.center[0] + (d * dx - b * dy) / det, pl.center[1] + (-c * dx + a * dy) / det];
}

export interface Visible {
  /** Share of the screenshot that ends up on the canvas, uncovered by another phone. */
  all: number;
  /** Same, for the top 60% of the screenshot (the part that is never legitimately cropped). */
  top: number;
}

/** Simulates the renderer's transforms, cuts and overlaps on a grid of screenshot positions. */
export function visibleShare(devs: Dev[]): Visible {
  const placed = devs.map(place);
  let seen = 0;
  let seenTop = 0;
  let total = 0;
  let totalTop = 0;
  for (let gv = 0; gv < GRID_V; gv++) {
    for (let gu = 0; gu < GRID_U; gu++) {
      const top = gv < GRID_V * 0.6;
      total++;
      if (top) totalTop++;
      const shown = devs.some((d, i) => {
        if (d.dim) return false;
        const pl = placed[i];
        const local: Point = [
          pl.box.x + ((gu + 0.5) / GRID_U) * pl.box.w,
          pl.box.y + ((gv + 0.5) / GRID_V) * pl.box.h,
        ];
        if (!inside(local, pl.piece)) return false;
        const q = toCanvas(pl, local);
        if (q[0] < 0 || q[0] > 100 || q[1] < 0 || q[1] > CANVAS_HEIGHT) return false;
        return !placed.slice(i + 1).some((front) => inside(toLocal(front, q), front.piece));
      });
      if (shown) {
        seen++;
        if (top) seenTop++;
      }
    }
  }
  return { all: seen / total, top: seenTop / totalTop };
}

const MIN_VISIBLE = { all: 0.93, top: 0.985 };

// ─────────────────────────────────────────────────────────────────────────────
// CARDS — headline + 2-3 feature boxes ("callout" layers) around a phone
// ─────────────────────────────────────────────────────────────────────────────

export type CardLayout = "row-top" | "row-bottom" | "left" | "right" | "gutter";

export interface Card {
  id: string;
  index: number;
  x: number;
  y: number;
  w: number;
  fontSize: number;
  look: "glass" | "solid" | "outline" | "accent";
  icon: "none" | "number" | "tick";
  fill?: string;
  color?: string;
  accentColor: string;
}

/**
 * Worst-case card height in % of canvas width, per unit of fontSize: padding, a two-line title,
 * the gap, and a three-line description. Used to space cards so they can never overlap.
 */
const CARD_HEIGHT_PER_FONT = 7.5;
export const cardHeight = (fontSize: number) => fontSize * CARD_HEIGHT_PER_FONT;

function cardLine(c: Card): string {
  const parts = [
    `"type":"callout"`,
    `"id":"${c.id}"`,
    `"index":${c.index}`,
    `"x":${n(c.x)}`,
    `"y":${n(c.y)}`,
    `"w":${n(c.w)}`,
    `"fontSize":${n(c.fontSize)}`,
    `"look":"${c.look}"`,
    `"icon":"${c.icon}"`,
  ];
  if (c.fill) parts.push(`"fill":"${c.fill}"`);
  if (c.color) parts.push(`"color":"${c.color}"`);
  parts.push(`"accentColor":"${c.accentColor}"`);
  return `{ ${parts.join(", ")} }`;
}

function cardsPart(cards: Card[]): string {
  const lines = cards.map((c, i) => `  ${i + 1}. ${cardLine(c)}`).join("\n");
  return `${cards.length} "callout" layers (feature cards), placed AFTER the device layers; copy these numbers exactly. Do NOT add a "bullets" layer, and do NOT write the card text — the app fills it in from the user:\n${lines}`;
}

function cardStyle(r: Rng, tone: Tone): Pick<Card, "look" | "fill" | "color" | "accentColor"> {
  if (tone === "dark") {
    const look = pick(r, ["glass", "glass", "solid", "outline", "accent"] as const);
    if (look === "solid") return { look, fill: "#FFFFFF", color: "{brand-deep}", accentColor: "{brand}" };
    return { look, accentColor: pick(r, ["{brand-pop}", "{brand-glow}", "{brand-pale}"]) };
  }
  const look = pick(r, ["solid", "accent", "outline"] as const);
  const base = { look, color: "{brand-deep}", accentColor: "{brand}" };
  return look === "outline" ? base : { ...base, fill: "#FFFFFF" };
}

interface CardSetup {
  d: Backdrop | LightBackdrop;
  tone: Tone;
  frame: string;
  shapes: string;
}

function cardSetup(r: Rng): CardSetup {
  const d = pick(r, [...darkBackdrops(r), ...lightBackdrops(r)]);
  const frame = "frame" in d ? d.frame : pick(r, ["titanium", "dark", "silver"]);
  const shapes = d.tone === "dark" ? haloShapes(r) : quietDecor(r, d.tone, 40);
  return { d, tone: d.tone, frame, shapes };
}

const TABLET_CANVAS_HEIGHT = 130;

function tabletRows(entries: Array<[string, Record<string, string | number>]>): string {
  const rows = entries.map(
    ([id, patch]) =>
      `"${id}": { ${Object.entries(patch)
        .map(([k, v]) => `"${k}":${typeof v === "number" ? n(v) : `"${v}"`}`)
        .join(", ")} }`,
  );
  return `"tabletOverrides": { "layers": { ${rows.join(", ")} } }`;
}

function finishCards(
  r: Rng,
  setup: CardSetup,
  layout: CardLayout,
  mood: string,
  concept: string,
  cards: Card[],
  devs: Dev[],
  tablet: string,
  align: "center" | "left" = "center",
): Design {
  return {
    family: "cards",
    mood: `${mood} · ${setup.d.name}`,
    concept,
    background: setup.d.bg,
    shapes: setup.shapes,
    text: textPart(r, setup.tone, align),
    devices: devicesPart(devs),
    tablet,
    sig: devs.map(sigOf),
    devs,
    cards,
    cardsText: cardsPart(cards),
    cardLayout: layout,
  };
}

/** Half the card designs get a leaning, extruded phone, which makes them clearly different from the flat built-ins. */
function cardLean(r: Rng, dir = pick(r, [-1, 1])): Partial<Dev> {
  if (!flip(r, 0.6)) return {};
  return {
    rotate: dir * range(r, 4, 8),
    skewX: dir * range(r, 4, 8),
    skewY: -dir * range(r, 2, 5),
    depth: range(r, 2.5, 4, 0.5),
    depthAngle: 70,
    depthColor: "{brand-deep}",
  };
}

function cardRowTop(r: Rng): Design {
  const s = cardSetup(r);
  const fs = range(r, 2.8, 3.1, 0.1);
  const y0 = range(r, 33, 34);
  const look = cardStyle(r, s.tone);
  const cards: Card[] = [3.5, 35.5, 67.5].map((x, i) => ({
    id: `card${i + 1}`,
    index: i,
    x,
    y: y0,
    w: 29,
    fontSize: fs,
    icon: "none",
    ...look,
  }));
  const lean = cardLean(r);
  const leaning = lean.depth !== undefined;
  const y = Math.ceil(y0 + cardHeight(fs) + (leaning ? 8 : 3));
  const w = Math.min(range(r, leaning ? 44 : 50, leaning ? 48 : 54), (172 - y) * 0.462);
  const devs: Dev[] = [
    {
      id: "phone",
      x: (100 - w) / 2,
      y,
      w,
      depth: 1,
      depthAngle: 90,
      depthColor: "{brand-deep}",
      frameStyle: s.frame,
      gloss: true,
      ...lean,
    },
  ];
  const ty = Math.ceil(y0 - 2 + cardHeight(fs) + 3);
  const tablet = tabletRows([
    ...cards.map((c): [string, Record<string, string | number>] => [c.id, { y: y0 - 2 }]),
    ["phone", { frame: "tablet-generic", x: (100 - Math.min(w, 50)) / 2, y: ty, w: Math.min(w, 50) }],
  ]);
  return finishCards(
    r,
    s,
    "row-top",
    "Card Row",
    "Three feature cards sit in a row under the headline, with the phone centered below them.",
    cards,
    devs,
    tablet,
  );
}

function cardRowBottom(r: Rng): Design {
  const s = cardSetup(r);
  const fs = range(r, 2.8, 3.1, 0.1);
  const look = cardStyle(r, s.tone);
  const lean = cardLean(r);
  const leaning = lean.depth !== undefined;
  const gapBelow = leaning ? 8 : 3;
  const y = range(r, 32, 34);
  let w = range(r, leaning ? 42 : 48, leaning ? 46 : 52);
  while (y + w / PHONE_ASPECT + gapBelow + cardHeight(fs) > 174) w -= 1;
  const cardY = Math.ceil(y + w / PHONE_ASPECT + gapBelow);
  const cards: Card[] = [3.5, 35.5, 67.5].map((x, i) => ({
    id: `card${i + 1}`,
    index: i,
    x,
    y: cardY,
    w: 29,
    fontSize: fs,
    icon: "none",
    ...look,
  }));
  const devs: Dev[] = [
    {
      id: "phone",
      x: (100 - w) / 2,
      y,
      w,
      depth: 1,
      depthAngle: 90,
      depthColor: "{brand-deep}",
      frameStyle: s.frame,
      gloss: true,
      ...lean,
    },
  ];
  let tw = Math.min(w, 50);
  while (y - 1 + tw * 1.351 + 3 + cardHeight(fs) > TABLET_CANVAS_HEIGHT) tw -= 1;
  const tCardY = Math.ceil(y - 1 + tw * 1.351 + 3);
  const tablet = tabletRows([
    ...cards.map((c): [string, Record<string, string | number>] => [c.id, { y: tCardY }]),
    ["phone", { frame: "tablet-generic", x: (100 - tw) / 2, y: y - 1, w: tw }],
  ]);
  return finishCards(
    r,
    s,
    "row-bottom",
    "Card Dock",
    "The phone sits high under the headline and three feature cards line up underneath it like a dock.",
    cards,
    devs,
    tablet,
  );
}

function cardStack(r: Rng): Design {
  const s = cardSetup(r);
  const phoneRight = flip(r);
  const fs = range(r, 3.0, 3.3, 0.1);
  const cw = range(r, 36, 38);
  const gap = range(r, 4, 6);
  const y1 = range(r, 46, 50);
  const look = cardStyle(r, s.tone);
  const icon = pick(r, ["number", "tick", "none"] as const);
  const step = cardHeight(fs) + gap;
  const cardX = phoneRight ? 4 : 100 - 4 - cw;
  const cards: Card[] = [0, 1, 2].map((i) => ({
    id: `card${i + 1}`,
    index: i,
    x: cardX,
    y: y1 + i * step,
    w: cw,
    fontSize: fs,
    icon,
    ...look,
  }));
  const w = range(r, 48, 52);
  const x = phoneRight ? 100 - w - range(r, 1, 3) : range(r, 1, 3);
  const lean = cardLean(r, phoneRight ? 1 : -1);
  const devs: Dev[] = [
    {
      id: "phone",
      x,
      y: range(r, 38, 42),
      w,
      rotate: 0,
      depth: range(r, 1, 1.6, 0.2),
      depthAngle: 80,
      depthColor: "#05050A",
      frameStyle: s.frame,
      gloss: true,
      ...lean,
    },
  ];
  const tStep = cardHeight(fs) + 4;
  const tw = Math.min(w, 50);
  const tablet = tabletRows([
    ...cards.map((c, i): [string, Record<string, string | number>] => [
      c.id,
      { y: 36 + i * tStep, w: Math.min(cw + 2, 40) },
    ]),
    ["phone", { frame: "tablet-generic", x: phoneRight ? 100 - tw - 2 : 2, y: 32, w: tw }],
  ]);
  const layout: CardLayout = phoneRight ? "left" : "right";
  return finishCards(
    r,
    s,
    layout,
    "Card Stack",
    `Three feature cards stack on the ${phoneRight ? "left" : "right"} while the phone takes the other side, slightly tilted.`,
    cards,
    devs,
    tablet,
    flip(r) ? "left" : "center",
  );
}

function cardGutter(r: Rng): Design {
  const s = cardSetup(r);
  const fs = range(r, 2.5, 2.7, 0.1);
  const cw = range(r, 23, 24.5, 0.5);
  const look = cardStyle(r, s.tone);
  const y1 = range(r, 48, 52);
  const step = cardHeight(fs) + range(r, 8, 12);
  const xs = [2, 100 - 2 - cw, 2];
  const cards: Card[] = xs.map((x, i) => ({
    id: `card${i + 1}`,
    index: i,
    x,
    y: y1 + i * step,
    w: cw,
    fontSize: fs,
    icon: "none",
    ...look,
  }));
  const w = range(r, 42, 45);
  const devs: Dev[] = [
    {
      id: "phone",
      x: (100 - w) / 2,
      y: range(r, 36, 40),
      w,
      depth: 1.2,
      depthAngle: 85,
      depthColor: "{brand-deep}",
      frameStyle: s.frame,
      gloss: true,
      ...cardLean(r),
    },
  ];
  const tStep = cardHeight(fs) + 6;
  const tablet = tabletRows([
    ...cards.map((c, i): [string, Record<string, string | number>] => [c.id, { y: 38 + i * tStep }]),
    ["phone", { frame: "tablet-generic", x: (100 - 46) / 2, y: 34, w: 46 }],
  ]);
  return finishCards(
    r,
    s,
    "gutter",
    "Gutter Cards",
    "A centered phone with small feature cards hanging in the empty margins on either side of it.",
    cards,
    devs,
    tablet,
  );
}

const CARD_VARIANTS = [cardRowTop, cardRowBottom, cardStack, cardGutter];

/** Where a template's feature cards sit, or null when it has none. */
export function cardLayoutOf(template: Template): CardLayout | null {
  const cards = template.layers.filter((l) => l.type === "callout");
  if (cards.length === 0) return null;
  const ys = cards.map((c) => c.y);
  if (Math.max(...ys) - Math.min(...ys) < 5) {
    const phoneY = Math.min(...template.layers.filter((l) => l.type === "device").map((l) => l.y));
    return phoneY > ys[0] ? "row-top" : "row-bottom";
  }
  const xs = cards.map((c) => c.x);
  if (xs.every((x) => x < 50)) return "left";
  if (xs.every((x) => x > 50)) return "right";
  return "gutter";
}

/** True when no card overlaps a phone (or runs off the canvas), so no screenshot is hidden. */
export function cardsAreClear(design: Design): boolean {
  if (!design.cards) return true;
  return design.cards.every((c) => {
    const bottom = c.y + cardHeight(c.fontSize);
    if (c.x < 0 || c.x + c.w > 100 || bottom > CANVAS_HEIGHT - 1) return false;
    return design.devs.every((d) => {
      const pl = place(d);
      const { x, y, w, h } = pl.box;
      const corners = (
        [
          [x, y],
          [x + w, y],
          [x, y + h],
          [x + w, y + h],
        ] as Point[]
      ).map((p) => toCanvas(pl, p));
      const left = Math.min(...corners.map((p) => p[0]));
      const right = Math.max(...corners.map((p) => p[0]));
      const top = Math.min(...corners.map((p) => p[1]));
      const low = Math.max(...corners.map((p) => p[1]));
      const apart = c.x + c.w < left - 0.5 || c.x > right + 0.5 || bottom < top - 0.5 || c.y > low + 0.5;
      return apart;
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Novelty — how different is a design from everything already in the app?
// ─────────────────────────────────────────────────────────────────────────────

function pairDistance(a: DeviceSig, b: DeviceSig): number {
  return (
    Math.abs(a.x - b.x) / 10 +
    Math.abs(a.y - b.y) / 10 +
    Math.abs(a.w - b.w) / 12 +
    Math.abs(a.rotate - b.rotate) / 8 +
    Math.abs(a.skewX - b.skewX) / 8 +
    Math.abs(a.skewY - b.skewY) / 8 +
    Math.abs(a.depth - b.depth) / 2 +
    (a.cuts === b.cuts ? 0 : 1)
  );
}

export function signatureOf(template: Template): DeviceSig[] {
  return template.layers
    .filter((l): l is DeviceLayer => l.type === "device")
    .map((l) => ({
      x: l.x,
      y: l.y,
      w: l.w,
      rotate: l.rotate ?? 0,
      skewX: l.skewX ?? 0,
      skewY: l.skewY ?? 0,
      depth: l.depth ?? 0,
      cuts: l.cuts?.length ?? 0,
    }));
}

export function designDistance(candidate: DeviceSig[], existing: DeviceSig[]): number {
  if (candidate.length === 0 || existing.length === 0) return 0;
  const near =
    candidate.reduce((sum, a) => sum + Math.min(...existing.map((b) => pairDistance(a, b))), 0) /
    candidate.length;
  return near + Math.abs(candidate.length - existing.length) * 3;
}

const CANDIDATES = 48;
/** A design this far from every existing template counts as a genuinely new composition. */
export const NOVEL_ENOUGH = 3;

const SPLIT_VARIANTS = [splitCutDuo, shardBreak, openBook, staircaseSlices];
const THREE_D_VARIANTS = [isoSlab, depthStack, heavySlab, orbitPair];

/**
 * Builds many random designs of ONE family (split or 3-D for wow) and returns a random
 * one that is far from every existing template — or the furthest one if none is far enough.
 */
export function pickDesign(style: PromptStyle, seed: number, existing: Template[]): PickedDesign {
  const r = mulberry32(seed || 1);
  const variants =
    style === "cards"
      ? CARD_VARIANTS
      : style === "simple"
        ? [simpleLayout]
        : flip(r)
          ? SPLIT_VARIANTS
          : THREE_D_VARIANTS;
  // A card design only competes with templates that already have cards, and a different card
  // arrangement (row, stack, gutter…) counts as clearly different on its own.
  const known = existing
    .filter((t) => style !== "cards" || cardLayoutOf(t) !== null)
    .map((t) => ({ name: t.name, sig: signatureOf(t), layout: cardLayoutOf(t) }));

  const scored: PickedDesign[] = [];
  for (let i = 0; i < CANDIDATES; i++) {
    const design = pick(r, variants)(r);
    let nearest: PickedDesign["nearest"] = null;
    for (const k of known) {
      const distance =
        designDistance(design.sig, k.sig) + (design.cardLayout && design.cardLayout !== k.layout ? 3 : 0);
      if (!nearest || distance < nearest.distance) nearest = { name: k.name, distance };
    }
    scored.push({ design, nearest });
  }
  const dist = (p: PickedDesign) => p.nearest?.distance ?? Infinity;
  const isComplete = (p: PickedDesign) => {
    const v = visibleShare(p.design.devs);
    return v.all >= MIN_VISIBLE.all && v.top >= MIN_VISIBLE.top && cardsAreClear(p.design);
  };

  // Novelty is cheap to compute and completeness is not, so only check completeness for as many
  // randomly ordered novel candidates as it takes to find a design that keeps the whole screenshot.
  const novel = scored.filter((p) => dist(p) >= NOVEL_ENOUGH);
  for (let i = novel.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [novel[i], novel[j]] = [novel[j], novel[i]];
  }
  const firstNovel = novel.find(isComplete);
  if (firstNovel) return firstNovel;

  // No novel design is complete: prefer a complete one that is as different as possible, and only
  // give up completeness if none of the candidates has it.
  const byDistance = [...scored].sort((x, y) => dist(y) - dist(x));
  return byDistance.find(isComplete) ?? byDistance[0];
}

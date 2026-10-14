import type { Template } from "@/types";

import { TEMPLATES } from "./index";
import { pickDesign, type PromptStyle } from "./promptDesigns";

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA REFERENCE embedded in every prompt
// ─────────────────────────────────────────────────────────────────────────────

const SCHEMA_REFERENCE = `
╔══════════════════════════════════════════════════════════════╗
║             SHELFSHOT TEMPLATE JSON — FULL SCHEMA            ║
╚══════════════════════════════════════════════════════════════╝

TOP-LEVEL OBJECT
────────────────
{
  "id":           string   kebab-case, e.g. "neon-prism"
  "name":         string   short title shown in the UI, e.g. "Neon Prism"
  "category":     "general" | "education" | "office" | "food" | "fitness" | "health" | "kids" | "games"
  "description":  string   1–2 sentence visual description
  "background":   Fill     see Fill types below
  "layers":       Layer[]  ordered BACK→FRONT; MUST include ≥1 device + ≥1 text(role:"headline")
  "supports":     ["phone","tablet"]
  "tabletOverrides"?: { layers?: Record<layerIdOrRole, partial-layer-patch> }
}

FILL TYPES
──────────
  Solid:    { "type": "solid",    "color": "#RRGGBB" }
  Gradient: { "type": "gradient", "angle": 0–360, "stops": ["#hex1", "#hex2"] }
  Radial:   { "type": "radial",   "color": "#RRGGBB" }  ← shapes only

BRAND TOKENS  (replace these strings; they resolve to brand-derived colors at render time)
────────────
  {brand}       exact brand color
  {brand-light} lighter tint
  {brand-pale}  near-white pastel tint
  {brand-dark}  darker shade
  {brand-deep}  near-black deep shade
  {brand-glow}  hue-shifted glow (purple→cyan, red→orange, etc.)
  {brand-shift} complementary hue shift
  {brand-pop}   high-saturation accent

COORDINATE SYSTEM  ← READ THIS CAREFULLY
─────────────────
• EVERY numeric x / y / w / fontSize is a PERCENTAGE OF CANVAS WIDTH.
• Canvas for a phone 1080×1920: width=100%, height=177.8% (i.e. 1920/1080 × 100 ≈ 177.8).
• So y:100 = exactly the canvas height on a phone. y:177 ≈ the very bottom.
• TEXT must always live in the TOP ZONE:   y between 4 and 28.
• DEVICE must always live in the BOTTOM ZONE: y between 28 and 60 (with bleed:true it fills rest).
• SHAPES can go anywhere (negative x/y is fine for partial-crop effects).

SAFE LAYOUT RECIPE (follow this unless the design specifically demands otherwise)
──────────────────
  headline:    x:8,  y:6,  w:84,  fontSize:7.0–8.5
  subheadline: x:10, y:21, w:80,  fontSize:3.0–3.8  (absolute y, NO stackBelow)
  If you use stackBelow:"headline", y is only the GAP under the headline: use y:1–3, never y:20.
  phone:       x:17, y:33, w:66,  bleed:true   ← fills the lower 2/3 naturally
  tablet:      same but set frame:"tablet-generic" via tabletOverrides

LAYER TYPES
───────────

1. TEXT
{
  "type":       "text",
  "role":       "headline" | "subheadline",
  "x": number, "y": number, "w": number,
  "fontSize":   number  (% of canvas width; headline 6.5–9, subheadline 2.8–4.0)
  "weight"?:    400 | 600 | 700 | 800 | 900
  "align"?:     "left" | "center" | "right"
  "color"?:     "#hex" or brand token
  "accentColor"?: brand token  ← colorizes the **first word** of the headline
  "anchor"?:    "top" | "bottom"   (bottom = measured from canvas bottom; y is offset from bottom)
  "maxLines"?:  number
  "stackBelow"?: "headline"   ← subheadline starts below the headline's last line; its "y" then becomes the gap below the headline (1–3), NOT an absolute position
  "shadow"?:    true
  "uppercase"?: true
  "stroke"?:    "#hex"
  "strokeWidth"?: number  (% of canvas width, e.g. 0.2)
  "opacity"?:   0–1
  "rotate"?:    degrees
  "hideOnWide"?: true  ← hides on landscape feature-graphic
}

2. DEVICE
{
  "type":    "device",
  "id"?:     string  ← REQUIRED if you have >1 device OR use tabletOverrides
  "frame":   "phone-generic" | "tablet-generic" | "none"
  "x": number, "y": number, "w": number,
  "shadow"?:     true
  "bleed"?:      true   ← phone can overflow canvas bottom edge (recommended)
  "frameStyle"?: "dark" | "silver" | "gold" | "titanium" | "white"
  "rotate"?:     degrees (small: ±3–12 for tilt, ±12–25 for dramatic)
  "skewX"?:      degrees (isometric X tilt, e.g. 10–18)
  "skewY"?:      degrees (isometric Y tilt, e.g. -4 to -12; use with skewX)
  "depth"?:      number (% of canvas width; 3-D extrusion thickness, e.g. 1.5–4)
  "depthAngle"?: 0–180  (55 = classic isometric, 90 = straight-down)
  "depthColor"?: "#hex" or brand token
  "gloss"?:      true   ← glass shine overlay
  "rim"?:        "#hex" or brand token  ← neon edge glow (looks great on dark bgs)
  "dim"?:        0–1    ← dark veil over screenshot (use for "prev"/"next" ghost phones)
  "alternateOffset"?: number  ← odd-indexed slides shift horizontally by this % of width
  "show"?:       "self" | "prev" | "next"  ← which screenshot to display
  "cuts"?:       DeviceCut[]  ← slice phone along a line
  "cutGlow"?:    "#hex" ← glowing line drawn along the cut edge
}

DeviceCut  { "x1":0–1, "y1":0–1, "x2":0–1, "y2":0–1, "keep":"left"|"right" }
  x1/y1 = start point, x2/y2 = end point — as FRACTIONS of device size (not canvas).
  DIRECTION MATTERS: on a top→bottom line (y1 < y2), keep:"right" shows the visual LEFT part of the
  phone and keep:"left" shows the visual RIGHT part. Two halves of one screenshot therefore use
  the same line with opposite keep values.
  Example vertical center cut: { "x1":0.5,"y1":-0.1,"x2":0.5,"y2":1.1,"keep":"left" }

3. SHAPE
{
  "type":  "shape",
  "shape": "circle" | "roundRect" | "polygon",
  "x": number, "y": number, "w": number,
  "h"?:        number  (height override for non-square roundRect / ellipse)
  "yUnit"?:    "width" | "height"  ← "height" measures y from canvas HEIGHT instead of width
  "fill"?:     Fill
  "stroke"?:   "#hex"
  "strokeWidth"?: number
  "opacity"?:  0–1
  "blend"?:    "screen" | "overlay" | "multiply" | "lighter" | "soft-light"
  "rotate"?:   degrees
  "shadow"?:   true
  "radius"?:   number  (corner radius for roundRect, % of canvas width)
  "paintsBackground"?: true  ← hides when user applies their own bg override
  "hideOnWide"?: true
  // polygon only:
  "points": [[x,y], [x,y], ...]  ← ≥3 points as % of canvas width (or height if yUnit:"height")
}

4. BULLETS
{
  "type": "bullets",
  "x": number, "y": number, "w": number,
  "fontSize":  number,
  "color"?:    "#hex",
  "iconColor"?: "#hex" or brand token,
  "weight"?:   number
}

5. CALLOUT  (a feature card / "box": rounded panel with a bold title and a short description)
{
  "type":    "callout",
  "id"?:     string   ← REQUIRED if you use tabletOverrides for it
  "index":   0 | 1 | 2   ← which of the user's 3 card texts this box shows
  "x": number, "y": number, "w": number   ← % of canvas width; HEIGHT IS AUTOMATIC (grows with text)
  "fontSize": number  ← title size, 2.5–3.6 (description is drawn at 78% of it)
  "look"?:    "glass" | "solid" | "outline" | "accent"
              glass = frosted translucent panel (dark backgrounds)
              solid = opaque panel (set "fill" + "color")
              outline = transparent with a colored border
              accent = panel with a colored bar on its left edge
  "icon"?:    "none" | "number" | "tick"   ← badge shown before the text
  "fill"?:    "#hex"   ← panel color (solid/accent); use "#FFFFFF" on light designs
  "color"?:   "#hex" or brand token   ← text color. REQUIRED to be dark on a light/white panel
  "accentColor"?: brand token   ← badge, border or bar color
  "radius"?:  number (corner radius, % of width, default 2.4)
  "rotate"?:  degrees (±1–4 for a playful tilt)
  "align"?:   "left" | "center"
}
  The card TEXT is NOT part of the template: the app fills each card from the user's own
  "Title|Description" text. Never put title/description strings in the JSON.
  A card is ~7 × fontSize tall at most (2-line title + 3-line description): leave that much
  empty space below each card, and never place a card on top of a device layer, or it will
  hide the user's screenshot.

COMMON MISTAKES TO AVOID
─────────────────────────
✗ y:140 for text — that's near the canvas bottom on a phone, text will be behind the phone.
✗ y:30+ for headline — that collides with the device zone.
✗ fontSize:20 — that's 20% of canvas width = enormous. Headline max is ~9.
✗ Leaving "frame":"phone-generic" in tabletOverrides — change it to "tablet-generic".
✗ Using skewX without skewY (or vice versa) for isometric — they must be paired.
✗ Missing "id" on a device when you use tabletOverrides — the override won't apply.
✗ polygon with fewer than 3 points — invalid, causes a render error.
✗ Hard-coding a specific brand hex like "#6D28D9" — use brand tokens so it recolors.
`;

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT BUILDER
// ─────────────────────────────────────────────────────────────────────────────

export type { PromptStyle };

export interface MasterPromptOptions {
  existingNames: string[];
  existingIds: string[];
  /** Full templates (built-in + custom). Used to steer the design away from what already exists. */
  existingTemplates?: Template[];
  style?: PromptStyle;
  /** Pass Date.now() or a random int to get a fresh design each call. */
  seed?: number;
}

const STYLE_BRIEF: Record<PromptStyle, string> = {
  wow: "WOW / COMPLEX — a showpiece that is either SPLIT (phones sliced with `cuts`, split backdrop, staggered halves) or 3-D (skew + depth extrusion, isometric tilt, stacked depth). Make it look expensive.",
  simple:
    "CLEAN / SIMPLE — flat, restrained and airy. No 3-D, no cuts, at most one quiet decoration. Let the screenshot breathe.",
  cards:
    'FEATURE CARDS — a headline plus 2-3 feature boxes ("callout" layers) with a title and a short description each, arranged around a flat phone the way many Google Play listings do. Polished, readable, no clutter.',
};

export function generateMasterPrompt(options: MasterPromptOptions): string {
  const { existingNames, existingIds, existingTemplates = [], style = "wow", seed = Date.now() } = options;
  const { design, nearest } = pickDesign(style, seed, existingTemplates);

  const existingList =
    existingNames.length > 0 ? existingNames.map((n) => `  • ${n}`).join("\n") : "  (none yet)";
  const avoid = nearest
    ? `The closest existing design is "${nearest.name}". Yours must look clearly different from it AND from every name listed below.`
    : "Make it look unlike anything listed below.";

  const familyRule =
    design.family === "split"
      ? "This is a SPLIT design: the `cuts` and `cutGlow` on the devices below are the point of the design — keep them."
      : design.family === "3d"
        ? "This is a 3-D design: the skewX / skewY / depth / depthAngle numbers below are the point of the design — keep them."
        : design.family === "cards"
          ? 'This is a FEATURE-CARDS design: the "callout" layers below are the point of the design — keep their numbers, keep them after the device layers, and leave the devices uncovered.'
          : "This is a CLEAN design: do NOT add skew, depth beyond what is given, cuts, or extra shapes.";

  return `You are a JSON template designer for ShelfShot — an app-store screenshot marketing studio.
Produce ONE complete ShelfShot template JSON inside a fenced \`\`\`json … \`\`\` block.

╔════════════════════════════════════════════════════════════╗
║  STRICT OUTPUT RULES                                        ║
╠════════════════════════════════════════════════════════════╣
║  1. Output ONLY the fenced json block. Zero prose.          ║
║  2. Must be visually distinct from all existing templates.  ║
║  3. Must validate against the schema below (no extras).     ║
║  4. Required: id, name, category, description,              ║
║     background, layers, supports:["phone","tablet"].        ║
║  5. layers MUST have ≥1 device + ≥1 text(role:"headline").  ║
║  6. All x/y/w/fontSize = % of canvas WIDTH.                 ║
║  7. Brand tokens for every brand-dependent color.           ║
║  8. Hard-code ONLY whites, blacks, and neutral grays.       ║
║  9. id must be unique kebab-case, NOT in the excluded list. ║
║ 10. tabletOverrides MUST change frame to "tablet-generic".  ║
║ 11. Every device needs an "id" (tabletOverrides use it).    ║
╚════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DESIGN DIRECTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Style:        ${STYLE_BRIEF[style]}
Concept name: ${design.mood}
Visual idea:  ${design.concept}
${familyRule}
${avoid}

These numbers were generated for this request and checked against every existing
template, so the composition is new. Copy them exactly; invent only the name, id,
description and small decorative details.

  LAYER ORDER (back → front): background shapes → device layers → ${design.cardsText ? "callout (card) layers → " : ""}text layers.

  BACKGROUND (top-level "background"):
  "background": ${design.background}

  BACKGROUND / DECORATIVE SHAPES:
  ${design.shapes}

  DEVICE LAYERS:
  ${design.devices}
${design.cardsText ? `\n  FEATURE CARD LAYERS:\n  ${design.cardsText}\n` : ""}
  TEXT LAYERS:
  ${design.text}

  TABLET OVERRIDE (copy as-is):
  ${design.tablet}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXCLUDED IDs (do not reuse):
  [${existingIds.map((i) => `"${i}"`).join(", ")}]

EXISTING TEMPLATE NAMES (do not duplicate):
${existingList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${SCHEMA_REFERENCE}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Now output the single \`\`\`json … \`\`\` block for the "${design.mood}" template.
Be precise with coordinates. Do not drift from the numbers above.`;
}

export function collectExistingTemplateInfo(customTemplates: Template[]): MasterPromptOptions {
  const all = [...TEMPLATES, ...customTemplates];
  return {
    existingNames: all.map((t) => t.name),
    existingIds: all.map((t) => t.id),
    existingTemplates: all,
  };
}

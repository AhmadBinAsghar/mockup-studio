import type { Slide, Template } from "@/types";

import { CATEGORIES, categoryOf } from "./categories";

import auroraGlow from "./aurora-glow.json";
import classicTop from "./classic-top.json";
import featureBadge from "./feature-badge.json";
import isometricSlab from "./isometric-slab.json";
import panorama from "./panorama.json";
import sliceDuo from "./slice-duo.json";
import splitReveal from "./split-reveal.json";
import storyTrio from "./story-trio.json";
import tilted3d from "./tilted-3d.json";
import chalkboardSlice from "./chalkboard-slice.json";
import graduationDay from "./graduation-day.json";
import library3d from "./library-3d.json";
import notebookMargin from "./notebook-margin.json";
import studyOrbit from "./study-orbit.json";
import boardroomSplit from "./boardroom-split.json";
import cleanDesk from "./clean-desk.json";
import dashboardDuo from "./dashboard-duo.json";
import executiveGold from "./executive-gold.json";
import growthSteps from "./growth-steps.json";
import chiliSlice from "./chili-slice.json";
import hotPlate from "./hot-plate.json";
import inferno from "./inferno.json";
import sizzleBands from "./sizzle-bands.json";
import tripleHeat from "./triple-heat.json";
import iron3d from "./iron-3d.json";
import powerSplit from "./power-split.json";
import pulseLine from "./pulse-line.json";
import repTrio from "./rep-trio.json";
import sprintTrack from "./sprint-track.json";
import careOrb from "./care-orb.json";
import clinicGlass from "./clinic-glass.json";
import doctorDuo from "./doctor-duo.json";
import heartbeatSplit from "./heartbeat-split.json";
import wardSlices from "./ward-slices.json";
import balloonSky from "./balloon-sky.json";
import bubblePop from "./bubble-pop.json";
import candyOrb from "./candy-orb.json";
import playtimeDuo from "./playtime-duo.json";
import toyBlocks from "./toy-blocks.json";
import bossSplit from "./boss-split.json";
import comboBurst from "./combo-burst.json";
import levelUp from "./level-up.json";
import questRealm from "./quest-realm.json";
import synthwaveArcade from "./synthwave-arcade.json";
import cardRail from "./card-rail.json";
import cardRow from "./card-row.json";
import cardStack from "./card-stack.json";

export const TEMPLATES = [
  auroraGlow,
  classicTop,
  featureBadge,
  isometricSlab,
  panorama,
  sliceDuo,
  splitReveal,
  storyTrio,
  tilted3d,
  chalkboardSlice,
  graduationDay,
  library3d,
  notebookMargin,
  studyOrbit,
  boardroomSplit,
  cleanDesk,
  dashboardDuo,
  executiveGold,
  growthSteps,
  chiliSlice,
  hotPlate,
  inferno,
  sizzleBands,
  tripleHeat,
  iron3d,
  powerSplit,
  pulseLine,
  repTrio,
  sprintTrack,
  careOrb,
  clinicGlass,
  doctorDuo,
  heartbeatSplit,
  wardSlices,
  balloonSky,
  bubblePop,
  candyOrb,
  playtimeDuo,
  toyBlocks,
  bossSplit,
  comboBurst,
  levelUp,
  questRealm,
  synthwaveArcade,
  cardRow,
  cardStack,
  cardRail,
] as unknown as Template[];

export const DEFAULT_TEMPLATE_ID = "classic-top";

export function pickTemplate(
  slide: Slide | undefined,
  defaultId: string | null,
  custom: Template[],
): Template {
  return getTemplate(slide?.templateId ?? defaultId ?? DEFAULT_TEMPLATE_ID, custom);
}

export function getTemplate(id: string, custom: Template[] = []): Template {
  return [...TEMPLATES, ...custom].find((t) => t.id === id) ?? TEMPLATES[0];
}

export function validateTemplate(t: Template): string[] {
  const problems: string[] = [];
  if (!t.id || !t.name) problems.push("missing id or name");
  if (!t.background) problems.push("missing background");
  if (!t.custom && !CATEGORIES.some((c) => c.id === t.category && c.id !== "custom")) {
    problems.push("missing or unknown category");
  }
  if (!t.supports?.includes("phone") || !t.supports.includes("tablet")) {
    problems.push("must support phone and tablet");
  }
  if (!t.layers?.some((l) => l.type === "device")) problems.push("needs a device layer");
  if (!t.layers?.some((l) => l.type === "text" && l.role === "headline")) problems.push("needs a headline");
  for (const l of t.layers ?? []) {
    if (!["text", "device", "bullets", "shape", "callout"].includes(l.type))
      problems.push(`unknown layer type ${l.type}`);
    if (l.type === "shape" && l.shape === "polygon") {
      if (!Array.isArray(l.points) || l.points.length < 3) problems.push("polygon needs at least 3 points");
    } else if (![l.x, l.y, l.w].every((n) => typeof n === "number")) {
      problems.push("layer needs numeric x, y, w");
    }
  }
  return problems;
}

export interface ParsedTemplate {
  template?: Template;
  errors: string[];
}

export function parseTemplateJson(text: string): ParsedTemplate {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { errors: [`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`] };
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { errors: ["A template must be a JSON object."] };
  }
  const template = { supports: ["phone", "tablet"], ...raw, custom: true } as Template;
  template.category = categoryOf(template);
  const errors = validateTemplate(template);
  return errors.length ? { errors } : { template, errors };
}

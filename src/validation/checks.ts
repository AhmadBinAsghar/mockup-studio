import { getPreset, isKnownStoreSize } from "@/config/storePresets";
import { FIT_TOLERANCE, resolveFit } from "@/renderer/fit";
import { screenAspect } from "@/renderer/frames";
import type { CustomSize, OutputSize, Slide } from "@/types";

export function isCustomNonStore(c: CustomSize): boolean {
  return !isKnownStoreSize(c.width, c.height);
}

export function aspectWarnings(slide: Slide, outputs: OutputSize[]): string[] {
  const ratio = slide.width / slide.height;
  const kinds = new Set(outputs.filter((o) => o.width / o.height <= 1.2).map((o) => o.kind));
  const warnings: string[] = [];
  for (const kind of kinds) {
    const target = screenAspect(kind === "tablet" ? "tablet-generic" : "phone-generic");
    const mismatch = Math.abs(ratio - target) / target > FIT_TOLERANCE;
    if (!mismatch) continue;
    const outcome =
      resolveFit(slide.fit ?? "auto", ratio, target) === "contain"
        ? 'The whole image is shown with margins; set Fit to "Fill" to crop instead.'
        : 'It will be cropped to fill the screen; set Fit to "Whole image" to keep everything visible.';
    warnings.push(
      `${slide.name} is ${slide.width}×${slide.height}, but the ${kind} frame expects about ${target.toFixed(2)}:1. ${outcome}`,
    );
  }
  return warnings;
}

export function slideCountWarnings(count: number, presetIds: string[]): string[] {
  const out: string[] = [];
  const play = presetIds.map(getPreset).some((p) => p?.store === "google-play");
  if (play && count > 8) out.push("Google Play accepts at most 8 screenshots per device type.");
  if (play && count < 4)
    out.push("Google Play recommends at least 4 screenshots to be eligible for recommendation slots.");
  return out;
}

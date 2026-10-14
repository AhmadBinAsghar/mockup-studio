import { PRESETS, type StorePreset } from "@/config/storePresets";
import type { CustomSize, OutputSize } from "@/types";

export interface Targets {
  presetIds: string[];
  customSizes: CustomSize[];
  landscape?: boolean;
}

export function presetToOutput(p: StorePreset): OutputSize {
  return {
    folder: p.folder,
    label: `${p.store === "google-play" ? "Google Play" : "App Store"} · ${p.label}`,
    width: p.width,
    height: p.height,
    kind: p.deviceType,
    singleImage: p.singleImage,
  };
}

function toLandscape(o: OutputSize): OutputSize {
  return {
    ...o,
    folder: `${o.folder}-landscape`,
    label: `${o.label} (landscape)`,
    width: o.height,
    height: o.width,
  };
}

export function buildOutputs(targets: Targets): OutputSize[] {
  const outputs: OutputSize[] = [];
  for (const preset of PRESETS) {
    if (!targets.presetIds.includes(preset.id)) continue;
    const output = presetToOutput(preset);
    outputs.push(output);
    if (targets.landscape && !preset.singleImage) outputs.push(toLandscape(output));
  }
  for (const c of targets.customSizes) {
    outputs.push({
      folder: `custom/${c.width}x${c.height}`,
      label: c.label || `${c.width}×${c.height}`,
      width: c.width,
      height: c.height,
      kind: c.width / c.height > 0.75 ? "tablet" : "phone",
    });
  }
  return outputs;
}

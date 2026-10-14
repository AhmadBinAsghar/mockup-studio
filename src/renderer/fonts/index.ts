import { fallbackFamilies } from "../language";

import manifest from "./manifest.json";

export const FONTS = [
  { family: "Inter" },
  { family: "Poppins" },
  { family: "Montserrat" },
  { family: "Playfair Display" },
  { family: "Space Grotesk" },
];

export { DEFAULT_FONT } from "./defaultFont";

interface FontScope {
  fonts: FontFaceSet;
}

const loading = new Map<string, Promise<void>>();

export function loadFont(scope: FontScope, family: string): Promise<void> {
  const cached = loading.get(family);
  if (cached) return cached;
  const task = Promise.all(
    manifest
      .filter((entry) => entry.family === family)
      .map(async (entry) => {
        const face = new FontFace(entry.family, `url(/fonts/${entry.file})`, {
          weight: String(entry.weight),
          unicodeRange: entry.unicodeRange,
        });
        await face.load();
        scope.fonts.add(face);
      }),
  ).then(() => undefined);
  task.catch(() => loading.delete(family));
  loading.set(family, task);
  return task;
}

export function loadFontsFor(scope: FontScope, family: string, lang?: string): Promise<unknown> {
  return Promise.all([family, ...fallbackFamilies(lang)].map((f) => loadFont(scope, f)));
}

export function fontString(family: string, weight: number, px: number, lang?: string): string {
  const stack = [family, ...fallbackFamilies(lang)].map((f) => `"${f}"`).join(", ");
  return `${weight} ${px}px ${stack}, sans-serif`;
}

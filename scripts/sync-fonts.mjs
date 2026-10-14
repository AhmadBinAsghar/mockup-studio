import fs from "node:fs";
import path from "node:path";

const FAMILIES = [
  { family: "Inter", slug: "inter", weights: [400, 700, 800], subsets: ["latin"] },
  { family: "Poppins", slug: "poppins", weights: [400, 700, 800], subsets: ["latin"] },
  { family: "Montserrat", slug: "montserrat", weights: [400, 700, 800], subsets: ["latin"] },
  { family: "Playfair Display", slug: "playfair-display", weights: [400, 700, 800], subsets: ["latin"] },
  { family: "Space Grotesk", slug: "space-grotesk", weights: [400, 700], subsets: ["latin"] },
  { family: "Noto Sans", slug: "noto-sans", weights: [400, 700] },
  { family: "Noto Sans Arabic", slug: "noto-sans-arabic", weights: [400, 700] },
  { family: "Noto Sans Devanagari", slug: "noto-sans-devanagari", weights: [400, 700] },
  { family: "Noto Sans JP", slug: "noto-sans-jp", weights: [700] },
  { family: "Noto Sans KR", slug: "noto-sans-kr", weights: [700] },
  { family: "Noto Sans SC", slug: "noto-sans-sc", weights: [700] },
];

const outDir = path.resolve("public/fonts");
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const manifest = [];
for (const { family, slug, weights, subsets } of FAMILIES) {
  const pkg = path.resolve("node_modules/@fontsource", slug);
  for (const weight of weights) {
    const css = fs.readFileSync(path.join(pkg, `${weight}.css`), "utf8");
    for (const block of css.match(/@font-face\s*{[^}]*}/g) ?? []) {
      const file = /url\(\.\/files\/([^)]+\.woff2)\)/.exec(block)?.[1];
      const range = /unicode-range:\s*([^;]+);/.exec(block)?.[1].trim();
      if (!file) continue;
      const subset = file.replace(`${slug}-`, "").replace(`-${weight}-normal.woff2`, "");
      if (subsets && !subsets.includes(subset)) continue;
      fs.copyFileSync(path.join(pkg, "files", file), path.join(outDir, file));
      manifest.push({ family, weight, file, unicodeRange: range });
    }
  }
}
fs.mkdirSync("src/renderer/fonts", { recursive: true });
fs.writeFileSync("src/renderer/fonts/manifest.json", JSON.stringify(manifest));
console.log(`${manifest.length} font files, ${fs.readdirSync(outDir).length} copied`);

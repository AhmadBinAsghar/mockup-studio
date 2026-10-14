import { hexToRgb } from "./canvas";

type Rgb = [number, number, number];

const clamp = (n: number, min = 0, max = 1) => Math.min(max, Math.max(min, n));

function toHex([r, g, b]: Rgb): string {
  return `#${[r, g, b]
    .map((c) =>
      Math.round(clamp(c, 0, 255))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`.toUpperCase();
}

function mix(a: Rgb, b: Rgb, amount: number): Rgb {
  return [a[0] + (b[0] - a[0]) * amount, a[1] + (b[1] - a[1]) * amount, a[2] + (b[2] - a[2]) * amount];
}

function rgbToHsl([r, g, b]: Rgb): [number, number, number] {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === rn ? (gn - bn) / d + (gn < bn ? 6 : 0) : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
  h *= 60;
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    hue < 60
      ? [c, x, 0]
      : hue < 120
        ? [x, c, 0]
        : hue < 180
          ? [0, c, x]
          : hue < 240
            ? [0, x, c]
            : hue < 300
              ? [x, 0, c]
              : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

function shiftHue(rgb: Rgb, degrees: number, lightness: number): Rgb {
  const [h, s, l] = rgbToHsl(rgb);
  return hslToRgb(h + degrees, clamp(s, 0.45, 1), clamp(l + lightness, 0.2, 0.8));
}

const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];

export function brandTokens(brand: string): Record<string, string> {
  const rgb = hexToRgb(brand);
  if (!rgb) {
    return Object.fromEntries(
      [
        "brand",
        "brand-light",
        "brand-pale",
        "brand-dark",
        "brand-deep",
        "brand-glow",
        "brand-shift",
        "brand-pop",
      ].map((name) => [name, brand]),
    );
  }
  return {
    brand,
    "brand-light": toHex(mix(rgb, WHITE, 0.35)),
    "brand-pale": toHex(mix(rgb, WHITE, 0.86)),
    "brand-dark": toHex(mix(rgb, BLACK, 0.35)),
    "brand-deep": toHex(mix(rgb, BLACK, 0.72)),
    "brand-glow": toHex(shiftHue(rgb, 38, 0.06)),
    "brand-shift": toHex(shiftHue(rgb, -42, 0.04)),
    "brand-pop": toHex(shiftHue(rgb, 180, 0.1)),
  };
}

export function applyBrandTokens(json: string, brand: string): string {
  const tokens = brandTokens(brand);
  return json.replace(/\{(brand[a-z-]*)\}/g, (match, name: string) => tokens[name] ?? match);
}

export function tintHexColors(json: string, brand: string, themeColor: string): string {
  const target = hexToRgb(brand);
  const source = hexToRgb(themeColor);
  if (!target || !source) return json;
  const delta = rgbToHsl(target)[0] - rgbToHsl(source)[0];
  return json.replace(/#[0-9a-fA-F]{6}/g, (hex) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    const [h, s, l] = rgbToHsl(rgb);
    if (s < 0.2 || l < 0.06 || l > 0.96) return hex;
    return toHex(hslToRgb(h + delta, s, l));
  });
}

import { t, tf } from "@/i18n/store";

export type StoreId = "google-play" | "app-store";
export type DeviceType = "phone" | "tablet";

export interface StorePreset {
  id: string;
  store: StoreId;
  label: string;
  deviceType: DeviceType;
  folder: string;
  width: number;
  height: number;
  alsoAccepts?: ReadonlyArray<readonly [number, number]>;
  required?: boolean;
  singleImage?: boolean;
  rules: string;
}

export const STORE_LABELS: Record<StoreId, string> = {
  "google-play": "Google Play",
  "app-store": "App Store",
};

export const PRESETS: readonly StorePreset[] = [
  {
    id: "gp-phone",
    store: "google-play",
    label: "Phone",
    deviceType: "phone",
    folder: "google-play/phone",
    width: 1080,
    height: 1920,
    rules: "Up to 8 per device type; 4+ at 1080px or larger to be eligible for recommendation slots.",
  },
  {
    id: "gp-tablet-7",
    store: "google-play",
    label: '7" tablet',
    deviceType: "tablet",
    folder: "google-play/tablet-7-inch",
    width: 1440,
    height: 2560,
    rules: "Large-screen shots must be 1,080–7,680 px, 16:9 or 9:16, minimum 4.",
  },
  {
    id: "gp-tablet-10",
    store: "google-play",
    label: '10" tablet',
    deviceType: "tablet",
    folder: "google-play/tablet-10-inch",
    width: 1440,
    height: 2560,
    rules: "Large-screen shots must be 1,080–7,680 px, 16:9 or 9:16, minimum 4.",
  },
  {
    id: "gp-feature",
    store: "google-play",
    label: "Feature graphic",
    deviceType: "phone",
    folder: "google-play/feature-graphic",
    width: 1024,
    height: 500,
    required: true,
    singleImage: true,
    rules: "Required to publish; generated from your first slide. Keep key content centered.",
  },
  {
    id: "as-iphone-6.3",
    store: "app-store",
    label: 'iPhone 6.3" (Dynamic Island, medium)',
    deviceType: "phone",
    folder: "app-store/6.3-inch",
    width: 1206,
    height: 2622,
    alsoAccepts: [[1179, 2556]],
    required: true,
    rules: "Required. 1–10 per size; Apple scales down to smaller iPhones.",
  },
  {
    id: "as-iphone-6.9",
    store: "app-store",
    label: 'iPhone 6.9" (Dynamic Island, large)',
    deviceType: "phone",
    folder: "app-store/6.9-inch",
    width: 1320,
    height: 2868,
    alsoAccepts: [
      [1290, 2796],
      [1260, 2736],
    ],
    rules: "Optional; used on Pro Max / Plus / Air listings.",
  },
  {
    id: "as-iphone-6.5",
    store: "app-store",
    label: 'iPhone 6.5" (Face ID)',
    deviceType: "phone",
    folder: "app-store/6.5-inch",
    width: 1284,
    height: 2778,
    rules: "Optional fallback for older listings.",
  },
  {
    id: "as-ipad-13",
    store: "app-store",
    label: 'iPad 13"',
    deviceType: "tablet",
    folder: "ipad/13-inch",
    width: 2064,
    height: 2752,
    alsoAccepts: [[2048, 2732]],
    required: true,
    rules: "Required if the app runs on iPad. Scaled down for smaller iPads.",
  },
];

export const CUSTOM_MIN = 320;
export const CUSTOM_MAX = 7680;

export const GOOGLE_PLAY_MAX_PER_DEVICE = 8;
export const APP_STORE_MAX_PER_SIZE = 10;

export function getPreset(id: string): StorePreset | undefined {
  return PRESETS.find((p) => p.id === id);
}

export function presetsForStore(store: StoreId): StorePreset[] {
  return PRESETS.filter((p) => p.store === store);
}

export function isKnownStoreSize(width: number, height: number): boolean {
  const matches = (w: number, h: number) =>
    PRESETS.some(
      (p) => (p.width === w && p.height === h) || p.alsoAccepts?.some(([aw, ah]) => aw === w && ah === h),
    );
  return matches(width, height) || matches(height, width);
}

export function validateCustomSize(width: number, height: number): string | null {
  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    return t("targets.errWhole");
  }
  if (width < CUSTOM_MIN || width > CUSTOM_MAX || height < CUSTOM_MIN || height > CUSTOM_MAX) {
    return t("targets.errRange", { min: CUSTOM_MIN, max: CUSTOM_MAX });
  }
  return null;
}

export function meetsGooglePlayFormat(width: number, height: number): boolean {
  const short = Math.min(width, height);
  const long = Math.max(width, height);
  return short >= 320 && long <= 3840 && long <= short * 2;
}

export const notStoreSizeNote = () => t("targets.notStoreSize");

/** The preset's display name in the current language (English when no translation exists). */
export function presetLabel(p: StorePreset): string {
  return tf(`preset.${p.id}.label`, p.label);
}

export function presetRules(p: StorePreset): string {
  return tf(`preset.${p.id}.rules`, p.rules);
}

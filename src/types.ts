export type Fill =
  { type: "solid"; color: string } | { type: "gradient"; angle: number; stops: [string, string] };

export type ShapeFill = Fill | { type: "radial"; color: string };

export type TemplateCategoryId =
  "general" | "education" | "office" | "food" | "fitness" | "health" | "kids" | "games" | "custom";

export type FitMode = "auto" | "cover" | "contain";

export type FrameStyle = "dark" | "silver" | "gold" | "titanium" | "white";

export type BlendMode = "screen" | "overlay" | "multiply" | "lighter" | "soft-light";

export type FrameId = "phone-generic" | "tablet-generic" | "none";

export interface TextLayer {
  type: "text";
  id?: string;
  role: "headline" | "subheadline";
  x: number;
  y: number;
  w: number;
  fontSize: number;
  weight?: number;
  align?: "left" | "center" | "right";
  color?: string;
  accentColor?: string;
  anchor?: "top" | "bottom";
  lineHeight?: number;
  maxLines?: number;
  stackBelow?: "headline" | "subheadline";
  rotate?: number;
  uppercase?: boolean;
  stroke?: string;
  strokeWidth?: number;
  shadow?: boolean;
  opacity?: number;
  hideOnWide?: boolean;
}

export interface DeviceCut {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  keep: "left" | "right";
}

export interface DeviceLayer {
  type: "device";
  id?: string;
  frame: FrameId;
  x: number;
  y: number;
  w: number;
  rotate?: number;
  shadow?: boolean;
  radius?: number;
  bleed?: boolean;
  bottomMargin?: number;
  alternateOffset?: number;
  skewX?: number;
  skewY?: number;
  depth?: number;
  depthAngle?: number;
  depthColor?: string;
  dim?: number;
  cuts?: DeviceCut[];
  cutGlow?: string;
  frameStyle?: FrameStyle;
  rim?: string;
  gloss?: boolean;
  show?: "self" | "prev" | "next";
}

export interface ShapeLayer {
  type: "shape";
  id?: string;
  shape: "circle" | "roundRect" | "polygon";
  x: number;
  y: number;
  w: number;
  h?: number;
  points?: Array<[number, number]>;
  yUnit?: "width" | "height";
  fill?: ShapeFill;
  stroke?: string;
  strokeWidth?: number;
  dash?: [number, number];
  blend?: BlendMode;
  paintsBackground?: boolean;
  opacity?: number;
  rotate?: number;
  radius?: number;
  shadow?: boolean;
  hideOnWide?: boolean;
}

export interface BulletsLayer {
  type: "bullets";
  id?: string;
  x: number;
  y: number;
  w: number;
  fontSize: number;
  color?: string;
  iconColor?: string;
  weight?: number;
}

/**
 * A feature card ("box") with a title and a short description, e.g. for Play Store listings.
 * Its text is slide.bullets[index], written as "Title|Description".
 */
export interface CalloutLayer {
  type: "callout";
  id?: string;
  /** Which of the slide bullets (0-2) this card shows. */
  index: number;
  x: number;
  y: number;
  w: number;
  /** Title size, % of canvas width. The description is drawn smaller. */
  fontSize: number;
  look?: "glass" | "solid" | "outline" | "accent";
  fill?: string;
  color?: string;
  accentColor?: string;
  icon?: "none" | "number" | "tick";
  radius?: number;
  align?: "left" | "center";
  rotate?: number;
  opacity?: number;
  shadow?: boolean;
}

export type Layer = TextLayer | DeviceLayer | BulletsLayer | ShapeLayer | CalloutLayer;

export type Background = Fill & {
  span?: boolean;
};

export interface Template {
  id: string;
  name: string;
  category?: TemplateCategoryId;
  themeColor?: string;
  description?: string;
  thumbnail?: string;
  background: Background;
  layers: Layer[];
  supports: Array<"phone" | "tablet">;
  defaultFrame?: boolean;
  tabletOverrides?: TemplateOverrides;
  wideOverrides?: TemplateOverrides;
  custom?: boolean;
}

export interface TemplateOverrides {
  background?: Background;
  layers?: Record<
    string,
    Partial<TextLayer> &
      Partial<DeviceLayer> &
      Partial<BulletsLayer> &
      Partial<ShapeLayer> &
      Partial<CalloutLayer>
  >;
}

export interface SlideStyle {
  background?: Fill;
  textColor?: string;
}

export interface Slide {
  id: string;
  name: string;
  blob: Blob;
  width: number;
  height: number;
  headline: string;
  subheadline: string;
  bullets: string[];
  styles?: Record<string, SlideStyle>;
  deviceFrame?: boolean;
  /** Screenshot/phone nudge, % of canvas width. Applies to every device layer. */
  deviceOffsetX?: number;
  deviceOffsetY?: number;
  /** Multiplier on the device width; 1 = template size. */
  deviceScale?: number;
  templateId?: string;
  fit?: FitMode;
  fitColor?: string;
  font?: string;
  lang?: string;
  translations?: Record<string, SlideText>;
}

export interface SlideText {
  headline: string;
  subheadline: string;
  bullets: string[];
}

export interface Brand {
  color: string;
  font: string;
  tint?: boolean;
}

export interface CustomSize {
  id: string;
  width: number;
  height: number;
  label: string;
}

export interface OutputSize {
  folder: string;
  label: string;
  width: number;
  height: number;
  kind: "phone" | "tablet";
  singleImage?: boolean;
}

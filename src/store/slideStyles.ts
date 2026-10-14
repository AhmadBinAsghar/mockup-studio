import type { Slide, SlideStyle } from "@/types";

export function styleFor(slide: Slide, templateId: string): SlideStyle {
  return slide.styles?.[templateId] ?? {};
}

export function withStyle(slide: Slide, templateId: string, patch: Partial<SlideStyle>): Slide {
  return {
    ...slide,
    styles: { ...slide.styles, [templateId]: { ...styleFor(slide, templateId), ...patch } },
  };
}

export function withoutStyle(slide: Slide, templateId: string, field: keyof SlideStyle): Slide {
  const next: SlideStyle = { ...styleFor(slide, templateId) };
  delete next[field];
  const styles = { ...slide.styles };
  if (Object.keys(next).length === 0) delete styles[templateId];
  else styles[templateId] = next;
  const result: Slide = { ...slide, styles };
  if (Object.keys(styles).length === 0) delete result.styles;
  return result;
}

interface LegacySlide extends Slide {
  background?: SlideStyle["background"];
  textColor?: string;
}

export function migrateLegacyStyles<T extends { slides?: Slide[]; templateId?: string | null }>(state: T): T {
  if (!state.slides) return state;
  const slides = state.slides.map((slide) => {
    const { background, textColor, ...rest } = slide as LegacySlide;
    const templateId = rest.templateId ?? state.templateId;
    if (!background && !textColor) return rest as Slide;
    if (!templateId) return rest as Slide;
    return withStyle(rest as Slide, templateId, {
      ...(background ? { background } : {}),
      ...(textColor ? { textColor } : {}),
    });
  });
  return { ...state, slides };
}

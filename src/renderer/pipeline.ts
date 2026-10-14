import type { ExportSet } from "@/localization/slideText";
import type { Brand, OutputSize, Slide, Template } from "@/types";

import type { CanvasFactory, ImageSource } from "./canvas";
import { encodePngRgb } from "./png";
import { renderSlide } from "./renderSlide";

export interface ExportFile {
  path: string;
  data: Uint8Array;
}

export function slideFileName(index: number): string {
  return `${String(index + 1).padStart(2, "0")}.png`;
}

export async function renderSlidePng(
  makeCanvas: CanvasFactory,
  args: {
    slide: Slide;
    template: Template;
    brand: Brand;
    output: OutputSize;
    index: number;
    count: number;
    image: ImageSource | null;
    prevImage?: ImageSource | null;
    nextImage?: ImageSource | null;
  },
): Promise<Uint8Array> {
  const { output } = args;
  const canvas = makeCanvas(output.width, output.height);
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("2D canvas is not available");
  renderSlide(
    {
      ...args.slide,
      brand: args.brand,
      index: args.index,
      count: args.count,
      image: args.image,
      prevImage: args.prevImage,
      nextImage: args.nextImage,
    },
    args.template,
    { width: output.width, height: output.height, kind: output.kind },
    ctx,
  );
  const pixels = ctx.getImageData(0, 0, output.width, output.height);
  return encodePngRgb(pixels);
}

export interface ExportJob {
  sets: ExportSet[];
  template: Template;
  templates?: Template[];
  brand: Brand;
  outputs: OutputSize[];
}

export function templateForSlide(job: Pick<ExportJob, "template" | "templates">, slide: Slide): Template {
  const own = slide.templateId ? job.templates?.find((t) => t.id === slide.templateId) : undefined;
  return own ?? job.template;
}

function slideIndexes(output: OutputSize, count: number): number[] {
  const n = output.singleImage ? Math.min(1, count) : count;
  return Array.from({ length: n }, (_, i) => i);
}

export function countImages(job: Pick<ExportJob, "sets" | "outputs">): number {
  return job.sets.reduce(
    (sum, set) => sum + job.outputs.reduce((n, o) => n + slideIndexes(o, set.slides.length).length, 0),
    0,
  );
}

export async function runExport(
  makeCanvas: CanvasFactory,
  job: ExportJob,
  decode: (slide: Slide) => Promise<ImageSource>,
  onFile: (file: ExportFile, done: number, total: number) => void | Promise<void>,
): Promise<void> {
  const total = countImages(job);
  const decoded = new Map<Blob, Promise<ImageSource>>();
  const decodeOnce = (slide: Slide) => {
    let p = decoded.get(slide.blob);
    if (!p) decoded.set(slide.blob, (p = decode(slide)));
    return p;
  };

  let done = 0;
  for (const set of job.sets) {
    for (let i = 0; i < set.slides.length; i++) {
      const slide = set.slides[i];
      const image = await decodeOnce(slide);
      const many = set.slides.length > 1;
      const prevImage = many
        ? await decodeOnce(set.slides[(i - 1 + set.slides.length) % set.slides.length])
        : image;
      const nextImage = many ? await decodeOnce(set.slides[(i + 1) % set.slides.length]) : image;
      for (const output of job.outputs) {
        if (!slideIndexes(output, set.slides.length).includes(i)) continue;
        const data = await renderSlidePng(makeCanvas, {
          slide,
          template: templateForSlide(job, slide),
          brand: job.brand,
          output,
          index: i,
          count: set.slides.length,
          image,
          prevImage,
          nextImage,
        });
        done++;
        await onFile({ path: `${set.prefix}${output.folder}/${slideFileName(i)}`, data }, done, total);
      }
    }
  }
}

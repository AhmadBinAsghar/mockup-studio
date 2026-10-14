import { loadFontsFor } from "@/renderer/fonts";
import type { CanvasLike } from "@/renderer/canvas";
import { runExport, type ExportFile, type ExportJob } from "@/renderer/pipeline";

function makeDomCanvas(width: number, height: number): CanvasLike {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export async function renderOnMainThread(
  job: ExportJob,
  onFile: (file: ExportFile, done: number, total: number) => void,
): Promise<void> {
  const slides = job.sets.flatMap((set) => set.slides);
  await Promise.all(slides.map((s) => loadFontsFor(document, s.font ?? job.brand.font, s.lang)));
  await runExport(
    makeDomCanvas,
    job,
    (slide) => createImageBitmap(slide.blob),
    async (file, done, total) => {
      onFile(file, done, total);
      await new Promise((resolve) => setTimeout(resolve));
    },
  );
}

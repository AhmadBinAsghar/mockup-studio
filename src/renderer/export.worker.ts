/// <reference lib="webworker" />
import { loadFontsFor } from "./fonts";
import type { CanvasLike } from "./canvas";
import { runExport, type ExportJob } from "./pipeline";

export type WorkerRequest = { type: "start"; job: ExportJob };
export type WorkerResponse =
  | { type: "file"; path: string; data: ArrayBuffer; done: number; total: number }
  | { type: "done" }
  | { type: "error"; message: string };

const scope = self as unknown as DedicatedWorkerGlobalScope;

scope.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  try {
    const { job } = event.data;
    const slides = job.sets.flatMap((set) => set.slides);
    await Promise.all(slides.map((s) => loadFontsFor(scope, s.font ?? job.brand.font, s.lang)));
    await runExport(
      (w, h) => new OffscreenCanvas(w, h) as unknown as CanvasLike,
      job,
      (slide) => createImageBitmap(slide.blob),
      (file, done, total) => {
        const buffer = file.data.buffer as ArrayBuffer;
        scope.postMessage(
          { type: "file", path: file.path, data: buffer, done, total } satisfies WorkerResponse,
          [buffer],
        );
      },
    );
    scope.postMessage({ type: "done" } satisfies WorkerResponse);
  } catch (err) {
    scope.postMessage({
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    } satisfies WorkerResponse);
  }
};

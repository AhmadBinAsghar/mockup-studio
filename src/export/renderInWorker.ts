import type { ExportFile, ExportJob } from "@/renderer/pipeline";
import type { WorkerRequest, WorkerResponse } from "@/renderer/export.worker";

export function canRenderInWorker(): boolean {
  return typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined";
}

export function renderInWorker(
  job: ExportJob,
  onFile: (file: ExportFile, done: number, total: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("../renderer/export.worker.ts", import.meta.url));
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data;
      if (msg.type === "file") {
        onFile({ path: msg.path, data: new Uint8Array(msg.data) }, msg.done, msg.total);
      } else if (msg.type === "done") {
        worker.terminate();
        resolve();
      } else {
        worker.terminate();
        reject(new Error(msg.message));
      }
    };
    worker.onerror = (e) => {
      worker.terminate();
      reject(new Error(e.message || "Export worker failed"));
    };
    worker.postMessage({ type: "start", job } satisfies WorkerRequest);
  });
}

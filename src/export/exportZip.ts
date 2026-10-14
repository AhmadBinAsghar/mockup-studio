import { saveAs } from "file-saver";
import JSZip from "jszip";

import type { ExportJob } from "@/renderer/pipeline";

import { canRenderInWorker, renderInWorker } from "./renderInWorker";
import { renderOnMainThread } from "./renderOnMainThread";

export async function exportZip(
  job: ExportJob,
  onProgress: (done: number, total: number) => void,
): Promise<void> {
  const zip = new JSZip();
  const render = canRenderInWorker() ? renderInWorker : renderOnMainThread;

  await render(job, (file, done, total) => {
    zip.file(file.path, file.data);
    onProgress(done, total);
  });

  const blob = await zip.generateAsync({ type: "blob", compression: "STORE" });
  saveAs(blob, "store-screenshots.zip");
}

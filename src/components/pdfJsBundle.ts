import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";

// Metro copies these pdf.js legacy builds into the app as assets.
// They are not imported as JavaScript, so Hermes never executes them.
// Static require() is what Metro uses to trace the asset.
/* eslint-disable @typescript-eslint/no-require-imports */
const pdfJsMainAsset = require("pdfjs-main-raw") as number;
const pdfJsWorkerAsset = require("pdfjs-worker-raw") as number;
/* eslint-enable @typescript-eslint/no-require-imports */

export type PdfJsSources = {
  main: string;
  worker: string;
};

let loading: Promise<PdfJsSources> | null = null;

async function readAsset(moduleId: number): Promise<string> {
  const asset = Asset.fromModule(moduleId);
  if (!asset.localUri) {
    await asset.downloadAsync();
  }
  const uri = asset.localUri;
  if (!uri) {
    throw new Error("PDF viewer library is missing from the app bundle.");
  }
  return FileSystem.readAsStringAsync(uri);
}

export function loadPdfJsSources(): Promise<PdfJsSources> {
  if (!loading) {
    loading = Promise.all([readAsset(pdfJsMainAsset), readAsset(pdfJsWorkerAsset)])
      .then(([main, worker]) => ({ main, worker }))
      .catch((error: unknown) => {
        loading = null;
        throw error;
      });
  }
  return loading;
}

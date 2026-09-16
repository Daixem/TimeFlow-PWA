import { access, readFile } from "node:fs/promises";

const source = await readFile("js/private-schedule-import.js", "utf8");
const worker = await readFile("dist/server/index.js", "utf8");

for (const marker of [
  'PDFJS_MODULE_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs"',
  'PDFJS_WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs"',
  'const TESSERACT_MODULE_URL = localAssetUrl("../vendor/tesseract/tesseract.esm.min.js")',
  'const TESSERACT_WORKER_URL = localAssetUrl("../vendor/tesseract/worker.min.js")',
  'const TESSERACT_CORE_URL = localAssetUrl("../vendor/tesseract/core")',
  'const TESSERACT_LANGUAGE_URL = localAssetUrl("../vendor/tesseract/lang/4.0.0")',
  'workerPath: TESSERACT_WORKER_URL',
  'corePath: TESSERACT_CORE_URL',
  'langPath: TESSERACT_LANGUAGE_URL',
  'api.createWorker("deu", 1, {',
  'URL.createObjectURL(file)',
  'URL.revokeObjectURL(objectUrl)',
  'OCR_MODULE_TIMEOUT_MS',
  'OCR_WORKER_TIMEOUT_MS',
  'OCR_RECOGNITION_TIMEOUT_MS',
  'if (worker)',
  'HEIC/HEIF wird auf diesem Gerät noch nicht unterstützt'
]) {
  if (!source.includes(marker)) throw new Error(`PDF-/OCR-Quelle oder Pfad fehlt: ${marker}`);
}

for (const marker of [
  "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
  "connect-src 'self'",
  "worker-src 'self' blob: https://cdnjs.cloudflare.com",
  "img-src 'self' data: blob:"
]) {
  if (!worker.includes(marker)) throw new Error(`CSP erlaubt die erforderliche PDF-/OCR-Quelle nicht: ${marker}`);
}

if (worker.includes("cdn.jsdelivr.net")) throw new Error("Der aktive OCR-Pfad darf keine jsDelivr-Laufzeitabhängigkeit mehr enthalten.");
for (const file of [
  "vendor/tesseract/tesseract.esm.min.js",
  "vendor/tesseract/worker.min.js",
  "vendor/tesseract/core/tesseract-core-lstm.wasm.js",
  "vendor/tesseract/lang/4.0.0/deu.traineddata.gz"
]) await access(file);

if (/script-src[^;]*(?:\*|unsafe-eval)/.test(worker)) {
  throw new Error("Die PDF-/OCR-CSP darf weder Wildcards noch unsafe-eval enthalten.");
}

console.log("PDF-/OCR-Import: lokale feste OCR-Quellen, Worker-Pfade und restriktive CSP geprüft.");

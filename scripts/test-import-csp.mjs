import { readFile } from "node:fs/promises";

const source = await readFile("js/private-schedule-import.js", "utf8");
const worker = await readFile("dist/server/index.js", "utf8");

for (const marker of [
  'PDFJS_MODULE_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs"',
  'PDFJS_WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs"',
  'TESSERACT_MODULE_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.esm.min.js"',
  'workerPath: TESSERACT_WORKER_URL',
  'corePath: TESSERACT_CORE_URL',
  'langPath: TESSERACT_LANGUAGE_URL'
]) {
  if (!source.includes(marker)) throw new Error(`PDF-/OCR-Quelle oder Pfad fehlt: ${marker}`);
}

for (const marker of [
  "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
  "connect-src 'self' https://cdn.jsdelivr.net",
  "worker-src 'self' blob: https://cdnjs.cloudflare.com https://cdn.jsdelivr.net"
]) {
  if (!worker.includes(marker)) throw new Error(`CSP erlaubt die erforderliche PDF-/OCR-Quelle nicht: ${marker}`);
}

if (/script-src[^;]*(?:\*|unsafe-eval)/.test(worker)) {
  throw new Error("Die PDF-/OCR-CSP darf weder Wildcards noch unsafe-eval enthalten.");
}

console.log("PDF-/OCR-Import: feste Quellen, Worker-Pfade und restriktive CSP geprüft.");

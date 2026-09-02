import { readFile } from "node:fs/promises";

const notifications = await readFile(new URL("../js/sprint7.js", import.meta.url), "utf8");
const clean = await readFile(new URL("../js/private-clean.js", import.meta.url), "utf8");
const cleanCss = await readFile(new URL("../css/private-clean.css", import.meta.url), "utf8");
const main = await readFile(new URL("../js/script.js", import.meta.url), "utf8");
if (!main.includes("if (!privateMode)") || !main.includes('document.body.dataset.appMode === "private"')) throw new Error("Allgemeine Datumswerte ueberschreiben den privaten naechsten Einsatz noch.");

for (const marker of ["data-notification-filter=\"worktime\"", "data-notification-filter=\"schedule\"", "data-notification-filter=\"system\"", "return []", "timeflow:replace-notifications", "timeflow-notification-read-v1", "rememberRead", "receipts[entry.id]"]) {
  if (!notifications.includes(marker)) throw new Error(`Persönliche Mitteilungen: ${marker} fehlt.`);
}
for (const marker of ["timeflow-private-schedule-v1", "timeflow-workday-v2", "private-next-", "private-offline", "renderRealHome"]) {
  if (!clean.includes(marker)) throw new Error(`Echte Privatdaten: ${marker} fehlt.`);
}
for (const marker of [".for-you-card", ".team-card", ".account-section", ".statistics-section"]) {
  if (!cleanCss.includes(marker)) throw new Error(`Demo-Bereinigung: ${marker} wird nicht ausgeblendet.`);
}
console.log("Einzelnutzung: Mitteilungen und sichtbare Werte verwenden ausschließlich persönliche Laufzeitdaten.");

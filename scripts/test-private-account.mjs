import { readFile } from "node:fs/promises";

const account = await readFile(new URL("../js/private-account.js", import.meta.url), "utf8");
const home = await readFile(new URL("../js/private-home.js", import.meta.url), "utf8");
const core = await readFile(new URL("../js/script.js", import.meta.url), "utf8");

for (const marker of ["timeflow-private-account-v1", "captureCompletedWorkday", "monthlyValues", "renderHomeMonth", "TimeFlowPrivateAccount", "Guthaben hinzufügen", "Stunden abziehen", "data-delete-account", "timeflow:open-private-account", "monthlyTargetHours", "MONATSSOLL", "SOLL BIS HEUTE", "stamped + manual - targetDue", "targetDueForMonth", "timeflow-private-account-archive-v1", "opening_balance", "time_correction", "manual_work"]) {
  if (!account.includes(marker)) throw new Error(`Arbeitszeitkonto: ${marker} fehlt.`);
}
if (!home.includes('data-private-action="account"') || !home.includes('document.dispatchEvent(new CustomEvent("timeflow:open-private-account"))')) throw new Error("Das Arbeitszeitkonto fehlt im Schnellzugriff.");
if (home.includes("privateAccountCaptured") || home.includes('monthCard.querySelector(".month-stats")?.insertAdjacentHTML')) throw new Error("Das Arbeitszeitkonto wird noch auf dem Home-Screen ausgegeben.");
if (!core.includes("TimeFlowPrivateAccount?.refreshHome") || !core.includes("if (!privateMode) elements.todayHours")) throw new Error("Die Monatsübersicht wird noch mit dem Tageswert überschrieben.");
console.log("Privates Arbeitszeitkonto: Stempelungen, Anfangsstände sowie Plus-/Minuskorrekturen sind verbunden.");

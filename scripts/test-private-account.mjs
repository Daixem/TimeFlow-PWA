import { readFile } from "node:fs/promises";

const account = await readFile(new URL("../js/private-account.js", import.meta.url), "utf8");
const home = await readFile(new URL("../js/private-home.js", import.meta.url), "utf8");

for (const marker of ["timeflow-private-account-v1", "captureCompletedWorkday", "Guthaben hinzufügen", "Stunden abziehen", "data-delete-account", "timeflow:open-private-account", "monthlyTargetHours", "MONATSSOLL", "stamped + manual - target"]) {
  if (!account.includes(marker)) throw new Error(`Arbeitszeitkonto: ${marker} fehlt.`);
}
if (!home.includes('data-private-action="account"') || !home.includes('document.dispatchEvent(new CustomEvent("timeflow:open-private-account"))')) throw new Error("Das Arbeitszeitkonto fehlt im Schnellzugriff.");
if (home.includes("privateAccountCaptured") || home.includes('monthCard.querySelector(".month-stats")?.insertAdjacentHTML')) throw new Error("Das Arbeitszeitkonto wird noch auf dem Home-Screen ausgegeben.");
console.log("Privates Arbeitszeitkonto: Stempelungen, Anfangsstände sowie Plus-/Minuskorrekturen sind verbunden.");

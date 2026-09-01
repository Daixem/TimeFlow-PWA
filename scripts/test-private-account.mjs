import { readFile } from "node:fs/promises";

const account = await readFile(new URL("../js/private-account.js", import.meta.url), "utf8");
const home = await readFile(new URL("../js/private-home.js", import.meta.url), "utf8");

for (const marker of ["timeflow-private-account-v1", "captureCompletedWorkday", "Guthaben hinzufügen", "Stunden abziehen", "data-delete-account", "timeflow:open-private-account", "monthlyTargetHours", "MONATSSOLL", "stamped + manual - target"]) {
  if (!account.includes(marker)) throw new Error(`Arbeitszeitkonto: ${marker} fehlt.`);
}
for (const marker of ["privateAccountCaptured", "privateAccountManual", "privateAccountBalance", "timeflow:open-private-account"]) {
  if (!home.includes(marker)) throw new Error(`Home-Arbeitszeitkonto: ${marker} fehlt.`);
}
console.log("Privates Arbeitszeitkonto: Stempelungen, Anfangsstände sowie Plus-/Minuskorrekturen sind verbunden.");

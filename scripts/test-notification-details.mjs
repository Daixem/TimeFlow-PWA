import { readFile } from "node:fs/promises";

const [notifications, privateClean, scheduleImport, serviceWorker, notesText] = await Promise.all([
  readFile("js/sprint7.js", "utf8"),
  readFile("js/private-clean.js", "utf8"),
  readFile("js/private-schedule-import.js", "utf8"),
  readFile("sw.js", "utf8"),
  readFile("release-notes.json", "utf8")
]);
const notes = JSON.parse(notesText);
if (!Array.isArray(notes.changes) || !notes.changes.length) throw new Error("Die Update-Übersicht enthält keine Änderungen.");
for (const marker of ["notificationDetail", "normalizeDetails", "Änderungen im Überblick", "TIMEFLOW_NOTIFICATION_OPEN"]) {
  if (!notifications.includes(marker)) throw new Error(`Detailansicht: ${marker} fehlt.`);
}
if (!/notification-toolbar[\s\S]*?data-test-notification/.test(notifications)) throw new Error("Der Testknopf ist nicht oben im Mitteilungsfenster sichtbar.");
for (const marker of ["lastImport.changes", "shiftSummary(previous)", "Dienstplan übernommen"]) {
  if (!privateClean.includes(marker) && !scheduleImport.includes(marker)) throw new Error(`Dienstplan-Änderungen: ${marker} fehlen.`);
}
if (!privateClean.includes('new URL("release-notes.json"')) throw new Error("Update-News laden keine Release-Übersicht.");
if (!serviceWorker.includes('url.searchParams.set("notificationId"')) throw new Error("Push-Klick öffnet die zugehörige Mitteilung nicht.");

const worker = (await import("../dist/server/index.js")).default;
const notesResponse = await worker.fetch(new Request("https://timeflow.test/release-notes.json"), {});
if (!notesResponse.ok || !(await notesResponse.json()).changes?.length) throw new Error("Die Update-Übersicht ist im Sites-Build nicht erreichbar.");
for (const path of ["push-config", "push-subscription", "push-preferences", "push-test"]) {
  const response = await worker.fetch(new Request(`https://timeflow.test/api/notifications/${path}`), {});
  if (response.status !== 401) throw new Error(`Push-Endpunkt /${path} ist nicht erreichbar oder nicht geschützt (HTTP ${response.status}).`);
}

console.log("Mitteilungsdetails: Dienstplanänderungen, Update-Übersicht und Push-Klick sind verdrahtet.");

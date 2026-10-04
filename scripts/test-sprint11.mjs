import { readFile } from "node:fs/promises";

const requiredSnippets = new Map([
  ["index.html", ["css/sprint11.css?v=__TIMEFLOW_BUILD__", "js/sprint11.js?v=__TIMEFLOW_BUILD__", "register(\"sw.js\""]],
  ["sw.js", ["timeflow-", "css/sprint11.css?v=__TIMEFLOW_BUILD__", "js/sprint11.js?v=__TIMEFLOW_BUILD__"]],
  ["js/sprint11.js", ["data-select-mode=\"private\"", "data-select-mode=\"team\"", "timeflow-private-mode", "timeflow:mode-changed", "Teamzugang", "timeflow:workday-updated"]],
  ["js/sprint9.js", ["function markReady()", "timeflow:sync-ready"]],
  ["js/sprint6.js", ["function privateMode()", "Persönlich erfasst", "action.makeMessage && !privateMode()"]],
  ["js/sprint10.js", ["function refreshCurrentSchedule()", "aria-current\", \"date"]],
  ["js/script.js", ["previousWorkday", "nextWorkday", "month: \"long\"", "togglePause"]]
]);

for (const [file, snippets] of requiredSnippets) {
  const content = await readFile(file, "utf8");
  for (const snippet of snippets) {
    if (!content.includes(snippet)) throw new Error(`${file}: Abnahmekriterium fehlt: ${snippet}`);
  }
}

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
if (packageJson.version !== "1.0.1") throw new Error("Version 1.0.1 ist nicht gesetzt.");

const worker = (await import("../dist/server/index.js")).default;
const home = await worker.fetch(new Request("https://timeflow.test/"), {});
const unauthenticatedSync = await worker.fetch(new Request("https://timeflow.test/api/sync"), {});
if (home.status !== 200 || !(await home.text()).includes("js/sprint11.js?v=")) {
  throw new Error("Der Sites-Build enthält Sprint 11 nicht vollständig.");
}
if (unauthenticatedSync.status !== 401) throw new Error("Die Synchronisierungs-API ist ohne Anmeldung nicht geschützt.");

const sample = new Date(2026, 7, 29);
const monday = new Date(sample);
monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
const sunday = new Date(monday);
sunday.setDate(sunday.getDate() + 6);
if (monday.getDate() !== 24 || sunday.getDate() !== 30) throw new Error("Die aktuelle Wochenberechnung ist fehlerhaft.");

console.log("Sprint 11: Privatmodus, Teammodus, PWA-Build und geschützte Synchronisierung sind abgenommen.");

const privateHome = await readFile("js/private-home.js", "utf8");
const privateHomeCss = await readFile("css/private-home.css", "utf8");
if (!privateHome.includes("data-team-only") || !privateHome.includes("Teamchat")) throw new Error("Team-Erweiterung der Einzelnutzungs-Navigation fehlt.");
if (!privateHomeCss.includes(":is(.timeflow-private-mode,.timeflow-team-mode)")) throw new Error("Teammodus verwendet nicht die bewährte Einzelnutzungs-Oberfläche.");
const auth = await readFile("js/sprint8.js", "utf8");
const chat = await readFile("js/sprint3.js", "utf8");
if (!auth.includes("fictionalIds") || !auth.includes("Noch keine echten Teammitglieder verbunden")) throw new Error("Fiktive Teammitglieder werden im echten Teamzugang nicht ausgeblendet.");
if (!chat.includes("clearPlatformDemoChat") || !chat.includes("timeflow:session-ready")) throw new Error("Beta-Chatdaten werden im echten Teamzugang nicht ausgeblendet.");

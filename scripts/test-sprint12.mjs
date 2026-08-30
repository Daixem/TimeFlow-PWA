import { readFile } from "node:fs/promises";

const requiredSnippets = new Map([
  ["index.html", ["css/compat.css?v=0034", "css/sprint12.css?v=0034", "js/platform.js?v=0034", "js/shell.js?v=0034", "js/sprint12.js?v=0034", "sw.js?v=0034", "personal-update-list", "data-personal-message", "team-update-list", "team-update-status", "month-open-statistics", "homeMonthLabel"]],
  ["sw.js", ["timeflow-v35", "relativePath.startsWith(\"api/\")", "response.type === \"opaque\"", "js/platform.js?v=0034", "js/shell.js?v=0034", "css/compat.css?v=0034", "js/sprint12.js?v=0034"]],
  ["js/platform.js", ["tf-platform-", "createStorage", "visualViewport", "openDialog", "data-timeflow-platform"]],
  ["css/compat.css", ["--tf-viewport-height", "pointer: coarse", "orientation: landscape", "forced-colors: active"]],
  ["css/sprint12.css", [".header .notification-btn", ".notification-badge", "focus-visible"]],
  ["css/sprint6.css", ["@media (min-width: 680px)", ".quick-actions-card { grid-column: 1 / -1; }"]],
  ["js/shell.js", ["function repair", "data-timeflow-shell", "window.TimeFlowShell", "window.scrollTo(0, 0)"]],
  ["js/sprint8.js", ["authVisibilityFallback", "isStaticPreview", "AbortController", "storageGet"]],
  ["js/sprint12.js", ["Geräte- und PWA-Check", "timeflow-device-check-v1", "Sichere Ausführung", "Mobile Darstellung", "Datensicherung", "timeflow:device-resumed", "function enforcePageState", "dataset.timeflowPage", "homeDetailDialog", "action: null, event: \"info\"", "Im Chat gratulieren", "timeflow:open-mode-selection", "timeflow:open-month-statistics", "is-actionable"]],
  ["js/script.js", ["&& !saved.isWorking", "timeflow:device-resumed", "Number.isNaN(start.valueOf())", "timeflow:open-home-detail"]],
  ["js/sprint11.js", ["data-select-mode=\"private\"", "data-select-mode=\"team\"", "writeSettings", "pointerup", "timeflow:open-mode-selection"]],
  ["js/sprint4.js", ["profile-details-grid", "profile-menu-card", "data-edit-profile", "profilePhotoInput", "optimizePhoto", "canvas.toDataURL", "avatar: pendingAvatar"]],
  ["js/sprint9.js", ["timeflow:sync-ready", "cache: \"no-store\""]],
  ["js/sprint10.js", ["function safeBackupPayload", "RESTORE_EXCLUDED_KEYS", "function refreshCurrentSchedule"]]
]);

for (const [file, snippets] of requiredSnippets) {
  const content = await readFile(file, "utf8");
  for (const snippet of snippets) {
    if (!content.includes(snippet)) throw new Error(`${file}: Abnahmekriterium fehlt: ${snippet}`);
  }
}

if ((await readFile("js/sprint4.js", "utf8")).includes("profile-info-card")) {
  throw new Error("Die entfernte doppelte Profilübersicht ist noch vorhanden.");
}

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
if (packageJson.version !== "1.0.1") throw new Error("Version 1.0.1 ist nicht gesetzt.");

const manifest = JSON.parse(await readFile("manifest.webmanifest", "utf8"));
if (manifest.display !== "standalone" || manifest.icons?.length < 3 || manifest.scope !== "./") {
  throw new Error("Das PWA-Manifest ist für die mobile Installation unvollständig.");
}

const serviceWorker = await readFile("sw.js", "utf8");
const apiBypass = serviceWorker.indexOf('relativePath.startsWith("api/")');
const firstRespondWith = serviceWorker.indexOf("event.respondWith");
if (apiBypass < 0 || firstRespondWith < 0 || apiBypass > firstRespondWith) {
  throw new Error("API-Anfragen werden nicht sicher vor dem PWA-Cache ausgenommen.");
}

const worker = (await import("../dist/server/index.js")).default;
const home = await worker.fetch(new Request("https://timeflow.test/"), {});
const missing = await worker.fetch(new Request("https://timeflow.test/nicht-vorhanden"), {});
const unauthenticatedSync = await worker.fetch(new Request("https://timeflow.test/api/sync"), {});
if (home.status !== 200 || !(await home.text()).includes("js/platform.js?v=0034")) {
  throw new Error("Der Sites-Build enthält Sprint 12 nicht vollständig.");
}
if (missing.status !== 404) throw new Error("Unbekannte Dateien liefern keinen korrekten 404-Status.");
if (unauthenticatedSync.status !== 401 || unauthenticatedSync.headers.get("Cache-Control") !== "no-store") {
  throw new Error("Die Synchronisierungs-API ist nicht ausreichend gegen unbefugten oder zwischengespeicherten Zugriff geschützt.");
}

console.log("Sprint 12: Gerätecheck, Offline-Update, Tageswechsel, Backup und geschützte Synchronisierung sind abgenommen.");

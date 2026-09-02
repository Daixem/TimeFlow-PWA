import { readFile } from "node:fs/promises";

const requiredSnippets = new Map([
  ["index.html", ["css/compat.css?v=0040-mobile2", "css/sprint12.css?v=0040-mobile2", "css/private-home.css?v=0040-home2", "js/platform.js?v=0040", "js/shell.js?v=0040-scroll1", "js/sprint12.js?v=0040-scroll1", "js/private-home.js?v=0040-home19", "sw.js?v=0040-beta12", "personal-update-list", "data-personal-message", "team-update-list", "team-update-status", "month-open-statistics", "homeMonthLabel"]],
  ["sw.js", ["timeflow-v79-complete-i18n-controls", "relativePath.startsWith(\"api/\")", "response.type === \"opaque\"", "js/platform.js?v=0040", "js/shell.js?v=0040-scroll1", "css/compat.css?v=0040-mobile2", "js/sprint12.js?v=0040-scroll1", "js/private-home.js?v=0040-home19", "js/private-schedule-import.js?v=0040-files2"]],
  ["js/platform.js", ["tf-platform-", "createStorage", "visualViewport", "openDialog", "data-timeflow-platform"]],
  ["css/compat.css", ["--tf-viewport-height", "pointer: coarse", "orientation: landscape", "forced-colors: active"]],
  ["css/sprint12.css", [".header .notification-btn", ".notification-badge", "focus-visible"]],
  ["css/sprint6.css", ["@media (min-width: 680px)", ".quick-actions-card { grid-column: 1 / -1; }"]],
  ["js/shell.js", ["function repair", "data-timeflow-shell", "window.TimeFlowShell", "must never move the user's current reading position"]],
  ["js/sprint8.js", ["authVisibilityFallback", "isStaticPreview", "AbortController", "storageGet", "profile-hero-actions", "sessionPermissionRole", "profile-signout-button"]],
  ["js/sprint12.js", ["Geräte- und PWA-Check", "timeflow-device-check-v1", "Sichere Ausführung", "Mobile Darstellung", "Datensicherung", "timeflow:device-resumed", "function enforcePageState", "dataset.timeflowPage", "homeDetailDialog", "action: null, event: \"info\"", "Im Chat gratulieren", "timeflow:open-mode-selection", "timeflow:open-month-statistics", "is-actionable"]],
  ["js/script.js", ["&& !saved.isWorking", "timeflow:device-resumed", "Number.isNaN(start.valueOf())", "timeflow:open-home-detail", "requestClockConfirmation", "clockConfirmDialog", "data-confirm-clock"]],
  ["js/sprint11.js", ["data-select-mode=\"private\"", "data-select-mode=\"team\"", "writeSettings", "pointerup", "timeflow:open-mode-selection", "quickActionsCard.hidden = isPrivate"]],
  ["js/sprint4.js", ["profile-details-grid", "profile-menu-card", "data-edit-profile", "profilePhotoInput", "loadCropPhoto", "profileCropZoom", "pointermove", "applyCrop", "canvas.toDataURL", "avatar: pendingAvatar", "timeflow:session-ready", "canEditAccountName", "readonly", "timeflow:account-name-change"]],
  ["js/sprint9.js", ["timeflow:sync-ready", "cache: \"no-store\"", "#settingsPage .settings-layout", "settingsLayout.insertAdjacentHTML"]],
  ["js/sprint10.js", ["function safeBackupPayload", "RESTORE_EXCLUDED_KEYS", "function refreshCurrentSchedule", "settingsPage.querySelector(\".settings-layout\")", "settingsPage.querySelector(`[data-readiness="]]
]);

for (const [file, snippets] of requiredSnippets) {
  const content = await readFile(file, "utf8");
  for (const snippet of snippets) {
    if (!content.includes(snippet)) throw new Error(`${file}: Abnahmekriterium fehlt: ${snippet}`);
  }
}

const profileScript = await readFile("js/sprint4.js", "utf8");
if (["profile-info-card", "privacySection", "version-row"].some((snippet) => profileScript.includes(snippet))) {
  throw new Error("Die entfernte doppelte Profilübersicht ist noch vorhanden.");
}

const sessionScript = await readFile("js/sprint8.js", "utf8");
if (sessionScript.includes('class="session-card"') || sessionScript.includes('insertAdjacentHTML("afterend"')) {
  throw new Error("Das angemeldete Konto wird noch als separate Profilkarte ausgegeben.");
}

const syncScript = await readFile("js/sprint9.js", "utf8");
if (syncScript.includes('querySelector(".session-card")')) {
  throw new Error("Die Synchronisierung hängt noch von der entfernten Kontokarte ab.");
}

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
if (packageJson.version !== "1.0.1") throw new Error("Version 1.0.1 ist nicht gesetzt.");

const manifest = JSON.parse(await readFile("manifest.webmanifest", "utf8"));
if (manifest.display !== "standalone" || manifest.icons?.length < 3 || manifest.scope !== "./") {
  throw new Error("Das PWA-Manifest ist für die mobile Installation unvollständig.");
}

const serviceWorker = await readFile("sw.js", "utf8");
const shellSource = await readFile("js/shell.js", "utf8");
const sprint12Source = await readFile("js/sprint12.js", "utf8");
if (shellSource.includes("window.scrollTo(0, 0)")) {
  throw new Error("Die Shell-Reparatur darf die Scrollposition nicht veraendern.");
}
if (sprint12Source.includes('window.scrollTo({ top: 0, left: 0, behavior: "auto" })')) {
  throw new Error("Der Seitenabgleich darf die Scrollposition nicht veraendern.");
}
const apiBypass = serviceWorker.indexOf('relativePath.startsWith("api/")');
const firstRespondWith = serviceWorker.indexOf("event.respondWith");
if (apiBypass < 0 || firstRespondWith < 0 || apiBypass > firstRespondWith) {
  throw new Error("API-Anfragen werden nicht sicher vor dem PWA-Cache ausgenommen.");
}

const worker = (await import("../dist/server/index.js")).default;
const home = await worker.fetch(new Request("https://timeflow.test/"), {});
const missing = await worker.fetch(new Request("https://timeflow.test/nicht-vorhanden"), {});
const unauthenticatedSync = await worker.fetch(new Request("https://timeflow.test/api/sync"), {});
if (home.status !== 200 || !(await home.text()).includes("js/platform.js?v=0040")) {
  throw new Error("Der Sites-Build enthält Sprint 12 nicht vollständig.");
}
if (missing.status !== 404) throw new Error("Unbekannte Dateien liefern keinen korrekten 404-Status.");
if (unauthenticatedSync.status !== 401 || unauthenticatedSync.headers.get("Cache-Control") !== "no-store") {
  throw new Error("Die Synchronisierungs-API ist nicht ausreichend gegen unbefugten oder zwischengespeicherten Zugriff geschützt.");
}

console.log("Sprint 12: Gerätecheck, Offline-Update, Tageswechsel, Backup und geschützte Synchronisierung sind abgenommen.");

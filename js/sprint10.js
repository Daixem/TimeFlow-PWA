"use strict";

let timeFlowInstallPrompt = null;
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  timeFlowInstallPrompt = event;
  document.dispatchEvent(new CustomEvent("timeflow:install-available"));
});

document.addEventListener("DOMContentLoaded", () => {
  const settingsPage = document.getElementById("settingsPage");
  const profilePage = document.getElementById("profilePage");
  if (!settingsPage || !profilePage) return;

  const BACKUP_KEY = "timeflow-last-backup-v1";
  const RESTORE_EXCLUDED_KEYS = new Set(["timeflow-session-v1", "timeflow-sync-meta-v1", BACKUP_KEY]);
  const RESTORE_ALLOWED_KEYS = new Set([
    "timeflow-profile-v1", "timeflow-settings-v1", "timeflow-profile-preferences-v1",
    "timeflow-workday-v2", "timeflow-chat-demo-v2", "timeflow-chat-shift-confirmed-v1",
    "timeflow-quick-actions-v1", "timeflow-notifications-v1", "timeflow-users-v1"
  ]);
  const appSettingsCard = settingsPage.querySelector('[aria-labelledby="appSettingsTitle"]');
  const dataSettingsCard = settingsPage.querySelector('[aria-labelledby="dataSettingsTitle"]');
  const cloudCard = profilePage.querySelector(".cloud-sync-card");

  appSettingsCard?.querySelector(".app-status-list")?.insertAdjacentHTML("beforeend", `
    <div><span><i class="fa-solid fa-mobile-screen-button"></i><strong>Installation</strong></span><em id="installStatus">Wird geprüft</em></div>
  `);
  appSettingsCard?.querySelector("[data-check-update]")?.insertAdjacentHTML("afterend", `
    <button class="settings-primary-button sprint10-install-button" type="button" data-install-app>
      <i class="fa-solid fa-arrow-down-to-bracket"></i><span><strong>TimeFlow installieren</strong><small id="installHint">App-Status wird geprüft</small></span>
    </button>
  `);

  dataSettingsCard?.querySelector("[data-export-data]")?.insertAdjacentHTML("afterend", `
    <button type="button" data-import-data><span class="data-action-icon"><i class="fa-solid fa-file-arrow-up"></i></span><span><strong>Datensicherung wiederherstellen</strong><small>Geprüfte TimeFlow-JSON auswählen</small></span><i class="fa-solid fa-chevron-right"></i></button>
    <input class="sprint10-file-input" type="file" accept="application/json,.json" data-import-file aria-label="TimeFlow-Datensicherung auswählen">
  `);

  settingsPage.insertAdjacentHTML("beforeend", `
    <dialog class="settings-dialog sprint10-restore-dialog" id="restoreDialog" aria-labelledby="restoreTitle">
      <div class="settings-dialog-icon"><i class="fa-solid fa-clock-rotate-left"></i></div>
      <h2 id="restoreTitle">Datensicherung prüfen</h2>
      <p id="restoreDescription">Wähle zuerst eine TimeFlow-Datensicherung aus.</p>
      <dl class="restore-summary" id="restoreSummary" hidden>
        <div><dt>Erstellt</dt><dd data-restore-date>–</dd></div>
        <div><dt>Datensätze</dt><dd data-restore-count>–</dd></div>
        <div><dt>Ausgeschlossen</dt><dd>Sitzung & Cloud-Status</dd></div>
      </dl>
      <p class="restore-warning" id="restoreWarning" hidden><i class="fa-solid fa-triangle-exclamation"></i> Vorhandene gleichnamige Daten werden ersetzt. Andere lokale TimeFlow-Daten bleiben erhalten.</p>
      <div><button type="button" data-close-restore>Abbrechen</button><button class="confirm-restore" type="button" data-confirm-restore disabled>Wiederherstellen</button></div>
    </dialog>
  `);

  const readinessAnchor = cloudCard || profilePage.querySelector(".session-card") || profilePage.querySelector(".profile-hero");
  readinessAnchor?.insertAdjacentHTML("afterend", `
    <section class="release-readiness-card" aria-labelledby="releaseReadinessTitle">
      <header><span><i class="fa-solid fa-shield-heart"></i></span><div><small>Sprint 10 · Alpha 1.0</small><h2 id="releaseReadinessTitle">TimeFlow ist startklar</h2><p id="releaseReadinessCopy">App, Offline-Modus und Datensicherheit werden geprüft.</p></div><strong id="releaseReadinessScore">0/4</strong></header>
      <div class="release-readiness-grid">
        <span data-readiness="app"><i class="fa-solid fa-mobile-screen"></i><b>App</b><small>Browser</small></span>
        <span data-readiness="offline"><i class="fa-solid fa-cloud-arrow-down"></i><b>Offline</b><small>Prüfung</small></span>
        <span data-readiness="sync"><i class="fa-solid fa-arrows-rotate"></i><b>Abgleich</b><small>Prüfung</small></span>
        <span data-readiness="backup"><i class="fa-solid fa-box-archive"></i><b>Backup</b><small>Offen</small></span>
      </div>
      <button type="button" data-open-readiness-settings><i class="fa-solid fa-sliders"></i> App und Daten verwalten</button>
    </section>
  `);

  const installButton = settingsPage.querySelector("[data-install-app]");
  const installStatus = document.getElementById("installStatus");
  const installHint = document.getElementById("installHint");
  const importButton = settingsPage.querySelector("[data-import-data]");
  const importFile = settingsPage.querySelector("[data-import-file]");
  const restoreDialog = document.getElementById("restoreDialog");
  const restoreDescription = document.getElementById("restoreDescription");
  const restoreSummary = document.getElementById("restoreSummary");
  const restoreWarning = document.getElementById("restoreWarning");
  const confirmRestore = restoreDialog.querySelector("[data-confirm-restore]");
  let pendingRestore = null;

  function dateOnly(value = new Date()) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  function addDays(value, amount) {
    const result = new Date(value);
    result.setDate(result.getDate() + amount);
    return result;
  }

  function mondayOf(value) {
    const result = dateOnly(value);
    result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
    return result;
  }

  function isoWeek(value) {
    const date = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  }

  function longDate(value) {
    return value.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  }

  function shortDate(value) {
    return value.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  }

  function refreshCurrentSchedule() {
    const schedulePage = document.getElementById("schedulePage");
    if (!schedulePage) return;
    const today = dateOnly();
    const monday = mondayOf(today);
    const sunday = addDays(monday, 6);
    const weekHeader = schedulePage.querySelector('[data-panel="week"] .date-switch span');
    const dayHeader = schedulePage.querySelector('[data-panel="day"] .date-switch span');
    const monthHeader = schedulePage.querySelector('[data-panel="month"] .date-switch span');
    const periodHeader = schedulePage.querySelector('[data-panel="period"] .date-switch span');

    if (dayHeader) dayHeader.innerHTML = `<i class="fa-regular fa-calendar"></i> ${longDate(today)} <small>Heute</small>`;
    if (weekHeader) {
      const rangeStart = monday.toLocaleDateString("de-DE", { day: "numeric", month: "long" });
      const rangeEnd = sunday.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
      weekHeader.textContent = `KW ${isoWeek(today)} • ${rangeStart} – ${rangeEnd}`;
    }
    if (monthHeader) monthHeader.textContent = today.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
    if (periodHeader) {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      periodHeader.innerHTML = `<i class="fa-regular fa-calendar"></i> ${shortDate(first)} – ${last.toLocaleDateString("de-DE")}`;
    }

    schedulePage.querySelectorAll(".week-row").forEach((row, index) => {
      const rowDate = addDays(monday, index);
      row.classList.toggle("active", rowDate.getTime() === today.getTime());
      const dateLabel = row.querySelector("b small");
      if (dateLabel) dateLabel.textContent = shortDate(rowDate);
      if (rowDate.getTime() === today.getTime()) row.setAttribute("aria-current", "date");
      else row.removeAttribute("aria-current");
    });

    const monthCalendar = schedulePage.querySelector(".month-calendar");
    if (monthCalendar) {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      const calendarStart = mondayOf(first);
      const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const calendarEnd = addDays(mondayOf(last), 6);
      const fragment = document.createDocumentFragment();
      for (let date = calendarStart; date <= calendarEnd; date = addDays(date, 1)) {
        const cell = document.createElement("span");
        const inMonth = date.getMonth() === today.getMonth();
        const isToday = date.getTime() === today.getTime();
        const weekday = date.getDay();
        cell.className = !inMonth ? "muted" : `${weekday === 0 ? "free" : weekday === 6 ? "blue" : weekday === 3 ? "orange" : "green"}${isToday ? " selected" : ""}`;
        cell.textContent = String(date.getDate());
        if (isToday) cell.setAttribute("aria-current", "date");
        fragment.append(cell);
      }
      monthCalendar.replaceChildren(fragment);
    }

    const periodDates = [monday, addDays(monday, 1), addDays(monday, 2), addDays(monday, 3)];
    schedulePage.querySelectorAll(".period-day h2").forEach((heading, index) => {
      heading.innerHTML = `${longDate(periodDates[index])} <span>8:00 h <i class="fa-solid fa-chevron-up"></i></span>`;
    });
    schedulePage.querySelectorAll(".period-closed").forEach((row, index) => {
      const date = periodDates[index + 2];
      const label = index ? "Frei" : "8:00 h";
      row.innerHTML = `${longDate(date)} <span>${label} <i class="fa-solid fa-chevron-down"></i></span>`;
    });
  }

  function notify(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 3400);
  }

  function installed() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }

  function renderInstallState() {
    const isInstalled = installed();
    installButton.disabled = isInstalled;
    installButton.classList.toggle("is-installed", isInstalled);
    installStatus.textContent = isInstalled ? "Installiert" : timeFlowInstallPrompt ? "Bereit" : "Im Browser";
    installHint.textContent = isInstalled
      ? "TimeFlow läuft bereits als App"
      : timeFlowInstallPrompt ? "Zum Startbildschirm hinzufügen" : "Über das Browsermenü installierbar";
    installButton.querySelector("strong").textContent = isInstalled ? "TimeFlow ist installiert" : "TimeFlow installieren";
    renderReadiness();
  }

  async function installApp() {
    if (installed()) return;
    if (!timeFlowInstallPrompt) {
      notify("Öffne das Browsermenü und wähle „App installieren“ oder „Zum Home-Bildschirm“.");
      return;
    }
    const prompt = timeFlowInstallPrompt;
    timeFlowInstallPrompt = null;
    await prompt.prompt();
    const choice = await prompt.userChoice.catch(() => ({ outcome: "dismissed" }));
    if (choice.outcome === "accepted") notify("TimeFlow wird als App installiert.");
    renderInstallState();
  }

  function safeBackupPayload(payload) {
    if (!payload || payload.app !== "TimeFlow PWA" || !payload.data || typeof payload.data !== "object" || Array.isArray(payload.data)) {
      throw new Error("Diese Datei ist keine gültige TimeFlow-Datensicherung.");
    }
    const serialized = JSON.stringify(payload);
    if (serialized.length > 1_000_000) throw new Error("Die Datensicherung ist zu groß.");
    const data = {};
    for (const [key, value] of Object.entries(payload.data)) {
      if (!key.startsWith("timeflow-") || RESTORE_EXCLUDED_KEYS.has(key) || !RESTORE_ALLOWED_KEYS.has(key)) continue;
      if (typeof value === "undefined" || typeof value === "function") continue;
      data[key] = value;
    }
    if (!Object.keys(data).length || Object.keys(data).length > 100) throw new Error("Die Datensicherung enthält keine verwendbaren TimeFlow-Daten.");
    return { data, exportedAt: payload.exportedAt || null };
  }

  async function inspectBackup(file) {
    pendingRestore = null;
    confirmRestore.disabled = true;
    restoreSummary.hidden = true;
    restoreWarning.hidden = true;
    try {
      const payload = JSON.parse(await file.text());
      pendingRestore = safeBackupPayload(payload);
      const date = pendingRestore.exportedAt ? new Date(pendingRestore.exportedAt) : null;
      restoreDescription.textContent = "Die Datei wurde geprüft und kann kontrolliert wiederhergestellt werden.";
      restoreSummary.querySelector("[data-restore-date]").textContent = date && !Number.isNaN(date.valueOf()) ? date.toLocaleString("de-DE") : "Nicht angegeben";
      restoreSummary.querySelector("[data-restore-count]").textContent = String(Object.keys(pendingRestore.data).length);
      restoreSummary.hidden = false;
      restoreWarning.hidden = false;
      confirmRestore.disabled = false;
    } catch (error) {
      restoreDescription.textContent = error instanceof Error ? error.message : "Die Datei konnte nicht gelesen werden.";
    }
    restoreDialog.showModal();
  }

  function restoreBackup() {
    if (!pendingRestore) return;
    for (const [key, value] of Object.entries(pendingRestore.data)) {
      localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
    }
    localStorage.setItem(BACKUP_KEY, new Date().toISOString());
    sessionStorage.setItem("timeflow-restore-complete", "1");
    window.location.reload();
  }

  function readinessItem(name, ready, detail) {
    const item = profilePage.querySelector(`[data-readiness="${name}"]`);
    if (!item) return false;
    item.classList.toggle("is-ready", ready);
    item.querySelector("small").textContent = detail;
    return ready;
  }

  function renderReadiness() {
    const offlineReady = Boolean(navigator.serviceWorker?.controller);
    const syncState = cloudCard?.classList.contains("is-synced") || cloudCard?.classList.contains("is-local");
    const backupDate = localStorage.getItem(BACKUP_KEY);
    const states = [
      readinessItem("app", installed(), installed() ? "Installiert" : "Browser"),
      readinessItem("offline", offlineReady, offlineReady ? "Bereit" : "Lädt"),
      readinessItem("sync", Boolean(syncState), cloudCard?.classList.contains("is-synced") ? "Cloud" : syncState ? "Lokal" : "Prüfung"),
      readinessItem("backup", Boolean(backupDate), backupDate ? "Gesichert" : "Empfohlen")
    ];
    const score = states.filter(Boolean).length;
    document.getElementById("releaseReadinessScore").textContent = `${score}/4`;
    document.getElementById("releaseReadinessCopy").textContent = score === 4
      ? "Installation, Offline-Modus und Datensicherheit sind vollständig vorbereitet."
      : "Die wichtigsten App- und Datensicherheitsfunktionen sind übersichtlich zusammengefasst.";
  }

  installButton?.addEventListener("click", installApp);
  document.addEventListener("timeflow:install-available", renderInstallState);
  window.addEventListener("appinstalled", () => { timeFlowInstallPrompt = null; renderInstallState(); notify("TimeFlow wurde erfolgreich installiert."); });
  importButton?.addEventListener("click", () => importFile.click());
  importFile?.addEventListener("change", () => { const [file] = importFile.files; if (file) inspectBackup(file); importFile.value = ""; });
  settingsPage.querySelector("[data-export-data]")?.addEventListener("click", () => { localStorage.setItem(BACKUP_KEY, new Date().toISOString()); window.setTimeout(renderReadiness); });
  restoreDialog.querySelector("[data-close-restore]").addEventListener("click", () => restoreDialog.close());
  confirmRestore.addEventListener("click", restoreBackup);
  restoreDialog.addEventListener("click", (event) => { if (event.target === restoreDialog) restoreDialog.close(); });
  profilePage.querySelector("[data-open-readiness-settings]")?.addEventListener("click", () => document.dispatchEvent(new CustomEvent("timeflow:open-settings")));
  const scheduleNav = document.querySelector('[data-target="schedule"]');
  const currentWeekTab = document.querySelector('#schedulePage [data-view="week"]');
  scheduleNav?.addEventListener("click", () => {
    refreshCurrentSchedule();
    currentWeekTab?.click();
  });
  document.querySelector("#schedulePage .schedule-header button")?.addEventListener("click", () => {
    refreshCurrentSchedule();
    currentWeekTab?.click();
  });
  if (cloudCard) new MutationObserver(renderReadiness).observe(cloudCard, { attributes: true, attributeFilter: ["class"] });
  navigator.serviceWorker?.ready.then(renderReadiness).catch(() => undefined);

  if (sessionStorage.getItem("timeflow-restore-complete") === "1") {
    sessionStorage.removeItem("timeflow-restore-complete");
    notify("Deine Datensicherung wurde erfolgreich wiederhergestellt.");
  }
  renderInstallState();
  renderReadiness();
  refreshCurrentSchedule();
});

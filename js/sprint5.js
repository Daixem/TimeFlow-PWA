"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const dashboard = document.getElementById("dashboard");
  if (!dashboard) return;

  dashboard.insertAdjacentHTML("beforeend", `
    <section id="settingsPage" class="settings-page app-page hidden" aria-labelledby="settingsTitle">
      <header class="settings-page-header">
        <button class="settings-back" type="button" data-settings-back aria-label="Zurück zum Profil"><i class="fa-solid fa-arrow-left"></i></button>
        <div><span class="settings-eyebrow"><i class="fa-solid fa-sliders"></i> Sprint 5</span><h1 id="settingsTitle">Einstellungen</h1><p>TimeFlow so einrichten, wie dein Arbeitstag funktioniert.</p></div>
        <span class="settings-saved"><i class="fa-solid fa-check"></i> Lokal</span>
      </header>

      <section class="settings-hero" aria-labelledby="settingsHeroTitle">
        <span class="settings-hero-icon"><i class="fa-solid fa-mobile-screen-button"></i></span>
        <div><small>Deine PWA</small><h2 id="settingsHeroTitle">Bereit für deinen Arbeitstag</h2><p>Einstellungen und Arbeitszeiten bleiben auf diesem Gerät verfügbar – auch ohne Verbindung.</p></div>
        <span class="connection-state" id="settingsConnection"><i></i><b>Online</b></span>
      </section>

      <div class="settings-layout">
        <section class="settings-card" aria-labelledby="notificationSettingsTitle">
          <header><span class="settings-card-icon blue"><i class="fa-regular fa-bell"></i></span><div><small>Kommunikation</small><h2 id="notificationSettingsTitle">Benachrichtigungen</h2></div></header>
          <div class="settings-list">
            <label class="settings-toggle"><span><strong>Dienstplan-Erinnerungen</strong><small>Vor Beginn deiner nächsten Schicht</small></span><input type="checkbox" data-setting="shiftReminders"><i aria-hidden="true"></i></label>
            <label class="settings-toggle"><span><strong>Chat-Nachrichten</strong><small>Neue Nachrichten aus deinem Team</small></span><input type="checkbox" data-setting="chatAlerts"><i aria-hidden="true"></i></label>
            <label class="settings-toggle"><span><strong>Freigaben und Anträge</strong><small>Statusänderungen direkt anzeigen</small></span><input type="checkbox" data-setting="approvalAlerts"><i aria-hidden="true"></i></label>
          </div>
        </section>

        <section class="settings-card" aria-labelledby="timeSettingsTitle">
          <header><span class="settings-card-icon mint"><i class="fa-solid fa-stopwatch"></i></span><div><small>Zeiterfassung</small><h2 id="timeSettingsTitle">Arbeitszeit</h2></div></header>
          <div class="settings-list">
            <label class="settings-select"><span><strong>Tägliches Arbeitsziel</strong><small>Berechnet Fortschritt und Überstunden</small></span><select data-setting="dailyTargetMinutes"><option value="360">6 Stunden</option><option value="450">7,5 Stunden</option><option value="480">8 Stunden</option><option value="600">10 Stunden</option></select></label>
            <label class="settings-select"><span><strong>Automatische Pause</strong><small>Nach 6 Stunden Arbeitszeit</small></span><select data-setting="autoBreakMinutes"><option value="0">Deaktiviert</option><option value="30">30 Minuten</option><option value="45">45 Minuten</option><option value="60">60 Minuten</option></select></label>
            <label class="settings-toggle"><span><strong>Animationen reduzieren</strong><small>Ruhigere Übergänge in der gesamten App</small></span><input type="checkbox" data-setting="reducedMotion"><i aria-hidden="true"></i></label>
          </div>
          <p class="settings-effect"><i class="fa-solid fa-wand-magic-sparkles"></i><span><strong>Direkt verbunden</strong><small>Änderungen am Tagesziel und an Pausen gelten sofort auf Home und Stempeln.</small></span></p>
        </section>

        <section class="settings-card" aria-labelledby="appSettingsTitle">
          <header><span class="settings-card-icon violet"><i class="fa-solid fa-cloud-arrow-down"></i></span><div><small>Installation</small><h2 id="appSettingsTitle">App & Offline</h2></div></header>
          <div class="app-status-list">
            <div><span><i class="fa-solid fa-wifi"></i><strong>Verbindung</strong></span><em id="onlineStatus">Online</em></div>
            <div><span><i class="fa-solid fa-shield-halved"></i><strong>Offline-Modus</strong></span><em id="offlineStatus">Wird geprüft</em></div>
            <div><span><i class="fa-solid fa-code-branch"></i><strong>Installierte Version</strong></span><em>Alpha 0.6 · 0010</em></div>
          </div>
          <button class="settings-primary-button" type="button" data-check-update><i class="fa-solid fa-rotate"></i><span><strong>Auf Updates prüfen</strong><small>Letzte Prüfung: noch nicht geprüft</small></span></button>
        </section>

        <section class="settings-card" aria-labelledby="dataSettingsTitle">
          <header><span class="settings-card-icon amber"><i class="fa-solid fa-database"></i></span><div><small>Selbstbestimmt</small><h2 id="dataSettingsTitle">Daten & Datenschutz</h2></div></header>
          <p class="settings-card-copy">Diese Vorschau nutzt keine Cloud-Datenbank. Deine Profil-, Chat- und Zeiterfassungsdaten liegen lokal in diesem Browser.</p>
          <div class="data-actions">
            <button type="button" data-export-data><span class="data-action-icon"><i class="fa-solid fa-file-arrow-down"></i></span><span><strong>Datensicherung erstellen</strong><small>Alle lokalen TimeFlow-Daten als JSON</small></span><i class="fa-solid fa-chevron-right"></i></button>
            <button class="danger" type="button" data-open-reset><span class="data-action-icon"><i class="fa-solid fa-trash-can"></i></span><span><strong>Lokale Daten löschen</strong><small>TimeFlow auf diesem Gerät zurücksetzen</small></span><i class="fa-solid fa-chevron-right"></i></button>
          </div>
        </section>
      </div>

      <section class="settings-about"><span><i class="fa-solid fa-fingerprint"></i></span><div><strong>TimeFlow PWA</strong><p>Sprint 5 · Alpha 0.6 · Build 0010</p></div><em>Made for better workdays</em></section>

      <dialog class="settings-dialog" id="settingsResetDialog" aria-labelledby="settingsResetTitle">
        <div class="settings-dialog-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
        <h2 id="settingsResetTitle">Lokale Daten löschen?</h2>
        <p>Profil, Chats, Einstellungen und gespeicherte Arbeitszeiten werden aus diesem Browser entfernt. Lade vorher eine Datensicherung herunter, wenn du sie behalten möchtest.</p>
        <div><button type="button" data-close-reset>Abbrechen</button><button class="confirm-reset" type="button" data-confirm-reset>Löschen</button></div>
      </dialog>
    </section>
  `);

  const SETTINGS_KEY = "timeflow-settings-v1";
  const LEGACY_PREFERENCES_KEY = "timeflow-profile-preferences-v1";
  const defaults = {
    shiftReminders: true,
    chatAlerts: true,
    approvalAlerts: true,
    dailyTargetMinutes: 480,
    autoBreakMinutes: 30,
    autoBreakAfterMinutes: 360,
    reducedMotion: false
  };
  const page = document.getElementById("settingsPage");
  const resetDialog = document.getElementById("settingsResetDialog");
  const connection = document.getElementById("settingsConnection");
  const onlineStatus = document.getElementById("onlineStatus");
  const offlineStatus = document.getElementById("offlineStatus");
  let settings = loadSettings();

  function parseStored(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value && typeof value === "object" ? value : {};
    } catch {
      return {};
    }
  }

  function loadSettings() {
    return { ...defaults, ...parseStored(LEGACY_PREFERENCES_KEY), ...parseStored(SETTINGS_KEY) };
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    localStorage.setItem(LEGACY_PREFERENCES_KEY, JSON.stringify({ shiftReminders: settings.shiftReminders, chatAlerts: settings.chatAlerts }));
    applyPreferences();
    document.dispatchEvent(new CustomEvent("timeflow:settings-updated", { detail: { ...settings } }));
    notify("Einstellung wurde auf diesem Gerät gespeichert.");
  }

  function applyPreferences() {
    document.documentElement.classList.toggle("timeflow-reduced-motion", Boolean(settings.reducedMotion));
  }

  function renderControls() {
    page.querySelectorAll("[data-setting]").forEach((control) => {
      const value = settings[control.dataset.setting];
      if (control.type === "checkbox") control.checked = Boolean(value);
      else control.value = String(value);
    });
    applyPreferences();
  }

  function notify(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 3200);
  }

  function updateConnection() {
    const online = navigator.onLine;
    connection.classList.toggle("is-offline", !online);
    connection.querySelector("b").textContent = online ? "Online" : "Offline";
    onlineStatus.textContent = online ? "Online" : "Offline";
    onlineStatus.classList.toggle("warning", !online);
  }

  async function updateOfflineStatus() {
    if (!("serviceWorker" in navigator)) {
      offlineStatus.textContent = "Nicht verfügbar";
      offlineStatus.classList.add("warning");
      return;
    }
    try {
      await navigator.serviceWorker.ready;
      offlineStatus.textContent = "Bereit";
      offlineStatus.classList.remove("warning");
    } catch {
      offlineStatus.textContent = "Noch nicht bereit";
      offlineStatus.classList.add("warning");
    }
  }

  function exportData() {
    const localData = {};
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith("timeflow-")) continue;
      const rawValue = localStorage.getItem(key);
      try { localData[key] = JSON.parse(rawValue); } catch { localData[key] = rawValue; }
    }
    const exportPayload = { app: "TimeFlow PWA", version: "0.6.0-alpha.1", exportedAt: new Date().toISOString(), data: localData };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `TimeFlow-Datensicherung-${new Date().toLocaleDateString("sv-SE")}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    notify("Deine TimeFlow-Datensicherung wurde erstellt.");
  }

  async function checkForUpdate(button) {
    const label = button.querySelector("small");
    button.disabled = true;
    button.classList.add("is-loading");
    label.textContent = "Prüfung läuft …";
    try {
      const registration = await navigator.serviceWorker?.getRegistration();
      if (registration) await registration.update();
      const checkedAt = new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
      label.textContent = `Zuletzt geprüft um ${checkedAt} Uhr`;
      notify("TimeFlow ist auf dem aktuellen Stand.");
    } catch {
      label.textContent = "Prüfung derzeit nicht möglich";
      notify("Das Update konnte gerade nicht geprüft werden.");
    } finally {
      button.disabled = false;
      button.classList.remove("is-loading");
    }
  }

  page.querySelectorAll("[data-setting]").forEach((control) => control.addEventListener("change", () => {
    settings[control.dataset.setting] = control.type === "checkbox" ? control.checked : Number(control.value);
    saveSettings();
  }));
  page.querySelector("[data-settings-back]").addEventListener("click", () => document.dispatchEvent(new CustomEvent("timeflow:open-profile")));
  page.querySelector("[data-check-update]").addEventListener("click", (event) => checkForUpdate(event.currentTarget));
  page.querySelector("[data-export-data]").addEventListener("click", exportData);
  page.querySelector("[data-open-reset]").addEventListener("click", () => resetDialog.showModal());
  page.querySelector("[data-close-reset]").addEventListener("click", () => resetDialog.close());
  page.querySelector("[data-confirm-reset]").addEventListener("click", () => {
    const keys = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith("timeflow-")) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
    resetDialog.close();
    window.location.reload();
  });
  resetDialog.addEventListener("click", (event) => { if (event.target === resetDialog) resetDialog.close(); });
  window.addEventListener("online", updateConnection);
  window.addEventListener("offline", updateConnection);

  renderControls();
  updateConnection();
  updateOfflineStatus();
});

"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const SETTINGS_KEY = "timeflow-settings-v1";
  const settingsPage = document.getElementById("settingsPage");
  const settingsLayout = settingsPage?.querySelector(".settings-layout");
  if (!settingsPage || !settingsLayout) return;

  document.body.insertAdjacentHTML("beforeend", `
    <dialog class="mode-onboarding" id="modeOnboarding" aria-labelledby="modeOnboardingTitle">
      <section>
        <span class="mode-onboarding-brand"><i class="fa-solid fa-stopwatch"></i></span>
        <small>Sprint 11 · Dein TimeFlow</small>
        <h2 id="modeOnboardingTitle">Wie möchtest du TimeFlow nutzen?</h2>
        <p>Du kannst den Modus später jederzeit in den Einstellungen ändern.</p>
        <div class="mode-choice-grid">
          <button type="button" data-select-mode="private">
            <span><i class="fa-solid fa-user"></i></span><strong>Privat / Einzelperson</strong>
            <small>Eigene Arbeitszeit, Dienstplan, Statistik und Abwesenheiten verwalten.</small><em>Einfach starten</em>
          </button>
          <button type="button" data-select-mode="team">
            <span><i class="fa-solid fa-people-group"></i></span><strong>Team / Unternehmen</strong>
            <small>Zusätzlich Chat, Freigaben, Rollen und gemeinsame Schichtprozesse nutzen.</small><em>Für Organisationen</em>
          </button>
        </div>
        <p class="mode-privacy-note"><i class="fa-solid fa-shield-halved"></i> Deine Auswahl wird mit deinen übrigen TimeFlow-Einstellungen gespeichert.</p>
      </section>
    </dialog>
  `);

  settingsLayout.insertAdjacentHTML("afterbegin", `
    <section class="settings-card mode-settings-card" aria-labelledby="modeSettingsTitle">
      <header><span class="settings-card-icon blue"><i class="fa-solid fa-users-viewfinder"></i></span><div><small>Nutzungsart</small><h2 id="modeSettingsTitle">Mein TimeFlow</h2></div></header>
      <p class="settings-card-copy">Wähle, ob du nur deine eigene Arbeitszeit oder zusätzlich Teamprozesse verwalten möchtest.</p>
      <div class="mode-settings-options" role="radiogroup" aria-label="Nutzungsmodus">
        <button type="button" role="radio" data-mode-setting="private" aria-checked="false"><i class="fa-solid fa-user"></i><span><strong>Privat</strong><small>Nur meine Daten</small></span><b><i class="fa-solid fa-check"></i></b></button>
        <button type="button" role="radio" data-mode-setting="team" aria-checked="false"><i class="fa-solid fa-people-group"></i><span><strong>Team</strong><small>Gemeinsam arbeiten</small></span><b><i class="fa-solid fa-check"></i></b></button>
      </div>
      <p class="mode-current-note" id="modeCurrentNote"><i class="fa-solid fa-circle-info"></i><span>Modus wird geprüft.</span></p>
    </section>
  `);

  const dialog = document.getElementById("modeOnboarding");
  const note = document.getElementById("modeCurrentNote");
  const notificationButton = document.querySelector('[data-action="notifications"]');
  const notificationList = document.getElementById("notificationList");
  let runtimeSettings = {};
  let modeSelectionLocked = false;

  function readSettings() {
    try {
      const value = JSON.parse(window.TimeFlowPlatform.storage.getItem(SETTINGS_KEY));
      const stored = value && typeof value === "object" && !Array.isArray(value) ? value : {};
      runtimeSettings = { ...runtimeSettings, ...stored };
    } catch {
      // iPad-WebViews können lokalen Speicher einschränken. Die Auswahl bleibt
      // dann wenigstens für die aktuelle Sitzung erhalten.
    }
    return { ...runtimeSettings };
  }

  function writeSettings(settings) {
    runtimeSettings = { ...settings };
    try { window.TimeFlowPlatform.storage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch {
      // Der aktive Modus funktioniert auch ohne dauerhaften Browserspeicher.
    }
  }

  function currentMode() {
    const mode = readSettings().appMode;
    return mode === "private" || mode === "team" ? mode : null;
  }

  function textFor(selector, privateText, teamText) {
    const element = document.querySelector(selector);
    if (!element) return;
    if (!element.dataset.teamText) element.dataset.teamText = teamText || element.textContent.trim();
    element.textContent = document.documentElement.classList.contains("timeflow-private-mode") ? privateText : element.dataset.teamText;
  }

  function updateNotificationCount(mode) {
    if (!notificationList || !notificationButton) return;
    const items = [...notificationList.querySelectorAll(".notification-item")];
    const relevant = mode === "private" ? items.filter((item) => !item.classList.contains("chat") && !item.classList.contains("approval")) : items;
    const unread = relevant.filter((item) => !item.classList.contains("is-read")).length;
    const badge = notificationButton.querySelector(".notification-badge");
    if (badge) {
      badge.textContent = String(unread);
      badge.hidden = unread === 0;
    }
    notificationButton.setAttribute("aria-label", unread ? `${unread} ungelesene Benachrichtigungen` : "Keine ungelesenen Benachrichtigungen");
    const label = document.getElementById("notificationUnreadLabel");
    if (label) label.textContent = unread ? `${unread} ungelesen` : "Alles gelesen";
  }

  function adaptPeriodRows(mode) {
    document.querySelectorAll(".period-day").forEach((day) => {
      if (!day.dataset.teamHtml) day.dataset.teamHtml = day.innerHTML;
      if (mode === "team") {
        if (day.dataset.teamHtml) day.innerHTML = day.dataset.teamHtml;
        return;
      }
      const first = day.querySelector("p");
      day.querySelectorAll("p").forEach((row) => { row.hidden = row !== first; });
      if (first) {
        first.classList.add("active");
        const person = first.querySelector("span");
        if (person) person.textContent = "Mein Dienstplan";
      }
    });
  }

  function applyMode(mode) {
    const isPrivate = mode === "private";
    document.documentElement.classList.toggle("timeflow-private-mode", isPrivate);
    document.documentElement.classList.toggle("timeflow-team-mode", !isPrivate);
    document.body.dataset.appMode = mode;

    textFor(".subtitle", "Dein persönlicher Arbeitstag im Überblick.", "Schön, dass du da bist.");
    textFor('[data-target="schedule"] .nav-text', "Dienstplan", "Dienstpläne");
    textFor("#schedulePage .schedule-header h1", "Mein Dienstplan", "Dienstpläne");
    textFor(".quick-actions-card > header p", "Urlaub und Abwesenheiten persönlich festhalten.", "Wichtige Anliegen in wenigen Sekunden erledigen.");
    textFor('[data-quick-action="vacation"] strong', "Urlaub", "Urlaub");
    textFor('[data-quick-action="vacation"] small', "Persönlich eintragen", "Antrag stellen");
    textFor('[data-quick-action="sick"] strong', "Krankheit", "Krankmeldung");
    textFor('[data-quick-action="sick"] small', "Persönlich eintragen", "Abwesenheit melden");

    const personalApprovalText = document.querySelector(".for-you-card .list-row:nth-of-type(2) span:nth-child(2)");
    if (personalApprovalText) {
      if (!personalApprovalText.dataset.teamText) personalApprovalText.dataset.teamText = personalApprovalText.textContent.trim();
      personalApprovalText.textContent = isPrivate ? "Dein Urlaub ist im persönlichen Kalender eingetragen." : personalApprovalText.dataset.teamText;
    }

    const identityMeta = document.querySelector(".profile-identity > p");
    if (identityMeta) {
      if (!identityMeta.dataset.teamHtml) identityMeta.dataset.teamHtml = identityMeta.innerHTML;
      identityMeta.innerHTML = isPrivate ? '<span id="profileRole">Einzelperson</span> · <span id="profileDepartment">Private Nutzung</span>' : identityMeta.dataset.teamHtml;
    }

    adaptPeriodRows(mode);
    settingsPage.querySelectorAll("[data-mode-setting]").forEach((button) => {
      const selected = button.dataset.modeSetting === mode;
      button.setAttribute("aria-checked", String(selected));
      button.classList.toggle("is-selected", selected);
    });
    note.querySelector("span").textContent = isPrivate
      ? "Privatmodus aktiv: Teamfunktionen sind ausgeblendet, deine persönlichen Werkzeuge bleiben vollständig verfügbar."
      : "Teammodus aktiv: Kommunikation, Freigaben, Rollen und gemeinsame Abläufe sind sichtbar.";
    updateNotificationCount(mode);

    if (isPrivate && document.querySelector('[data-target="chat"]')?.classList.contains("active")) {
      document.querySelector('[data-target="home"]')?.click();
    }
    document.dispatchEvent(new CustomEvent("timeflow:mode-changed", { detail: { mode } }));
  }

  function saveMode(mode, announce = true) {
    if (mode !== "private" && mode !== "team") return;
    const settings = readSettings();
    settings.appMode = mode;
    writeSettings(settings);
    // Zuerst die Sperre entfernen: Selbst wenn eine nachgelagerte Anpassung auf
    // einem älteren WebView scheitert, bleibt der Nutzer nicht im Dialog hängen.
    if (dialog.open) window.TimeFlowPlatform.dialog.close(dialog);
    applyMode(mode);
    document.dispatchEvent(new CustomEvent("timeflow:settings-updated", { detail: { ...settings } }));
    if (announce) {
      const toast = document.getElementById("toast");
      if (toast) {
        toast.textContent = mode === "private" ? "Privatmodus ist jetzt aktiv." : "Teammodus ist jetzt aktiv.";
        toast.classList.add("is-visible");
        window.setTimeout(() => toast.classList.remove("is-visible"), 3200);
      }
    }
  }

  function selectModeFromEvent(event) {
    const button = event.target.closest?.("[data-select-mode]");
    if (!button || modeSelectionLocked || !dialog.open) return;
    modeSelectionLocked = true;
    saveMode(button.dataset.selectMode);
    window.setTimeout(() => { modeSelectionLocked = false; }, 350);
  }

  dialog.addEventListener("click", selectModeFromEvent);
  dialog.addEventListener("pointerup", (event) => {
    if (event.pointerType === "touch") selectModeFromEvent(event);
  });
  dialog.addEventListener("cancel", (event) => event.preventDefault());
  settingsPage.querySelectorAll("[data-mode-setting]").forEach((button) => button.addEventListener("click", () => saveMode(button.dataset.modeSetting)));
  document.addEventListener("timeflow:session-ready", (event) => {
    const mode = currentMode();
    if (mode) applyMode(mode);
    else if (event.detail?.source !== "platform" && !dialog.open) window.TimeFlowPlatform.dialog.open(dialog);
  });
  document.addEventListener("timeflow:sync-ready", () => {
    const mode = currentMode();
    if (mode) applyMode(mode);
    else if (!dialog.open) window.TimeFlowPlatform.dialog.open(dialog);
  });
  document.addEventListener("timeflow:profile-updated", () => {
    const identityMeta = document.querySelector(".profile-identity > p");
    if (identityMeta) delete identityMeta.dataset.teamHtml;
    applyMode(currentMode() || "team");
  });
  document.addEventListener("timeflow:open-settings", () => applyMode(currentMode() || "team"));
  if (notificationList) new MutationObserver(() => updateNotificationCount(currentMode() || "team")).observe(notificationList, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });

  const initialMode = currentMode();
  applyMode(initialMode || "team");
});

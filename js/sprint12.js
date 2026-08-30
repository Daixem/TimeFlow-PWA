"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const readinessCard = document.querySelector(".release-readiness-card");
  const profilePage = document.getElementById("profilePage");
  if (!readinessCard || !profilePage) return;

  const CHECK_KEY = "timeflow-device-check-v1";
  const BUILD = "0036";
  const heading = readinessCard.querySelector("header small");
  const title = readinessCard.querySelector("header h2");
  if (heading) heading.textContent = "Sprint 12 · Praxistest";
  if (title) title.textContent = "TimeFlow auf diesem Gerät";

  readinessCard.querySelector("[data-open-readiness-settings]")?.insertAdjacentHTML("beforebegin", `
    <button class="device-check-button" type="button" data-run-device-check>
      <i class="fa-solid fa-stethoscope"></i> Gerätecheck starten
    </button>
  `);

  document.body.insertAdjacentHTML("beforeend", `
    <dialog class="settings-dialog device-check-dialog" id="deviceCheckDialog" aria-labelledby="deviceCheckTitle">
      <header>
        <span><i class="fa-solid fa-mobile-screen-button"></i></span>
        <div><small>Version 1.0.1 · Build ${BUILD}</small><h2 id="deviceCheckTitle">Geräte- und PWA-Check</h2><p>TimeFlow prüft nur Funktionen dieses Geräts. Es werden keine persönlichen Inhalte übertragen.</p></div>
        <strong id="deviceCheckScore">–/8</strong>
      </header>
      <div class="device-check-progress" aria-hidden="true"><i id="deviceCheckProgress"></i></div>
      <ul class="device-check-list" id="deviceCheckList" aria-live="polite"></ul>
      <p class="device-check-summary" id="deviceCheckSummary">Prüfung wird vorbereitet.</p>
      <footer><button type="button" data-close-device-check>Schließen</button><button class="device-check-repeat" type="button" data-repeat-device-check><i class="fa-solid fa-rotate"></i> Erneut prüfen</button></footer>
    </dialog>
  `);

  document.body.insertAdjacentHTML("beforeend", `
    <dialog class="home-detail-dialog" id="homeDetailDialog" aria-labelledby="homeDetailTitle">
      <header><span id="homeDetailIcon"><i class="fa-solid fa-circle-info"></i></span><div><small id="homeDetailEyebrow">Hinweis</small><h2 id="homeDetailTitle">Details</h2></div><button type="button" data-close-home-detail aria-label="Schließen"><i class="fa-solid fa-xmark"></i></button></header>
      <div class="home-detail-content"><p id="homeDetailCopy"></p><dl id="homeDetailFacts"></dl></div>
      <footer><button type="button" data-close-home-detail>Schließen</button><button class="home-detail-action" type="button" id="homeDetailAction"></button></footer>
    </dialog>
  `);

  const dialog = document.getElementById("deviceCheckDialog");
  const list = document.getElementById("deviceCheckList");
  const score = document.getElementById("deviceCheckScore");
  const progress = document.getElementById("deviceCheckProgress");
  const summary = document.getElementById("deviceCheckSummary");
  const homeDetailDialog = document.getElementById("homeDetailDialog");
  const homeDetailIcon = document.getElementById("homeDetailIcon");
  const homeDetailEyebrow = document.getElementById("homeDetailEyebrow");
  const homeDetailTitle = document.getElementById("homeDetailTitle");
  const homeDetailCopy = document.getElementById("homeDetailCopy");
  const homeDetailFacts = document.getElementById("homeDetailFacts");
  const homeDetailAction = document.getElementById("homeDetailAction");
  let running = false;

  const homeDetails = {
    "vacation-countdown": { eyebrow: "Für dich · Information", title: "Dein Urlaub rückt näher", icon: "fa-umbrella-beach", copy: "Dein genehmigter Urlaub ist bereits in TimeFlow eingeplant. Diese Ansicht dient ausschließlich zur Information.", facts: [["Zeitraum", "15.–28. September 2026"], ["Dauer", "10 Urlaubstage"], ["Status", "Genehmigt"]], action: null, event: "info" },
    "vacation-approved": { eyebrow: "Für dich", title: "Urlaubsantrag genehmigt", icon: "fa-clipboard-check", copy: "Die Freigabe ist abgeschlossen. Du musst keinen neuen Antrag stellen.", facts: [["Antrag", "Erholungsurlaub"], ["Zeitraum", "15.–28. September 2026"], ["Freigabe", "Abteilungsleitung"]], action: "Urlaubsdetails öffnen", event: "vacation" },
    birthday: { eyebrow: "Team-Update", title: "Anna hat morgen Geburtstag", icon: "fa-cake-candles", copy: "Ein persönlicher Teamhinweis – ohne automatische Weiterleitung in den Chat.", facts: [["Kollegin", "Anna Müller"], ["Team", "Restaurant"], ["Termin", "Morgen"]], action: "Im Chat gratulieren", event: "chat" },
    anniversary: { eyebrow: "Team-Update", title: "10-jähriges Jubiläum", icon: "fa-award", copy: "Thomas feiert am Freitag zehn Jahre im Unternehmen.", facts: [["Kollege", "Thomas Becker"], ["Anlass", "10 Jahre TimeFlow-Team"], ["Termin", "Freitag"]], action: "Im Chat gratulieren", event: "chat" }
  };

  function openHomeDetail(id) {
    const detail = homeDetails[id];
    if (!detail) return;
    homeDetailEyebrow.textContent = detail.eyebrow;
    homeDetailTitle.textContent = detail.title;
    homeDetailCopy.textContent = detail.copy;
    homeDetailIcon.innerHTML = `<i class="fa-solid ${detail.icon}"></i>`;
    homeDetailFacts.replaceChildren(...detail.facts.map(([label, value]) => {
      const row = document.createElement("div");
      row.innerHTML = `<dt>${label}</dt><dd>${value}</dd>`;
      return row;
    }));
    homeDetailAction.textContent = detail.action || "";
    homeDetailAction.dataset.detailEvent = detail.event;
    homeDetailAction.hidden = !detail.action;
    homeDetailDialog.className = `home-detail-dialog is-${detail.event}${detail.action ? "" : " has-no-action"}`;
    window.TimeFlowPlatform.dialog.open(homeDetailDialog);
  }

  const pageModes = ["schedule-mode", "chat-mode", "profile-mode", "clock-mode", "settings-mode"];
  const pageElements = {
    schedule: "schedulePage",
    chat: "chatPage",
    profile: "profilePage",
    clock: "clockPage",
    settings: "settingsPage"
  };

  function enforcePageState(requestedPage = "home") {
    const dashboard = document.getElementById("dashboard");
    const app = document.querySelector(".app");
    const privateMode = document.documentElement.classList.contains("timeflow-private-mode");
    const page = requestedPage === "chat" && privateMode ? "home" : requestedPage;
    if (!dashboard || !app) return;

    dashboard.classList.remove(...pageModes);
    if (page !== "home") dashboard.classList.add(`${page}-mode`);
    Object.entries(pageElements).forEach(([name, id]) => {
      document.getElementById(id)?.classList.toggle("hidden", name !== page);
    });
    app.classList.toggle("subpage-mode", page !== "home");
    document.querySelectorAll(".nav-item").forEach((item) => {
      const active = item.dataset.target === page;
      item.classList.toggle("active", active);
      if (active) item.setAttribute("aria-current", "page");
      else item.removeAttribute("aria-current");
    });
    document.documentElement.dataset.timeflowPage = page;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  function settlePageState(page) {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => enforcePageState(page)));
  }

  function parseJson(value, fallback = {}) {
    try { return JSON.parse(value) ?? fallback; } catch { return fallback; }
  }

  function result(label, detail, passed, advisory = false, icon = "fa-circle-check", action = null) {
    return { label, detail, passed: Boolean(passed), advisory, icon, action };
  }

  async function serviceWorkerResult() {
    if (!("serviceWorker" in navigator)) return result("Offline-App", "Auf diesem Browser nicht verfügbar", false, false, "fa-cloud-slash");
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.update().catch(() => undefined);
      return result("Offline-App", navigator.serviceWorker.controller ? "Aktiver App-Cache" : "Nach einem Neustart vollständig aktiv", true, false, "fa-cloud-arrow-down");
    } catch {
      return result("Offline-App", "Service Worker konnte nicht gestartet werden", false, false, "fa-cloud-slash");
    }
  }

  async function storageResult() {
    try {
      const storage = window.TimeFlowPlatform?.storage;
      if (!storage) throw new Error("storage_unavailable");
      const probe = `timeflow-check-${Date.now()}`;
      storage.setItem(probe, "ok");
      const usable = storage.getItem(probe) === "ok";
      storage.removeItem(probe);
      if (!usable) throw new Error("storage_failed");
      if (typeof storage.isPersistent === "function" && !storage.isPersistent()) {
        return result("Datenspeicher", "Sitzungsspeicher aktiv – dauerhaftes Speichern blockiert", false, true, "fa-database");
      }
      let estimate;
      try { estimate = await navigator.storage?.estimate?.(); } catch { estimate = undefined; }
      const used = Number(estimate?.usage || 0);
      const quota = Number(estimate?.quota || 0);
      const detail = quota ? `${Math.max(1, Math.round(used / 1048576))} von ${Math.max(1, Math.round(quota / 1048576))} MB belegt` : "Lokaler Speicher verfügbar";
      return result("Datenspeicher", detail, true, false, "fa-database");
    } catch {
      return result("Datenspeicher", "Lokales Speichern ist blockiert", false, false, "fa-database");
    }
  }

  function layoutResult() {
    const viewport = `${Math.round(window.innerWidth)} × ${Math.round(window.innerHeight)} px`;
    const fits = document.documentElement.scrollWidth <= window.innerWidth + 1 && window.innerWidth >= 320;
    return result("Mobile Darstellung", fits ? `${viewport}, ohne seitliches Überlaufen` : `${viewport}, Darstellung prüfen`, fits, false, "fa-maximize");
  }

  function modeResult() {
    const mode = parseJson(window.TimeFlowPlatform.storage.getItem("timeflow-settings-v1"), {}).appMode;
    const valid = mode === "private" || mode === "team";
    return result("Nutzungsmodus", valid ? `${mode === "private" ? "Privat" : "Team"} ist gespeichert` : "Antippen und Privat oder Team auswählen", valid, false, "fa-users-viewfinder", valid ? null : "mode");
  }

  function backupResult() {
    const value = window.TimeFlowPlatform.storage.getItem("timeflow-last-backup-v1");
    const date = value ? new Date(value) : null;
    const valid = date && !Number.isNaN(date.valueOf());
    return result("Datensicherung", valid ? `Gesichert am ${date.toLocaleDateString("de-DE")}` : "Backup vor dem Praxistest empfohlen", Boolean(valid), true, "fa-box-archive");
  }

  function syncResult() {
    const card = document.querySelector(".cloud-sync-card");
    const synced = card?.classList.contains("is-synced");
    const local = card?.classList.contains("is-local");
    const ready = synced || local;
    return result("Datenabgleich", synced ? "Private Cloud-Sicherung aktiv" : local ? "Lokaler Betrieb aktiv" : navigator.onLine ? "Abgleich wird noch geprüft" : "Offline – später erneut prüfen", ready, true, "fa-arrows-rotate");
  }

  function connectionResult() {
    return result("Verbindung", navigator.onLine ? "Online und bereit für Updates" : "Offline-Modus aktiv", true, true, navigator.onLine ? "fa-wifi" : "fa-plane");
  }

  function securityResult() {
    const secure = window.isSecureContext || ["localhost", "127.0.0.1"].includes(location.hostname);
    return result("Sichere Ausführung", secure ? "Geschützter App-Kontext" : "Für Installation ist HTTPS erforderlich", secure, false, "fa-shield-halved");
  }

  function render(results) {
    list.replaceChildren(...results.map((item) => {
      const row = document.createElement("li");
      row.className = item.passed ? "is-passed" : item.advisory ? "is-advisory" : "is-failed";
      row.innerHTML = `<span><i class="fa-solid ${item.icon}"></i></span><div><strong>${item.label}</strong><small>${item.detail}</small></div><em>${item.passed ? "Bereit" : item.advisory ? "Hinweis" : "Prüfen"}</em>`;
      if (item.action === "mode") {
        row.classList.add("is-actionable");
        row.tabIndex = 0;
        row.setAttribute("role", "button");
        row.setAttribute("aria-label", "Nutzungsmodus auswählen");
        const openMode = () => {
          window.TimeFlowPlatform.dialog.close(dialog);
          document.dispatchEvent(new CustomEvent("timeflow:open-mode-selection"));
        };
        row.addEventListener("click", openMode);
        row.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openMode(); }
        });
      }
      return row;
    }));
    const passed = results.filter((item) => item.passed).length;
    const criticalFailed = results.some((item) => !item.passed && !item.advisory);
    score.textContent = `${passed}/8`;
    progress.style.width = `${passed * 12.5}%`;
    summary.className = `device-check-summary ${criticalFailed ? "is-warning" : "is-ready"}`;
    summary.innerHTML = criticalFailed
      ? '<i class="fa-solid fa-triangle-exclamation"></i> Mindestens eine wichtige Gerätefunktion benötigt Aufmerksamkeit.'
      : '<i class="fa-solid fa-circle-check"></i> Die wichtigen PWA-Funktionen sind auf diesem Gerät einsatzbereit.';
    window.TimeFlowPlatform.storage.setItem(CHECK_KEY, JSON.stringify({ build: BUILD, checkedAt: new Date().toISOString(), passed, criticalFailed }));
  }

  async function runCheck() {
    if (running) return;
    running = true;
    list.innerHTML = '<li class="is-running"><span><i class="fa-solid fa-spinner"></i></span><div><strong>Prüfung läuft</strong><small>Gerätefunktionen werden nacheinander geprüft.</small></div></li>';
    score.textContent = "…";
    progress.style.width = "12%";
    summary.textContent = "TimeFlow prüft Installation, Offline-Betrieb und lokale Datensicherheit.";
    const results = [
      securityResult(),
      await serviceWorkerResult(),
      await storageResult(),
      layoutResult(),
      modeResult(),
      backupResult(),
      syncResult(),
      connectionResult()
    ];
    render(results);
    running = false;
  }

  readinessCard.querySelector("[data-run-device-check]")?.addEventListener("click", () => {
    window.TimeFlowPlatform.dialog.open(dialog);
    runCheck();
  });
  dialog.querySelector("[data-repeat-device-check]").addEventListener("click", runCheck);
  dialog.querySelector("[data-close-device-check]").addEventListener("click", () => window.TimeFlowPlatform.dialog.close(dialog));
  dialog.addEventListener("click", (event) => { if (event.target === dialog) window.TimeFlowPlatform.dialog.close(dialog); });
  document.addEventListener("timeflow:open-home-detail", (event) => openHomeDetail(event.detail?.id));
  homeDetailDialog.querySelectorAll("[data-close-home-detail]").forEach((button) => button.addEventListener("click", () => window.TimeFlowPlatform.dialog.close(homeDetailDialog)));
  homeDetailDialog.addEventListener("click", (event) => { if (event.target === homeDetailDialog) window.TimeFlowPlatform.dialog.close(homeDetailDialog); });
  homeDetailAction.addEventListener("click", () => {
    const action = homeDetailAction.dataset.detailEvent;
    window.TimeFlowPlatform.dialog.close(homeDetailDialog);
    if (action === "chat") document.dispatchEvent(new CustomEvent("timeflow:open-chat"));
    if (action === "vacation") document.dispatchEvent(new CustomEvent("timeflow:open-quick-actions", { detail: { action: "history" } }));
  });
  document.querySelectorAll(".nav-item[data-target]").forEach((item) => item.addEventListener("click", () => settlePageState(item.dataset.target)));
  document.addEventListener("timeflow:open-chat", () => settlePageState("chat"));
  document.addEventListener("timeflow:open-profile", () => settlePageState("profile"));
  document.addEventListener("timeflow:open-month-statistics", () => {
    settlePageState("profile");
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      document.querySelector('[data-stat-period="month"]')?.click();
      document.querySelector(".statistics-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }));
  });
  document.addEventListener("timeflow:open-clock", () => settlePageState("clock"));
  document.addEventListener("timeflow:open-settings", () => settlePageState("settings"));
  document.addEventListener("timeflow:open-notifications", () => settlePageState("home"));
  window.addEventListener("pageshow", () => {
    const activePage = document.querySelector(".nav-item.active")?.dataset.target || "home";
    settlePageState(activePage);
    document.dispatchEvent(new CustomEvent("timeflow:device-resumed"));
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      const activePage = document.documentElement.dataset.timeflowPage || document.querySelector(".nav-item.active")?.dataset.target || "home";
      settlePageState(activePage);
      document.dispatchEvent(new CustomEvent("timeflow:device-resumed"));
    }
  });
});

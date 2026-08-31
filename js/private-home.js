"use strict";

if (!document.querySelector('link[data-private-schedule-import]')) {
  const importStyle = document.createElement("link");
  importStyle.rel = "stylesheet";
  importStyle.href = "css/private-schedule-import.css?v=0040-plan8";
  importStyle.dataset.privateScheduleImport = "true";
  document.head.append(importStyle);
  const savedStyle = document.createElement("link");
  savedStyle.rel = "stylesheet";
  savedStyle.href = "css/private-schedule-saved.css?v=0040-plan8";
  savedStyle.dataset.privateScheduleImport = "saved";
  document.head.append(savedStyle);
  const correctionStyle = document.createElement("link");
  correctionStyle.rel = "stylesheet";
  correctionStyle.href = "css/private-schedule-corrections.css?v=0040-plan8";
  correctionStyle.dataset.privateScheduleImport = "corrections";
  document.head.append(correctionStyle);
  const learningStyle = document.createElement("link");
  learningStyle.rel = "stylesheet";
  learningStyle.href = "css/private-schedule-learning.css?v=0040-plan8";
  learningStyle.dataset.privateScheduleImport = "learning";
  document.head.append(learningStyle);
  const privateViewStyle = document.createElement("link");
  privateViewStyle.rel = "stylesheet";
  privateViewStyle.href = "css/private-schedule-private-view.css?v=0040-plan8";
  privateViewStyle.dataset.privateScheduleImport = "private-view";
  document.head.append(privateViewStyle);
}
if (!document.querySelector('script[data-private-schedule-import]')) {
  const importScript = document.createElement("script");
  importScript.src = "js/private-schedule-import.js?v=0040-plan8";
  importScript.dataset.privateScheduleImport = "true";
  document.head.append(importScript);
}

document.addEventListener("DOMContentLoaded", () => {
  const dashboard = document.getElementById("dashboard");
  const clockButton = document.getElementById("clockButton");
  const monthCard = dashboard?.querySelector(".month-card");
  const shiftGrid = dashboard?.querySelector(".shift-grid");
  if (!dashboard || !clockButton || !monthCard || !shiftGrid) return;

  const originalShiftAnchor = document.createComment("timeflow-shift-position");
  shiftGrid.before(originalShiftAnchor);

  clockButton.insertAdjacentHTML("afterend", `
    <section class="private-home-clock" aria-label="Arbeitszeitdetails für heute">
      <header><div><small>HEUTE IM ÜBERBLICK · ZEITERFASSUNG</small><strong>Deine heutige Schicht</strong></div><span id="privateHomeState">Bereit</span></header>
      <div class="private-home-timeline"><span><small>BEGONNEN</small><strong id="privateHomeStart">--:--</strong></span><span><small>PAUSE</small><strong id="privateHomeBreak">30 Min.</strong></span><span><small>GEPLANT BIS</small><strong id="privateHomePlannedEnd">--:--</strong></span></div>
      <div class="private-home-summary"><span><i class="fa-solid fa-hourglass-half"></i><span><small>NETTOZEIT</small><b id="privateHomeNet">0 h 0 min</b></span></span><span><i class="fa-solid fa-mug-hot"></i><span><small>PAUSE</small><b id="privateHomeBreakUsed">0 min</b></span></span><span><i class="fa-solid fa-bullseye"></i><span><small>TAGESZIEL</small><b id="privateHomeTarget">8 h 0 min</b></span></span></div>
    </section>`);
  const privateClock = dashboard.querySelector(".private-home-clock");

  monthCard.querySelector(".month-stats")?.insertAdjacentHTML("afterend", `
    <button class="private-home-account" type="button" aria-label="Arbeitszeitkonto in der ausführlichen Statistik öffnen">
      <span class="private-home-account-title"><i class="fa-solid fa-wallet"></i><span><small>ARBEITSZEITKONTO</small><strong>Aktueller Stand</strong></span></span>
      <span><small>ERFASST HEUTE</small><strong id="privateAccountCaptured">0 h 0 min</strong></span>
      <span><small>IN PRÜFUNG</small><strong>0 h 0 min</strong></span>
      <span><small>ÜBERSTUNDEN</small><strong class="positive" id="privateAccountOvertime">0 h 0 min</strong></span>
      <i class="fa-solid fa-chevron-right"></i>
    </button>`);

  document.body.insertAdjacentHTML("beforeend", `
    <nav class="private-quick-nav" aria-label="Navigation für die Einzelnutzung">
      <button class="active" type="button" data-private-target="home"><i class="fa-solid fa-house"></i><span>Home</span></button>
      <button type="button" data-private-target="schedule"><i class="fa-regular fa-calendar"></i><span>Dienstpläne</span></button>
      <button class="private-quick-main" type="button" data-private-quick><i class="fa-solid fa-plus"></i><span>Schnellzugriff</span></button>
      <button type="button" data-private-target="profile"><i class="fa-regular fa-user"></i><span>Profil</span></button>
    </nav>
    <dialog class="private-home-dialog" id="privateHomeQuickDialog" aria-labelledby="privateHomeQuickTitle">
      <header><div><small>SCHNELLZUGRIFF</small><h2 id="privateHomeQuickTitle">Was möchtest du öffnen?</h2><p>Die Zeiterfassung bleibt direkt auf dem Home-Screen.</p></div><button type="button" data-private-quick-close aria-label="Schließen"><i class="fa-solid fa-xmark"></i></button></header>
      <section><button type="button" data-private-action="notifications"><i class="fa-regular fa-bell"></i><span><small>HINWEISE UND ERINNERUNGEN</small><strong>Mitteilungen</strong></span><i class="fa-solid fa-chevron-right"></i></button><button type="button" data-private-action="account"><i class="fa-solid fa-wallet"></i><span><small>ZEITEN UND MONATSWERTE</small><strong>Arbeitszeitkonto</strong></span><i class="fa-solid fa-chevron-right"></i></button><button type="button" data-private-action="settings"><i class="fa-solid fa-gear"></i><span><small>APP UND DATENSICHERUNG</small><strong>Einstellungen</strong></span><i class="fa-solid fa-chevron-right"></i></button></section>
    </dialog>`);

  const privateNav = document.querySelector(".private-quick-nav");
  const quickDialog = document.getElementById("privateHomeQuickDialog");
  const number = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const formatMinutes = (minutes) => `${Math.floor(minutes / 60)} h ${minutes % 60} min`;

  function readJson(key) {
    try { return JSON.parse(window.TimeFlowPlatform.storage.getItem(key)); } catch { return null; }
  }
  function renderPrivateClock() {
    const workday = readJson("timeflow-workday-v2");
    const settings = readJson("timeflow-settings-v1") || {};
    const target = number(settings.dailyTargetMinutes, 480);
    const breakAfter = number(settings.autoBreakAfterMinutes, 360);
    const breakLength = number(settings.autoBreakMinutes, 30);
    const start = workday?.workStart ? new Date(workday.workStart) : null;
    const end = workday?.isWorking ? new Date() : workday?.workEnd ? new Date(workday.workEnd) : null;
    const gross = start && end ? Math.max(0, Math.floor((end - start) / 60000)) : 0;
    const usedBreak = gross >= breakAfter ? breakLength : 0;
    const net = Math.max(0, gross - usedBreak);
    document.getElementById("privateHomeStart").textContent = start ? start.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "--:--";
    document.getElementById("privateHomeBreak").textContent = `${breakLength} Min.`;
    document.getElementById("privateHomeBreakUsed").textContent = `${usedBreak} min`;
    document.getElementById("privateHomeNet").textContent = formatMinutes(net);
    document.getElementById("privateHomeTarget").textContent = formatMinutes(target);
    document.getElementById("privateAccountCaptured").textContent = formatMinutes(net);
    document.getElementById("privateAccountOvertime").textContent = formatMinutes(Math.max(0, net - target));
    document.getElementById("privateHomeState").textContent = workday?.isWorking ? "Im Dienst" : start ? "Dienst beendet" : "Bereit";
    const nextShift = document.querySelectorAll(".shift-card")[1]?.querySelector("strong")?.textContent.match(/(\d{2}:\d{2})\s*[–-]\s*(\d{2}:\d{2})/);
    document.getElementById("privateHomePlannedEnd").textContent = nextShift?.[2] || "--:--";
  }
  function applyPrivateHome() {
    const isPrivate = document.documentElement.classList.contains("timeflow-private-mode") || document.body.dataset.appMode === "private";
    if (isPrivate) {
      privateClock.insertAdjacentElement("afterend", shiftGrid);
    } else if (originalShiftAnchor.parentNode) {
      originalShiftAnchor.after(shiftGrid);
    }
  }

  privateNav.querySelectorAll("[data-private-target]").forEach((button) => button.addEventListener("click", () => {
    privateNav.querySelectorAll("[data-private-target]").forEach((item) => item.classList.toggle("active", item === button));
    document.querySelector(`.bottom-nav [data-target="${button.dataset.privateTarget}"]`)?.click();
  }));
  privateNav.querySelector("[data-private-quick]").addEventListener("click", () => window.TimeFlowPlatform.dialog.open(quickDialog));
  quickDialog.querySelector("[data-private-quick-close]").addEventListener("click", () => window.TimeFlowPlatform.dialog.close(quickDialog));
  quickDialog.addEventListener("click", (event) => { if (event.target === quickDialog) window.TimeFlowPlatform.dialog.close(quickDialog); });
  quickDialog.querySelectorAll("[data-private-action]").forEach((button) => button.addEventListener("click", () => {
    window.TimeFlowPlatform.dialog.close(quickDialog);
    if (button.dataset.privateAction === "notifications") document.querySelector('[data-action="notifications"]')?.click();
    if (button.dataset.privateAction === "account") monthCard.querySelector('[data-action="month"]')?.click();
    if (button.dataset.privateAction === "settings") document.dispatchEvent(new CustomEvent("timeflow:open-settings"));
  }));
  monthCard.querySelector(".private-home-account")?.addEventListener("click", () => monthCard.querySelector('[data-action="month"]')?.click());

  renderPrivateClock();
  applyPrivateHome();
  document.addEventListener("timeflow:workday-updated", renderPrivateClock);
  document.addEventListener("timeflow:settings-updated", renderPrivateClock);
  document.addEventListener("timeflow:mode-changed", applyPrivateHome);
  new MutationObserver(applyPrivateHome).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  window.setInterval(renderPrivateClock, 30000);
});

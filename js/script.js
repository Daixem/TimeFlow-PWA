"use strict";

const STORAGE_KEY = "timeflow-workday-v2";
const SETTINGS_STORAGE_KEY = "timeflow-settings-v1";
const TARGET_WORK_MINUTES = 480;
const BREAK_AFTER_MINUTES = 360;
const AUTO_BREAK_MINUTES = 30;

const $ = (id) => document.getElementById(id);
const elements = {
  greeting: $("greeting"), currentDate: $("currentDate"), currentTime: $("currentTime"),
  dailyQuote: $("dailyQuote"), clockButton: $("clockButton"), clockIcon: $("clockIcon"),
  workStatus: $("workStatus"), clockHint: $("clockHint"), startTime: $("startTime"), endTime: $("endTime"),
  todayHours: $("todayHours"), todayBreak: $("todayBreak"), todayOvertime: $("todayOvertime"),
  todayTarget: $("todayTarget"), progressCircle: $("progressCircle"), progressLabel: $("progressLabel"),
  vacationCountdown: $("vacationCountdown"), teamNews: $("teamNews"), toast: $("toast")
};

let state = { isWorking: false, workStart: null, workEnd: null };
let workTimer;

const quotes = [
  "Erfolg entsteht nicht durch Perfektion, sondern durch Beständigkeit.",
  "Jeder kleine Fortschritt bringt dich deinem Ziel näher.",
  "Heute ist die beste Gelegenheit, etwas Großartiges zu schaffen.",
  "Konzentriere dich auf Lösungen, nicht auf Probleme.",
  "Aus kleinen Schritten entstehen große Erfolge.",
  "Dein Einsatz macht den Unterschied."
];
const teamUpdates = [
  "Heute stehen keine persönlichen Erinnerungen oder offenen Aufgaben an.",
  "Denk daran, deine Arbeitszeit am Ende des Tages zu prüfen.",
  "Dein Team freut sich auf die nächste Zusammenarbeit."
];

function dateKey(date) { return date.toLocaleDateString("sv-SE"); }
function formatTime(date) { return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }); }
function formatMinutes(minutes) { return `${Math.floor(minutes / 60)} h ${minutes % 60} min`; }
function elapsedMinutes() {
  if (!state.workStart) return 0;
  const end = state.isWorking ? new Date() : state.workEnd;
  return end ? Math.max(0, Math.floor((end - state.workStart) / 60000)) : 0;
}
function timeSettings() {
  try {
    const saved = JSON.parse(window.TimeFlowPlatform.storage.getItem(SETTINGS_STORAGE_KEY));
    return {
      dailyTargetMinutes: Number(saved?.dailyTargetMinutes) || TARGET_WORK_MINUTES,
      autoBreakMinutes: Number.isFinite(Number(saved?.autoBreakMinutes)) ? Number(saved.autoBreakMinutes) : AUTO_BREAK_MINUTES,
      autoBreakAfterMinutes: Number(saved?.autoBreakAfterMinutes) || BREAK_AFTER_MINUTES
    };
  } catch {
    return { dailyTargetMinutes: TARGET_WORK_MINUTES, autoBreakMinutes: AUTO_BREAK_MINUTES, autoBreakAfterMinutes: BREAK_AFTER_MINUTES };
  }
}
function breakMinutes() {
  const settings = timeSettings();
  return elapsedMinutes() >= settings.autoBreakAfterMinutes ? settings.autoBreakMinutes : 0;
}
function workedMinutes() { return Math.max(0, elapsedMinutes() - breakMinutes()); }

function saveWorkday() {
  window.TimeFlowPlatform.storage.setItem(STORAGE_KEY, JSON.stringify({ ...state, workStart: state.workStart?.toISOString() || null, workEnd: state.workEnd?.toISOString() || null }));
}
function loadWorkday() {
  try {
    const saved = JSON.parse(window.TimeFlowPlatform.storage.getItem(STORAGE_KEY));
    if (!saved?.workStart) return;
    const start = new Date(saved.workStart);
    const now = new Date();
    if (Number.isNaN(start.valueOf()) || start > now) { window.TimeFlowPlatform.storage.removeItem(STORAGE_KEY); return; }
    // Eine aktive Schicht darf beim Tageswechsel oder nach dem Wiederöffnen der
    // PWA nicht verloren gehen. Abgeschlossene Vortage werden weiterhin entfernt.
    if (dateKey(start) !== dateKey(now) && !saved.isWorking) { window.TimeFlowPlatform.storage.removeItem(STORAGE_KEY); return; }
    state = { isWorking: Boolean(saved.isWorking), workStart: start, workEnd: saved.workEnd ? new Date(saved.workEnd) : null };
  } catch { window.TimeFlowPlatform.storage.removeItem(STORAGE_KEY); }
}

function updateDateTime() {
  const now = new Date();
  const homeMonthLabel = document.getElementById("homeMonthLabel");
  if (homeMonthLabel) homeMonthLabel.textContent = now.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
  elements.currentDate.textContent = now.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  elements.currentTime.textContent = now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const monthButton = document.querySelector(".month-card .month-header button");
  if (monthButton) monthButton.innerHTML = `${now.toLocaleDateString("de-DE", { month: "long", year: "numeric" })} <i class="fa-solid fa-chevron-right"></i>`;
  const workdayNear = (direction) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    do { date.setDate(date.getDate() + direction); } while ([0, 6].includes(date.getDay()));
    return date;
  };
  const shiftCards = document.querySelectorAll(".shift-card");
  const previousWorkday = workdayNear(-1);
  const nextWorkday = workdayNear(1);
  if (shiftCards[0]) shiftCards[0].querySelector("p").textContent = previousWorkday.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
  if (shiftCards[1]) shiftCards[1].querySelector("p").textContent = nextWorkday.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
  const hour = now.getHours();
  elements.greeting.textContent = hour < 12 && hour >= 5 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend";
}
function updateWorkUi() {
  const targetMinutes = timeSettings().dailyTargetMinutes;
  const worked = workedMinutes(); const pause = breakMinutes(); const percentage = Math.min(100, Math.round((worked / targetMinutes) * 100));
  elements.startTime.textContent = state.workStart ? formatTime(state.workStart) : "--:--";
  elements.endTime.textContent = state.workEnd ? formatTime(state.workEnd) : "--:--";
  elements.workStatus.textContent = state.isWorking ? "Im Dienst" : "Nicht im Dienst";
  elements.clockHint.textContent = state.isWorking ? "Tippen zum Ausstempeln" : "Tippen zum Einstempeln";
  elements.clockButton.classList.toggle("is-working", state.isWorking);
  elements.clockButton.setAttribute("aria-pressed", String(state.isWorking));
  elements.clockIcon.className = `fa-solid ${state.isWorking ? "fa-right-from-bracket" : "fa-right-to-bracket"}`;
  elements.todayHours.textContent = formatMinutes(worked);
  elements.todayBreak.textContent = `${pause} min`;
  elements.todayOvertime.textContent = formatMinutes(Math.max(0, worked - targetMinutes));
  elements.todayTarget.textContent = formatMinutes(targetMinutes);
  elements.progressCircle.textContent = `${percentage}%`;
  elements.progressCircle.style.setProperty("--progress", `${percentage * 3.6}deg`);
  elements.progressCircle.setAttribute("aria-valuenow", String(percentage));
  elements.progressLabel.textContent = percentage >= 100 ? "Ziel erreicht" : "Tagesziel";
  document.dispatchEvent(new CustomEvent("timeflow:workday-updated"));
}
function clockIn() { state = { isWorking: true, workStart: new Date(), workEnd: null }; saveWorkday(); startTimer(); updateWorkUi(); showToast("Du bist eingestempelt."); }
function clockOut() { state.isWorking = false; state.workEnd = new Date(); saveWorkday(); stopTimer(); updateWorkUi(); showToast("Du bist ausgestempelt."); }
function startTimer() { stopTimer(); workTimer = window.setInterval(updateWorkUi, 1000); }
function stopTimer() { if (workTimer) window.clearInterval(workTimer); workTimer = undefined; }
function showToast(message) { elements.toast.textContent = message; elements.toast.classList.add("is-visible"); window.clearTimeout(showToast.timer); showToast.timer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 3200); }
function navigate(target) {
  document.querySelectorAll(".nav-item").forEach((item) => { const active = item.dataset.target === target; item.classList.toggle("active", active); item.toggleAttribute("aria-current", active); });
  if (target === "home") window.scrollTo({ top: 0, behavior: "smooth" });
  else if (target === "schedule" || target === "chat" || target === "profile") return;
  else if (target === "clock") { elements.clockButton.scrollIntoView({ behavior: "smooth", block: "center" }); elements.clockButton.focus({ preventScroll: true }); }
  else showToast(`${({ profile: "Profil" })[target]} folgt in einem nächsten Sprint.`);
}
function initialise() {
  loadWorkday(); updateDateTime();
  const day = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  elements.dailyQuote.textContent = quotes[day % quotes.length];
  elements.teamNews.textContent = teamUpdates[day % teamUpdates.length];
  const now = new Date();
  let vacation = new Date(now.getFullYear(), now.getMonth(), 15);
  if (vacation <= now) vacation = new Date(now.getFullYear(), now.getMonth() + 1, 15);
  const days = Math.max(1, Math.ceil((vacation - now) / 86400000));
  elements.vacationCountdown.textContent = days === 1 ? "1 Tag" : `${days} Tage`;
  updateWorkUi(); if (state.isWorking) startTimer();
  elements.clockButton.addEventListener("click", () => document.dispatchEvent(new CustomEvent("timeflow:open-clock")));
  document.querySelectorAll(".nav-item").forEach((item) => item.addEventListener("click", () => navigate(item.dataset.target)));
  document.querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.action === "team") {
      document.dispatchEvent(new CustomEvent("timeflow:open-chat"));
      return;
    }
    if (button.dataset.action === "home-detail") {
      document.dispatchEvent(new CustomEvent("timeflow:open-home-detail", { detail: { id: button.dataset.detail } }));
      return;
    }
    if (button.dataset.action === "profile") {
      document.dispatchEvent(new CustomEvent("timeflow:open-profile"));
      return;
    }
    if (button.dataset.action === "approvals") {
      document.dispatchEvent(new CustomEvent("timeflow:open-quick-actions", { detail: { action: "history" } }));
      return;
    }
    if (button.dataset.action === "vacation") {
      document.dispatchEvent(new CustomEvent("timeflow:open-quick-actions", { detail: { action: "vacation" } }));
      return;
    }
    if (button.dataset.action === "month") {
      document.dispatchEvent(new CustomEvent("timeflow:open-month-statistics"));
      return;
    }
    if (button.dataset.action === "notifications") {
      document.dispatchEvent(new CustomEvent("timeflow:open-notifications"));
      return;
    }
    showToast("Diese Ansicht folgt in einem nächsten Sprint.");
  }));
  window.setInterval(updateDateTime, 1000);
}
document.addEventListener("DOMContentLoaded", initialise);
document.addEventListener("timeflow:toggle-clock", () => state.isWorking ? clockOut() : clockIn());
document.addEventListener("timeflow:settings-updated", updateWorkUi);
document.addEventListener("timeflow:device-resumed", () => { loadWorkday(); updateDateTime(); updateWorkUi(); if (state.isWorking) startTimer(); });

document.addEventListener("DOMContentLoaded", () => {
  const dashboard = document.getElementById("dashboard");
  const scheduleNav = document.querySelector('[data-target="schedule"]');
  const homeNav = document.querySelector('[data-target="home"]');
  if (!dashboard || !scheduleNav || !homeNav) return;
  scheduleNav.querySelector(".nav-text").textContent = "Dienstpläne";
  const team = [["AM","07:00 – 15:00","Anna Müller"],["MM","07:30 – 15:00","Max Mustermann (Du)"],["TB","08:00 – 16:30","Thomas Becker"],["JS","09:00 – 17:30","Julia Schneider"],["MW","10:00 – 18:30","Michael Wagner"]];
  const teamRows = team.map((row, i) => `<div class="team-person ${i === 1 ? "active" : ""}"><b>${row[0]}</b><time>${row[1]}</time><span>${row[2]}</span></div>`).join("");
  const week = [["Mo.","27.07.","07:30 – 15:00","Frühschicht","green","8:00 h"],["Di.","28.07.","07:30 – 15:00","Frühschicht","green active","8:00 h"],["Mi.","29.07.","12:00 – 20:30","Spätschicht","orange","8:00 h"],["Do.","30.07.","● Frei","","free","—"],["Fr.","31.07.","07:30 – 15:00","Frühschicht","green","8:00 h"],["Sa.","01.08.","🌴 Urlaub","","vacation","Urlaubstag"],["So.","02.08.","● Frei","","free","—"]];
  const weekRows = week.map((row) => `<div class="week-row ${row[4]}"><b>${row[0]}<small>${row[1]}</small></b><i></i><span>${row[2]}<small>${row[3]}</small></span>${row[3] ? '<em>AM MM TB +3</em>' : ''}<strong>${row[5]}</strong>${row[3] ? '<i class="fa-solid fa-chevron-right arrow"></i>' : ''}</div>`).join("");
  const types = ["muted","muted","green","orange","red","blue","free","green","green","green","green","orange","blue","free","green","green","green","green","orange","blue","free","green","red","green","green","orange","free","free","green","selected green","green","green","red","muted","muted"];
  const monthDays = types.map((type, i) => `<span class="${type}">${i < 2 ? 29 + i : i < 33 ? i - 1 : i - 32}</span>`).join("");
  dashboard.insertAdjacentHTML("beforeend", `<section id="schedulePage" class="schedule-page hidden"><header class="schedule-header"><h1>Dienstpläne</h1><button><i class="fa-regular fa-calendar"></i></button></header><div class="schedule-tabs"><button data-view="day" aria-selected="true">Tag</button><button data-view="week">Woche</button><button data-view="month">Monat</button><button data-view="period">Zeitraum</button></div><div class="schedule-view" data-panel="day"><div class="date-switch"><button><i class="fa-solid fa-chevron-left"></i></button><span><i class="fa-regular fa-calendar"></i> Dienstag, 28. Juli 2026 <small>Heute</small></span><button><i class="fa-solid fa-chevron-right"></i></button></div><article class="my-shift"><p><i class="fa-solid fa-briefcase"></i> Meine Schicht</p><div><i class="fa-regular fa-clock"></i><span><strong>07:30 – 15:00</strong><small>Frühschicht</small></span><em>Geplant</em></div><footer>8:00 h Arbeit &nbsp;•&nbsp; 30 Min Pause &nbsp;•&nbsp; 8:30 h Anwesenheit</footer></article><article class="team-today"><h2><i class="fa-solid fa-users"></i> Dein Team heute</h2><p>Nur Mitarbeiter deiner Abteilung (Restaurant)</p>${teamRows}<button>+ 4 weitere Kollegen <i class="fa-solid fa-chevron-down"></i></button></article></div><div class="schedule-view hidden" data-panel="week"><div class="date-switch"><button><i class="fa-solid fa-chevron-left"></i></button><span>KW 31 • 27. Juli – 2. August 2026</span><button><i class="fa-solid fa-chevron-right"></i></button></div><div class="week-summary"><span>Arbeitsstunden<strong>32:00 h</strong></span><span>Sollstunden<strong>40:00 h</strong></span><span>Überstunden<strong>+0:30 h</strong></span><span>Freie Tage<strong>2</strong></span></div><div class="week-list">${weekRows}</div></div><div class="schedule-view hidden" data-panel="month"><div class="date-switch"><button><i class="fa-solid fa-chevron-left"></i></button><span>Juli 2026</span><button><i class="fa-solid fa-chevron-right"></i></button></div><div class="calendar-weekdays"><span>Mo.</span><span>Di.</span><span>Mi.</span><span>Do.</span><span>Fr.</span><span>Sa.</span><span>So.</span></div><div class="month-calendar">${monthDays}</div><div class="calendar-legend"><span class="green">● Frühschicht</span><span class="orange">● Spätschicht</span><span class="purple">● Nachtschicht</span><span class="blue">● Urlaub</span><span class="free">● Frei</span><span class="red">● Krank</span></div><article class="month-overview"><h2>Monatsübersicht</h2><div><span><b>17</b>Arbeitstage</span><span><b>6</b>Spätschichten</span><span><b>2</b>Urlaubstage</span><span><b>6</b>Freie Tage</span></div></article></div><div class="schedule-view hidden" data-panel="period"><div class="date-switch"><button><i class="fa-solid fa-chevron-left"></i></button><span><i class="fa-regular fa-calendar"></i> 01. Juni – 31. Juli 2026</span><button><i class="fa-solid fa-chevron-right"></i></button></div><div class="period-filter"><button class="active">Meine Einsätze</button><button>Abteilung (Restaurant)</button></div><article class="period-day"><h2>Montag, 27. Juli 2026 <span>8:00 h <i class="fa-solid fa-chevron-up"></i></span></h2><p class="active">● 07:30 – 15:00 <span>Max Mustermann (Du)</span><b>Frühschicht</b></p><p>● 08:00 – 16:30 <span>Thomas Becker</span><b>Frühschicht</b></p></article><article class="period-day orange-day"><h2>Dienstag, 28. Juli 2026 <span>8:00 h <i class="fa-solid fa-chevron-up"></i></span></h2><p>● 12:00 – 20:30 <span>Michael Wagner</span><b>Spätschicht</b></p><p>● 12:30 – 21:00 <span>Sarah Klein</span><b>Spätschicht</b></p></article><div class="period-closed">Mittwoch, 29. Juli 2026 <span>8:00 h <i class="fa-solid fa-chevron-down"></i></span></div><div class="period-closed">Donnerstag, 30. Juli 2026 <span>Frei <i class="fa-solid fa-chevron-down"></i></span></div></div></section>`);
  const page = document.getElementById("schedulePage");
  const show = (visible) => { dashboard.classList.toggle("schedule-mode", visible); page.classList.toggle("hidden", !visible); if (visible) window.scrollTo({ top: 0, behavior: "smooth" }); };
  scheduleNav.addEventListener("click", () => show(true)); homeNav.addEventListener("click", () => show(false));
  page.querySelectorAll("[data-view]").forEach((tab) => tab.addEventListener("click", () => { page.querySelectorAll("[data-view]").forEach((item) => item.setAttribute("aria-selected", String(item === tab))); page.querySelectorAll("[data-panel]").forEach((panel) => panel.classList.toggle("hidden", panel.dataset.panel !== tab.dataset.view)); }));
});

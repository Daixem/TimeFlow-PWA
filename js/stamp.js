"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const dashboard = document.getElementById("dashboard");
  if (!dashboard) return;

  dashboard.insertAdjacentHTML("beforeend", `
    <section id="clockPage" class="clock-page app-page hidden" aria-labelledby="clockPageTitle">
      <header class="clock-page-header">
        <div>
          <span class="clock-eyebrow"><i class="fa-solid fa-fingerprint"></i> Zeiterfassung</span>
          <h1 id="clockPageTitle">Stempeln</h1>
          <p>Arbeitszeit starten, verfolgen und beenden.</p>
        </div>
        <span class="clock-connection"><i></i> Bereit</span>
      </header>

      <section class="clock-focus-card" aria-label="Aktuelle Zeiterfassung">
        <div class="clock-state" id="clockState"><i></i><span>Nicht im Dienst</span></div>
        <time class="clock-live-time" id="clockLiveTime">--:--</time>
        <p class="clock-live-date" id="clockLiveDate">–</p>

        <button class="clock-action-button" id="clockActionButton" type="button" aria-pressed="false">
          <span class="clock-action-ring"><i class="fa-solid fa-right-to-bracket" id="clockActionIcon"></i></span>
          <strong id="clockActionLabel">Einstempeln</strong>
          <small id="clockActionHint">Arbeitszeit jetzt starten</small>
        </button>

        <div class="running-time" aria-live="polite">
          <small>Heutige Arbeitszeit</small>
          <strong id="clockElapsed">00:00:00</strong>
          <span id="clockElapsedHint">Noch nicht gestartet</span>
        </div>
      </section>

      <section class="clock-shift-card" aria-labelledby="clockShiftTitle">
        <header>
          <div><span>Deine heutige Schicht</span><h2 id="clockShiftTitle">Frühschicht</h2></div>
          <em>Geplant</em>
        </header>
        <div class="clock-shift-timeline">
          <div><span class="timeline-dot start"><i class="fa-solid fa-play"></i></span><small>Beginn</small><strong id="clockStartTime">--:--</strong></div>
          <i class="timeline-line"></i>
          <div><span class="timeline-dot break"><i class="fa-solid fa-mug-hot"></i></span><small>Pause</small><strong id="clockBreakTime">30 Min.</strong></div>
          <i class="timeline-line"></i>
          <div><span class="timeline-dot end"><i class="fa-solid fa-flag-checkered"></i></span><small>Geplant bis</small><strong>15:00</strong></div>
        </div>
        <footer><span><i class="fa-solid fa-location-dot"></i> Restaurant</span><span><i class="fa-regular fa-clock"></i> 07:30 – 15:00 Uhr</span></footer>
      </section>

      <section class="clock-summary" aria-label="Tagesübersicht">
        <article><span class="summary-icon blue"><i class="fa-solid fa-hourglass-half"></i></span><div><small>Nettozeit</small><strong id="clockNetTime">0 h 0 min</strong></div></article>
        <article><span class="summary-icon amber"><i class="fa-solid fa-mug-hot"></i></span><div><small>Pause</small><strong id="clockBreakSummary">0 min</strong></div></article>
        <article><span class="summary-icon mint"><i class="fa-solid fa-bullseye"></i></span><div><small>Tagesziel</small><strong>8 h 0 min</strong></div></article>
      </section>

      <section class="clock-note" id="clockNote">
        <span><i class="fa-solid fa-shield-halved"></i></span>
        <div><strong>Lokale Zeiterfassung</strong><p>Dein Stempelstatus bleibt auf diesem Gerät gespeichert und ist auch offline verfügbar.</p></div>
      </section>
    </section>
  `);

  const STORAGE_KEY = "timeflow-workday-v2";
  const TARGET_MINUTES = 480;
  const AUTO_BREAK_AFTER = 360;
  const AUTO_BREAK_MINUTES = 30;
  const elements = {
    page: document.getElementById("clockPage"),
    state: document.getElementById("clockState"),
    liveTime: document.getElementById("clockLiveTime"),
    liveDate: document.getElementById("clockLiveDate"),
    action: document.getElementById("clockActionButton"),
    actionIcon: document.getElementById("clockActionIcon"),
    actionLabel: document.getElementById("clockActionLabel"),
    actionHint: document.getElementById("clockActionHint"),
    elapsed: document.getElementById("clockElapsed"),
    elapsedHint: document.getElementById("clockElapsedHint"),
    start: document.getElementById("clockStartTime"),
    breakTime: document.getElementById("clockBreakTime"),
    net: document.getElementById("clockNetTime"),
    breakSummary: document.getElementById("clockBreakSummary"),
    note: document.getElementById("clockNote")
  };

  function readState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return saved && saved.workStart ? saved : { isWorking: false, workStart: null, workEnd: null };
    } catch {
      return { isWorking: false, workStart: null, workEnd: null };
    }
  }

  function formatTime(date) {
    return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  }

  function formatDuration(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function formatMinutes(minutes) {
    return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  }

  function renderClock() {
    const now = new Date();
    const saved = readState();
    const start = saved.workStart ? new Date(saved.workStart) : null;
    const end = saved.isWorking ? now : saved.workEnd ? new Date(saved.workEnd) : null;
    const elapsedSeconds = start && end ? Math.max(0, Math.floor((end - start) / 1000)) : 0;
    const grossMinutes = Math.floor(elapsedSeconds / 60);
    const breakMinutes = grossMinutes >= AUTO_BREAK_AFTER ? AUTO_BREAK_MINUTES : 0;
    const netMinutes = Math.max(0, grossMinutes - breakMinutes);
    const progress = Math.min(100, Math.round((netMinutes / TARGET_MINUTES) * 100));

    elements.liveTime.textContent = now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    elements.liveDate.textContent = now.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
    elements.elapsed.textContent = formatDuration(Math.max(0, elapsedSeconds - breakMinutes * 60));
    elements.start.textContent = start ? formatTime(start) : "--:--";
    elements.net.textContent = formatMinutes(netMinutes);
    elements.breakSummary.textContent = `${breakMinutes} min`;
    elements.breakTime.textContent = breakMinutes ? `${breakMinutes} Min.` : "Automatisch";
    elements.elapsedHint.textContent = saved.isWorking ? `${progress} % deines Tagesziels` : start ? `Beendet um ${formatTime(end)}` : "Noch nicht gestartet";
    elements.state.classList.toggle("is-working", Boolean(saved.isWorking));
    elements.state.querySelector("span").textContent = saved.isWorking ? "Im Dienst" : start ? "Dienst beendet" : "Nicht im Dienst";
    elements.action.classList.toggle("is-working", Boolean(saved.isWorking));
    elements.action.setAttribute("aria-pressed", String(Boolean(saved.isWorking)));
    elements.actionIcon.className = `fa-solid ${saved.isWorking ? "fa-right-from-bracket" : "fa-right-to-bracket"}`;
    elements.actionLabel.textContent = saved.isWorking ? "Ausstempeln" : "Einstempeln";
    elements.actionHint.textContent = saved.isWorking ? "Arbeitszeit jetzt beenden" : start ? "Neue Arbeitszeit starten" : "Arbeitszeit jetzt starten";
    elements.note.classList.toggle("active", Boolean(saved.isWorking));
    elements.note.querySelector("strong").textContent = saved.isWorking ? "Arbeitszeit läuft" : "Lokale Zeiterfassung";
    elements.note.querySelector("p").textContent = saved.isWorking
      ? `Seit ${formatTime(start)} Uhr wird deine Arbeitszeit erfasst.`
      : "Dein Stempelstatus bleibt auf diesem Gerät gespeichert und ist auch offline verfügbar.";
  }

  elements.action.addEventListener("click", () => document.dispatchEvent(new CustomEvent("timeflow:toggle-clock")));
  document.addEventListener("timeflow:workday-updated", renderClock);
  window.setInterval(renderClock, 1000);
  renderClock();
});

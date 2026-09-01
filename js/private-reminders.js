(function () {
  "use strict";
  const SENT_KEY = "timeflow-reminders-sent-v1";
  const read = (key, fallback) => { try { return JSON.parse(window.TimeFlowPlatform.storage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => window.TimeFlowPlatform.storage.setItem(key, JSON.stringify(value));
  const working = (entry) => entry && !["free", "vacation", "sick", "absence"].includes(entry.kind) && /^\d{2}:\d{2}$/.test(entry.start || "") && /^\d{2}:\d{2}$/.test(entry.end || "");
  async function notifyOnce(id, title, body) {
    const sent = read(SENT_KEY, {}); if (sent[id]) return;
    sent[id] = new Date().toISOString(); write(SENT_KEY, sent);
    const registration = await navigator.serviceWorker?.ready.catch(() => null);
    if ("Notification" in window && Notification.permission === "granted" && registration) await registration.showNotification(title, { body, icon: "assets/icons/timeflow-icon-192.png", badge: "assets/icons/timeflow-icon-192.png", tag: id, data: { url: "./" } });
    const toast = document.getElementById("toast"); if (toast) { toast.textContent = `${title}: ${body}`; toast.classList.add("is-visible"); window.setTimeout(() => toast.classList.remove("is-visible"), 5000); }
  }
  function check() {
    const settings = read("timeflow-settings-v1", {}); const now = new Date(); const schedule = read("timeflow-private-schedule-v1", []);
    if (settings.shiftReminders !== false) schedule.filter(working).forEach((entry) => { const start = new Date(`${entry.date}T${entry.start}:00`); const minutes = Math.round((start - now) / 60000); if (minutes >= 0 && minutes <= 30) notifyOnce(`shift-${entry.date}-${entry.start}`, "Dein Einsatz beginnt bald", `${entry.title || "Geplanter Einsatz"} startet um ${entry.start} Uhr.`); });
    const workday = read("timeflow-workday-v2", null);
    if (settings.forgottenClockOut !== false && workday?.isWorking && workday.workStart) { const start = new Date(workday.workStart); const today = now.toLocaleDateString("sv-SE"); const shift = schedule.find((entry) => working(entry) && entry.date === today); const plannedEnd = shift ? new Date(`${today}T${shift.end}:00`) : null; const overdue = plannedEnd ? now - plannedEnd > 30 * 60000 : now - start > 12 * 3600000; if (overdue) notifyOnce(`clockout-${workday.workStart}`, "Ausstempeln prüfen", "Deine Zeiterfassung läuft noch. Hast du das Ausstempeln vergessen?"); }
  }
  document.addEventListener("DOMContentLoaded", () => { check(); window.setInterval(check, 60000); document.addEventListener("visibilitychange", () => { if (!document.hidden) check(); }); document.addEventListener("timeflow:workday-updated", check); document.addEventListener("timeflow:private-schedule-updated", check); });
}());

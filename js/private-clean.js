(function () {
  "use strict";
  const platform = () => window.TimeFlowPlatform;
  const read = (key, fallback) => { try { const value = JSON.parse(platform().storage.getItem(key)); return value ?? fallback; } catch (_error) { return fallback; } };
  const isPrivate = () => document.documentElement.classList.contains("timeflow-private-mode") || document.body.dataset.appMode === "private";
  const schedule = () => { const value = read("timeflow-private-schedule-v1", []); return Array.isArray(value) ? value.sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`)) : []; };
  const dateText = (date) => new Date(`${date}T12:00:00`).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
  const working = (entry) => entry && entry.start && entry.end && !/^(frei|krank|urlaub)$/i.test(entry.title || "");
  function setShiftCard(card, entry, emptyText) {
    if (!card) return;
    card.classList.toggle("is-empty", !entry);
    card.querySelector("p").textContent = entry ? dateText(entry.date) : "–";
    card.querySelector("strong").textContent = entry ? `${entry.start} – ${entry.end}` : emptyText;
    card.querySelector("span").textContent = entry ? entry.title || "Arbeit" : "Keine Daten";
  }
  function renderRealHome() {
    if (!isPrivate()) return;
    const shifts = schedule(); const today = new Date().toLocaleDateString("sv-SE");
    const previous = [...shifts].reverse().find((entry) => entry.date < today && working(entry)); const next = shifts.find((entry) => entry.date >= today && working(entry));
    const cards = document.querySelectorAll(".shift-card"); setShiftCard(cards[0], previous, "Noch kein Einsatz"); setShiftCard(cards[1], next, "Kein Einsatz geplant");
    const month = today.slice(0, 7); const monthEntries = shifts.filter((entry) => entry.date.startsWith(month)); const stats = document.querySelectorAll(".month-card .month-stats>div");
    if (stats[2]) { stats[2].querySelector("span").textContent = "Urlaub"; stats[2].querySelector("strong").textContent = `${monthEntries.filter((entry) => /^urlaub$/i.test(entry.title || "")).length} Tage`; }
    if (stats[3]) { stats[3].querySelector("span").textContent = "Krankheit"; stats[3].querySelector("strong").textContent = `${monthEntries.filter((entry) => /^krank$/i.test(entry.title || "")).length} Tage`; }
    const monthLabel = document.getElementById("homeMonthLabel"); if (monthLabel) monthLabel.textContent = new Date().toLocaleDateString("de-DE", { month: "long", year: "numeric" });
    const stampCard = document.querySelector(".clock-shift-card");
    if (stampCard) { stampCard.hidden = !next; if (next) { stampCard.querySelector("h2").textContent = next.title || "Arbeit"; const details = stampCard.querySelectorAll("footer span"); if (details[0]) details[0].innerHTML = '<i class="fa-solid fa-calendar-day"></i> Eigener Dienstplan'; if (details[1]) details[1].innerHTML = `<i class="fa-regular fa-clock"></i> ${next.start} – ${next.end} Uhr`; } }
  }
  function removeProfileExamples() {
    if (!isPrivate()) return;
    const profileName = document.getElementById("profileName"); const userName = document.getElementById("userName"); const initials = document.getElementById("profileInitials");
    if (profileName?.textContent.trim() === "Max Mustermann") { profileName.textContent = "Privates Profil"; if (userName?.textContent.trim() === "Max") userName.textContent = "du"; if (initials?.textContent.trim() === "MM") initials.textContent = "P"; }
    const eyebrow = document.querySelector("#profilePage .profile-eyebrow"); if (eyebrow) eyebrow.innerHTML = '<i class="fa-solid fa-user"></i> Einzelnutzung';
    const profileCopy = document.querySelector("#profilePage .profile-page-header>div>p"); if (profileCopy) profileCopy.textContent = "Deine persönlichen Einstellungen und lokalen Daten.";
    const status = document.querySelector("#profilePage .profile-status"); const workday = read("timeflow-workday-v2", null); if (status) status.innerHTML = `<i></i> ${workday?.isWorking ? "Im Dienst" : "Nicht im Dienst"}`;
  }
  function buildNotifications() {
    if (!isPrivate()) return;
    const result = []; const now = new Date(); const shifts = schedule(); const next = shifts.find((entry) => working(entry) && new Date(`${entry.date}T${entry.start}:00`) > now); const workday = read("timeflow-workday-v2", null);
    if (next) { const start = new Date(`${next.date}T${next.start}:00`); const hours = (start - now) / 3600000; if (hours <= 48) result.push({ id: `private-next-${next.date}-${next.start}`, type: "schedule", category: "schedule", title: "Geplanter Einsatz", body: `${dateText(next.date)} · ${next.start} – ${next.end} Uhr`, createdAt: new Date().toISOString(), read: false, action: "schedule" }); }
    const lastImport = read("timeflow-private-last-import-v1", null); if (lastImport?.at && Date.now() - new Date(lastImport.at).getTime() < 86400000) result.push({ id: `private-import-${lastImport.at}`, type: "success", category: "schedule", title: "Dienstplan übernommen", body: `${Number(lastImport.added || 0)} Tage ergänzt${lastImport.updated ? `, ${lastImport.updated} aktualisiert` : ""}.`, createdAt: lastImport.at, read: false, action: "schedule" });
    if (workday?.isWorking && workday.workStart) { const hours = (Date.now() - new Date(workday.workStart).getTime()) / 3600000; if (hours >= 10) result.push({ id: "private-long-workday", type: "system", category: "worktime", title: "Ausstempeln prüfen", body: `Deine laufende Arbeitszeit beträgt bereits mehr als ${Math.floor(hours)} Stunden.`, createdAt: new Date().toISOString(), read: false, action: "" }); }
    if (!navigator.onLine) result.push({ id: "private-offline", type: "system", category: "system", title: "Offlinebetrieb aktiv", body: "TimeFlow arbeitet lokal. Änderungen werden auf diesem Gerät gespeichert.", createdAt: new Date().toISOString(), read: false, action: "" });
    document.dispatchEvent(new CustomEvent("timeflow:replace-notifications", { detail: result }));
    const title = document.getElementById("notificationCenterTitle"); if (title) title.textContent = "Persönliche Hinweise";
    const copy = title?.nextElementSibling; if (copy) copy.textContent = "Arbeitszeit, Dienstplan und System – nur aus deinen tatsächlichen Daten.";
  }
  function apply() { renderRealHome(); removeProfileExamples(); buildNotifications(); }
  document.addEventListener("timeflow:mode-changed", apply); document.addEventListener("timeflow:private-schedule-updated", apply); document.addEventListener("timeflow:workday-updated", apply); window.addEventListener("online", apply); window.addEventListener("offline", apply);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply); else apply();
}());

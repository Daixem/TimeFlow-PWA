(function () {
  "use strict";
  const storage = () => window.TimeFlowPlatform?.storage;
  const read = (key, fallback) => { try { return JSON.parse(storage().getItem(key)) ?? fallback; } catch { return fallback; } };
  const minutes = (entry) => {
    if (!entry?.start || !entry?.end || /^(frei|urlaub|krank)$/i.test(entry.title || "")) return 0;
    const [sh, sm] = entry.start.split(":").map(Number); const [eh, em] = entry.end.split(":").map(Number);
    let gross = eh * 60 + em - sh * 60 - sm; if (gross < 0) gross += 1440;
    return Math.max(0, gross - Number(entry.break || 0));
  };
  const ageOn = (birthDate, date) => {
    const birth = new Date(`${birthDate}T12:00:00`); const target = new Date(`${date}T12:00:00`);
    let age = target.getFullYear() - birth.getFullYear();
    if (target.getMonth() < birth.getMonth() || (target.getMonth() === birth.getMonth() && target.getDate() < birth.getDate())) age -= 1;
    return age;
  };
  function checks(entries, birthDate) {
    const warnings = []; const working = entries.filter((entry) => minutes(entry) > 0).sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
    working.forEach((entry, index) => {
      const age = ageOn(birthDate, entry.date); const net = minutes(entry); const pause = Number(entry.break || 0); const minor = age >= 0 && age < 18;
      const requiredPause = minor ? (net > 360 ? 60 : net > 270 ? 30 : 0) : (net > 540 ? 45 : net > 360 ? 30 : 0);
      if (minor && net > 480) warnings.push(`${entry.date}: Für Minderjährige sind mehr als 8 Stunden täglich zu prüfen.`);
      if (!minor && net > 600) warnings.push(`${entry.date}: Mehr als 10 Stunden Arbeitszeit überschreiten die allgemeine Tageshöchstgrenze.`);
      if (!minor && net > 480 && net <= 600) warnings.push(`${entry.date}: Mehr als 8 Stunden erfordern grundsätzlich einen gesetzlichen Ausgleich.`);
      if (pause < requiredPause) warnings.push(`${entry.date}: Mindestens ${requiredPause} Minuten Pause vorgesehen (${minor ? "unter 18" : "volljährig"}).`);
      if (minor && (entry.start < "06:00" || entry.end > "20:00")) warnings.push(`${entry.date}: Arbeitszeit außerhalb 06:00–20:00 Uhr; branchenspezifische Ausnahme prüfen.`);
      const next = working[index + 1];
      if (next) {
        const end = new Date(`${entry.date}T${entry.end}:00`); if (entry.end < entry.start) end.setDate(end.getDate() + 1);
        const start = new Date(`${next.date}T${next.start}:00`); const rest = (start - end) / 60000; const minimum = minor ? 720 : 660;
        if (rest >= 0 && rest < minimum) warnings.push(`${next.date}: Nur ${Math.floor(rest / 60)} Std. Ruhezeit; vorgesehen sind mindestens ${minimum / 60} Std.`);
      }
    });
    const minorWeeks = new Map();
    working.forEach((entry) => { if (ageOn(birthDate, entry.date) >= 18) return; const date = new Date(`${entry.date}T12:00:00`); const monday = new Date(date); monday.setDate(date.getDate() - ((date.getDay() + 6) % 7)); const key = monday.toLocaleDateString("sv-SE"); minorWeeks.set(key, (minorWeeks.get(key) || 0) + minutes(entry)); });
    minorWeeks.forEach((total, week) => { if (total > 2400) warnings.push(`Woche ab ${week}: Mehr als 40 Stunden für eine minderjährige Person.`); });
    return [...new Set(warnings)];
  }
  function render() {
    const page = document.getElementById("schedulePage"); if (!page) return;
    let card = page.querySelector(".work-protection-card");
    if (!card) { card = document.createElement("section"); card.className = "work-protection-card"; page.append(card); }
    const profile = read("timeflow-profile-v1", {}); const birthDate = String(profile.birthDate || read("timeflow-settings-v1", {}).birthDate || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) { card.innerHTML = "<h3>Arbeits- und Jugendschutz</h3><p>Bitte zuerst dein Geburtsdatum im Profil ergänzen.</p>"; return; }
    const warnings = checks(read("timeflow-private-schedule-v1", []), birthDate);
    card.innerHTML = `<h3>Arbeits- und Jugendschutz</h3><p>Automatische Vorprüfung anhand des Alters. Tarifliche, schulische und branchenspezifische Ausnahmen müssen zusätzlich geprüft werden.</p><ul>${warnings.length ? warnings.map((warning) => `<li><i class="fa-solid fa-triangle-exclamation"></i> ${warning}</li>`).join("") : '<li class="is-clear"><i class="fa-solid fa-circle-check"></i> In deinem aktuellen Dienstplan wurden keine allgemeinen Grenzwerte auffällig.</li>'}</ul>`;
  }
  document.addEventListener("DOMContentLoaded", render);
  document.addEventListener("timeflow:private-schedule-updated", render);
  document.addEventListener("timeflow:profile-updated", render);
  document.addEventListener("timeflow:settings-updated", render);
  window.TimeFlowWorkProtection = { checks, ageOn };
}());

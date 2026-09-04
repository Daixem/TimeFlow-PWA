(function () {
  "use strict";
  const KEY = "timeflow-private-account-v1";
  const AUDIT_KEY = "timeflow-worktime-audit-v1";
  const TARGETS_KEY = "timeflow-monthly-targets-v1";
  const ARCHIVE_KEY = "timeflow-private-account-archive-v1";
  const STATE_KEY = "timeflow-private-account-state-v1";
  const SCHEDULE_KEY = "timeflow-private-schedule-v1";
  const platform = () => window.TimeFlowPlatform;
  const read = () => { try { const value = JSON.parse(platform().storage.getItem(KEY) || "[]"); return Array.isArray(value) ? value : []; } catch (_error) { return []; } };
  const write = (entries) => platform().storage.setItem(KEY, JSON.stringify(entries));
  const settings = () => { try { return JSON.parse(platform().storage.getItem("timeflow-settings-v1") || "{}"); } catch (_error) { return {}; } };
  const readObject = (key) => { try { const value = JSON.parse(platform().storage.getItem(key) || "{}"); return value && typeof value === "object" && !Array.isArray(value) ? value : {}; } catch (_error) { return {}; } };
  const locale = () => window.TimeFlowLocalization?.locale?.() || "de-DE";
  const audit = (action, entry, before = null) => { const log = readObject(AUDIT_KEY); const events = Array.isArray(log.events) ? log.events : []; events.push({ id: `audit-${Date.now()}`, at: new Date().toISOString(), action, entryId: entry.id, date: entry.date, before, after: entry }); platform().storage.setItem(AUDIT_KEY, JSON.stringify({ events: events.slice(-500) })); };
  const format = (minutes, signed = false) => { const sign = minutes < 0 ? "−" : signed && minutes > 0 ? "+" : ""; const value = Math.abs(Math.round(minutes)); return `${sign}${Math.floor(value / 60)} h ${value % 60} min`; };
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const currentDate = () => new Date().toLocaleDateString("sv-SE");
  const currentMonth = () => currentDate().slice(0, 7);
  const entryType = (entry) => entry.entryType || (entry.source === "stamp" ? "stamped_work" : "time_correction");
  const isWork = (entry) => entry.source === "stamp" || entryType(entry) === "manual_work";
  const isCorrection = (entry) => ["opening_balance", "time_correction"].includes(entryType(entry));
  const schedule = () => { try { const value = JSON.parse(platform().storage.getItem(SCHEDULE_KEY) || "[]"); return Array.isArray(value) ? value : []; } catch (_error) { return []; } };
  const scheduleType = (entry) => String(entry?.title || "").trim().toLocaleLowerCase("de-DE");
  const isFreeScheduleDay = (entry) => /^(frei|free|off|a|f|-)$/i.test(scheduleType(entry));
  const isCreditedAbsence = (entry) => /^(urlaub|krank|vacation|sick)$/i.test(scheduleType(entry));
  const mondayFor = (date) => {
    const value = new Date(`${date}T12:00:00`); const offset = (value.getDay() + 6) % 7;
    value.setDate(value.getDate() - offset);
    return value.toLocaleDateString("sv-SE");
  };
  const dailyTarget = (config = settings()) => Number(config.dailyTargetMinutes || 480);
  function scheduleTargetForDate(date, config = settings()) {
    // The employment contract sets the daily target. A shorter planned shift
    // must not turn a 40-hour contract into fictitious overtime.
    return dailyTarget(config);
  }
  function scheduleDueForMonth(month, today = currentDate()) {
    const todayMonth = today.slice(0, 7);
    if (month > todayMonth) return { hasSchedule: false, targetDue: 0, absenceCredit: 0, extraFreeDays: 0 };
    const limit = month < todayMonth ? `${month}-31` : today;
    const allEntriesByDate = new Map();
    schedule().filter((entry) => entry.date <= limit).forEach((entry) => allEntriesByDate.set(entry.date, entry));
    const entriesByDate = new Map([...allEntriesByDate].filter(([date]) => date.startsWith(month)));
    if (!entriesByDate.size) return { hasSchedule: false, targetDue: 0, absenceCredit: 0, extraFreeDays: 0 };
    let contractualDays = 0; let absenceCredit = 0;
    const freeByWeek = new Map();
    const relevantWeeks = new Set([...entriesByDate.values()].map((entry) => mondayFor(entry.date)));
    // A calendar week can begin in the previous month. Its free days still
    // determine whether the current month's Sunday is the third free day.
    [...allEntriesByDate.values()].filter((entry) => relevantWeeks.has(mondayFor(entry.date))).forEach((entry) => {
      if (isFreeScheduleDay(entry)) {
        const week = mondayFor(entry.date); freeByWeek.set(week, (freeByWeek.get(week) || 0) + 1);
      }
    });
    entriesByDate.forEach((entry) => {
      if (isFreeScheduleDay(entry)) return;
      contractualDays += 1;
      if (isCreditedAbsence(entry)) absenceCredit += dailyTarget();
    });
    const extraFreeDays = [...freeByWeek.values()].reduce((sum, freeDays) => sum + Math.max(0, freeDays - 2), 0);
    // Two free days per Monday–Sunday week are normal. Every other entered day
    // is a contractual day of eight hours for a 40-hour week. The third free day
    // is therefore counted as a missing contractual day, not as paid work.
    const contractualTarget = (contractualDays + extraFreeDays) * dailyTarget();
    return { hasSchedule: true, targetDue: contractualTarget, absenceCredit, extraFreeDays, contractualDays };
  }
  function weekdaysThrough(month, date) {
    const [year, monthNumber] = month.split("-").map(Number);
    const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    const limit = Math.min(lastDay, Math.max(0, Number(String(date || "").slice(8, 10)) || 0));
    let due = 0; let total = 0;
    for (let day = 1; day <= lastDay; day += 1) { const weekday = new Date(Date.UTC(year, monthNumber - 1, day)).getUTCDay(); if (weekday !== 0 && weekday !== 6) { total += 1; if (day <= limit) due += 1; } }
    return { due, total };
  }
  function targetDueForMonth(month, target, today = currentDate()) {
    const scheduled = scheduleDueForMonth(month, today);
    if (scheduled.hasSchedule) return scheduled.targetDue;
    const todayMonth = today.slice(0, 7);
    if (month < todayMonth) return target;
    if (month > todayMonth) return 0;
    const workdays = weekdaysThrough(month, today);
    return workdays.total ? Math.round(target * workdays.due / workdays.total) : target;
  }
  function downloadCsv(entries) {
    const rows = [["Datum", "Art", "Notiz", "Arbeitszeit Minuten", "Soll Minuten", "Korrektur Minuten"], ...entries.map((entry) => [entry.date, entryType(entry), entry.note || "", entry.minutes || 0, entry.target || 0, entry.adjustment || 0])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" })); link.download = `timeflow-arbeitszeitkonto-${new Date().toLocaleDateString("sv-SE")}.csv`; link.click(); URL.revokeObjectURL(link.href);
  }
  function printPdf(entries) {
    const popup = window.open("", "_blank", "noopener,noreferrer"); if (!popup) return;
    const rows = entries.map((entry) => `<tr><td>${escapeHtml(entry.date)}</td><td>${escapeHtml(entryType(entry))}</td><td>${escapeHtml(entry.note || "")}</td><td>${isWork(entry) ? format(entry.minutes) : format(entry.adjustment, true)}</td></tr>`).join("");
    popup.document.write(`<!doctype html><html lang="${document.documentElement.lang}"><head><meta charset="utf-8"><title>TimeFlow Arbeitszeitkonto</title><style>body{font:14px Arial;padding:32px;color:#10243b}h1{margin-bottom:4px}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{padding:9px;border-bottom:1px solid #ccd6e0;text-align:left}</style></head><body><h1>TimeFlow Arbeitszeitkonto</h1><p>Export vom ${new Date().toLocaleString(locale())}</p><table><thead><tr><th>Datum</th><th>Art</th><th>Notiz</th><th>Wert</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=()=>window.print()<\/script></body></html>`); popup.document.close();
  }
  function captureCompletedWorkday() {
    let workday; try { workday = JSON.parse(platform().storage.getItem("timeflow-workday-v2") || "null"); } catch (_error) { return; }
    if (!workday?.workStart || !workday.workEnd || workday.isWorking) return;
    const entries = read(); const id = `stamp-${workday.workEnd}`; if (entries.some((entry) => entry.id === id)) return;
    const gross = Math.max(0, Math.floor((new Date(workday.workEnd) - new Date(workday.workStart)) / 60000)); const config = settings(); const pause = workday.hasManualPause ? Math.floor(Number(workday.pauseAccumulatedMs || 0) / 60000) : gross >= Number(config.autoBreakAfterMinutes || 360) ? Number(config.autoBreakMinutes || 30) : 0; const net = Math.max(0, gross - pause); const date = new Date(workday.workStart).toLocaleDateString("sv-SE"); const target = scheduleTargetForDate(date, config);
    entries.push({ id, date, minutes: net, target, adjustment: 0, note: "Stempelung", source: "stamp", entryType: "stamped_work" }); write(entries); document.dispatchEvent(new CustomEvent("timeflow:private-account-updated"));
  }
  function monthlyValues(month = currentMonth()) {
    captureCompletedWorkday();
    const monthEntries = read().filter((entry) => String(entry.date || "").startsWith(month));
    let stamped = monthEntries.filter(isWork).reduce((sum, entry) => sum + Number(entry.minutes || 0), 0);
    const manual = monthEntries.filter(isCorrection).reduce((sum, entry) => sum + Number(entry.adjustment || 0), 0);
    const workday = readObject("timeflow-workday-v2");
    if (workday?.isWorking && String(workday.workStart || "").slice(0, 7) === month) {
      const gross = Math.max(0, Math.floor((Date.now() - new Date(workday.workStart).getTime()) / 60000));
      const config = settings();
      const runningPause = workday.isPaused && workday.pauseStartedAt ? Math.max(0, Date.now() - new Date(workday.pauseStartedAt).getTime()) : 0;
      const pause = workday.hasManualPause ? Math.floor((Number(workday.pauseAccumulatedMs || 0) + runningPause) / 60000) : gross >= Number(config.autoBreakAfterMinutes || 360) ? Number(config.autoBreakMinutes || 30) : 0;
      stamped += Math.max(0, gross - pause);
    }
    const targets = readObject(TARGETS_KEY);
    const target = Math.round(Number(targets[month] ?? settings().monthlyTargetHours ?? 160) * 60);
    const scheduled = scheduleDueForMonth(month);
    const targetDue = scheduled.hasSchedule ? scheduled.targetDue : targetDueForMonth(month, target);
    const absenceCredit = scheduled.absenceCredit || 0;
    const calculated = { stamped, manual, target, targetDue, absenceCredit, extraFreeDays: scheduled.extraFreeDays || 0, scheduleBased: scheduled.hasSchedule, balance: stamped + manual + absenceCredit - targetDue };
    if (month < currentMonth()) {
      const archive = readObject(ARCHIVE_KEY);
      const archived = archive[month];
      if (archived) return { ...archived, entries: monthEntries };
      archive[month] = { ...calculated, archivedAt: new Date().toISOString() };
      platform().storage.setItem(ARCHIVE_KEY, JSON.stringify(archive));
    }
    return { ...calculated, entries: monthEntries };
  }
  function actualOvertimeForMonth(month) {
    captureCompletedWorkday();
    const target = dailyTarget();
    const completed = read().filter((entry) => String(entry.date || "").startsWith(month) && isWork(entry)).reduce((sum, entry) => sum + Math.max(0, Number(entry.minutes || 0) - target), 0);
    const workday = readObject("timeflow-workday-v2");
    if (!workday?.isWorking || String(workday.workStart || "").slice(0, 7) !== month) return completed;
    const gross = Math.max(0, Math.floor((Date.now() - new Date(workday.workStart).getTime()) / 60000));
    const runningPause = workday.isPaused && workday.pauseStartedAt ? Math.max(0, Date.now() - new Date(workday.pauseStartedAt).getTime()) : 0;
    const pause = workday.hasManualPause ? Math.floor((Number(workday.pauseAccumulatedMs || 0) + runningPause) / 60000) : gross >= Number(settings().autoBreakAfterMinutes || 360) ? Number(settings().autoBreakMinutes || 30) : 0;
    const date = new Date(workday.workStart).toLocaleDateString("sv-SE");
    return completed + Math.max(0, gross - pause - scheduleTargetForDate(date));
  }
  function archivePreviousMonth() {
    const month = currentMonth(); const state = readObject(STATE_KEY);
    if (state.month && state.month < month && state.values) { const archive = readObject(ARCHIVE_KEY); if (!archive[state.month]) { const values = state.values; archive[state.month] = { ...values, targetDue: values.target, balance: values.stamped + values.manual + Number(values.absenceCredit || 0) - values.target, archivedAt: new Date().toISOString() }; platform().storage.setItem(ARCHIVE_KEY, JSON.stringify(archive)); } }
    if (state.month !== month) platform().storage.setItem(STATE_KEY, JSON.stringify({ month }));
  }
  function rememberCurrentMonth(values) { platform().storage.setItem(STATE_KEY, JSON.stringify({ month: currentMonth(), values: { stamped: values.stamped, manual: values.manual, absenceCredit: values.absenceCredit, target: values.target, targetDue: values.targetDue, balance: values.balance } })); }
  function reopenArchivedMonth(date) {
    const month = String(date || "").slice(0, 7); if (!month || month >= currentMonth()) return;
    const archive = readObject(ARCHIVE_KEY); const archived = archive[month]; if (!archived) return;
    const targets = readObject(TARGETS_KEY); if (targets[month] === undefined) targets[month] = Number(archived.target || 0) / 60;
    delete archive[month]; platform().storage.setItem(TARGETS_KEY, JSON.stringify(targets)); platform().storage.setItem(ARCHIVE_KEY, JSON.stringify(archive));
  }
  function renderHomeMonth() {
    const currentMonth = new Date().toLocaleDateString("sv-SE").slice(0, 7);
    const values = monthlyValues(currentMonth);
    rememberCurrentMonth(values);
    const hours = document.getElementById("todayHours");
    const overtime = document.getElementById("todayOvertime");
    if (hours) hours.textContent = format(values.stamped + values.manual);
    if (overtime) overtime.textContent = format(actualOvertimeForMonth(currentMonth), true);
    return values;
  }
  function install() {
    archivePreviousMonth();
    document.body.insertAdjacentHTML("beforeend", `<dialog class="private-account-dialog" id="privateAccountDialog"><header><div><small>PRIVAT · ARBEITSZEITKONTO</small><h2>Mein Arbeitszeitkonto</h2><p>Stempelungen werden automatisch übernommen. Anfangsstände und Korrekturen kannst du manuell ergänzen.</p></div><button type="button" data-close-private-account aria-label="Schließen"><i class="fa-solid fa-xmark"></i></button></header><section class="private-account-summary"><span><small>ERFASSTE ARBEITSZEIT</small><strong data-account-stamped>0 h 0 min</strong></span><span><small>MANUELLE KORREKTUREN</small><strong data-account-manual>0 h 0 min</strong></span><span><small>ANGERECHNETE ABWESENHEIT</small><strong data-account-absence>0 h 0 min</strong></span><span><small>AKTUELLER SALDO</small><strong data-account-balance>0 h 0 min</strong></span><span><small>MONATSSOLL</small><strong data-account-target>0 h 0 min</strong></span><span><small>SOLL BIS HEUTE</small><strong data-account-target-due>0 h 0 min</strong></span></section><p class="private-account-model" data-account-model></p><form class="private-account-form"><label>Datum<input name="date" type="date" required></label><label>Kategorie<select name="entryType"><option value="time_correction">Zeitkorrektur</option><option value="opening_balance">Anfangssaldo</option><option value="manual_work">Manuell erfasste Arbeitszeit</option></select></label><label>Art<select name="direction"><option value="1">Guthaben hinzufügen</option><option value="-1">Stunden abziehen</option></select></label><label>Stunden<input name="hours" type="number" min="0" max="9999" value="0" required></label><label>Minuten<input name="minutes" type="number" min="0" max="59" value="0" required></label><label>Notiz<input name="note" type="text" maxlength="80" placeholder="z. B. Anfangsstand oder Korrektur"></label><button type="submit"><i class="fa-solid fa-plus"></i> Im Arbeitszeitkonto speichern</button></form><section class="private-account-list" data-account-list></section></dialog>`);
    const dialog = document.getElementById("privateAccountDialog"); const form = dialog.querySelector("form"); form.elements.date.value = currentDate(); dialog.querySelector(".private-account-summary").insertAdjacentHTML("afterend", `<label class="private-account-period"><i class="fa-regular fa-calendar"></i><span>Monatsarchiv</span><input type="month" data-account-month-picker aria-label="Monat auswählen"></label><div class="private-account-export"><button type="button" data-account-csv><i class="fa-solid fa-file-csv"></i> CSV exportieren</button><button type="button" data-account-pdf><i class="fa-solid fa-file-pdf"></i> PDF speichern</button><button type="button" data-account-audit><i class="fa-solid fa-clock-rotate-left"></i> Änderungsverlauf</button></div><section class="private-account-audit" data-account-audit-list hidden></section>`); const monthPicker = dialog.querySelector("[data-account-month-picker]"); monthPicker.value = currentMonth();
    function render() { const entries = read().sort((a, b) => `${b.date}${b.id}`.localeCompare(`${a.date}${a.id}`)); const month = monthPicker.value || currentMonth(); const { stamped, manual, absenceCredit, target, targetDue, balance, extraFreeDays, scheduleBased, entries: monthEntries } = monthlyValues(month); renderHomeMonth();
      dialog.querySelector("[data-account-stamped]").textContent = format(stamped); dialog.querySelector("[data-account-manual]").textContent = format(manual, true); dialog.querySelector("[data-account-absence]").textContent = format(absenceCredit); dialog.querySelector("[data-account-target]").textContent = format(target); dialog.querySelector("[data-account-target-due]").textContent = format(targetDue); dialog.querySelector("[data-account-balance]").textContent = format(balance, true); dialog.querySelector("[data-account-balance]").classList.toggle("is-negative", balance < 0); dialog.querySelector("[data-account-model]").textContent = scheduleBased ? `Vertragsmodell: ${format(dailyTarget() * 5)} pro Woche (${format(dailyTarget())} je Vertragstag). Zwei freie Tage je Montag–Sonntag sind regulär; ${extraFreeDays ? `${extraFreeDays} weiterer freier Tag${extraFreeDays === 1 ? "" : "e"} zählt als fehlende Sollzeit.` : "Urlaub und Krankheit werden als Sollzeit angerechnet."}` : "Ohne Dienstplan wird das hinterlegte Monatssoll anteilig auf Werktage verteilt."; const homeCaptured = document.getElementById("privateAccountCaptured"); const homeManual = document.getElementById("privateAccountManual"); const homeBalance = document.getElementById("privateAccountBalance"); if (homeCaptured) homeCaptured.textContent = format(stamped); if (homeManual) homeManual.textContent = `Soll ${format(targetDue)}`; if (homeBalance) { homeBalance.textContent = format(balance, true); homeBalance.classList.toggle("positive", balance >= 0); }
      dialog.querySelector("[data-account-list]").innerHTML = monthEntries.length ? monthEntries.map((entry) => { const work = isWork(entry); const typeLabel = entryType(entry) === "opening_balance" ? "Anfangssaldo" : entryType(entry) === "manual_work" ? "Manuelle Arbeitszeit" : entry.source === "stamp" ? "Automatisch" : "Zeitkorrektur"; return `<article><span><strong>${escapeHtml(entry.note || (work ? "Arbeitszeit" : "Korrektur"))}</strong><small>${new Date(`${entry.date}T12:00:00`).toLocaleDateString(locale(), { day: "2-digit", month: "2-digit", year: "numeric" })} · ${typeLabel}</small></span><b>${work ? format(entry.minutes) : format(entry.adjustment, true)}</b><span class="account-row-actions"><button type="button" data-edit-account="${entry.id}" aria-label="Eintrag korrigieren"><i class="fa-solid fa-pen"></i></button><button type="button" data-delete-account="${entry.id}" aria-label="Eintrag löschen"><i class="fa-regular fa-trash-can"></i></button></span></article>`; }).join("") : '<p class="private-import-empty">Für diesen Monat sind noch keine Arbeitszeiten vorhanden.</p>';
    }
    form.addEventListener("submit", (event) => { event.preventDefault(); const hours = Number(form.elements.hours.value || 0); const minuteValue = Number(form.elements.minutes.value || 0); const value = hours * 60 + minuteValue; if (!value) return; const type = form.elements.entryType.value; const work = type === "manual_work"; const adjustment = work ? 0 : Number(form.elements.direction.value) * value; const entries = read(); const entry = { id: `manual-${Date.now()}`, date: form.elements.date.value, minutes: work ? value : 0, target: 0, adjustment, note: form.elements.note.value.trim() || (work ? "Manuell erfasste Arbeitszeit" : type === "opening_balance" ? "Anfangssaldo" : "Manuelle Korrektur"), source: "manual", entryType: type }; entries.push(entry); audit("create", entry); reopenArchivedMonth(entry.date); write(entries); form.elements.hours.value = "0"; form.elements.minutes.value = "0"; form.elements.note.value = ""; render(); document.dispatchEvent(new CustomEvent("timeflow:private-account-updated")); });
    dialog.querySelector("[data-account-list]").addEventListener("click", (event) => { const remove = event.target.closest("[data-delete-account]"); const edit = event.target.closest("[data-edit-account]"); if (remove) { const entries = read(); const entry = entries.find((item) => item.id === remove.dataset.deleteAccount); if (!entry || !window.confirm("Diesen Arbeitszeiteintrag wirklich löschen?")) return; audit("delete", entry, entry); reopenArchivedMonth(entry.date); write(entries.filter((item) => item.id !== entry.id)); render(); document.dispatchEvent(new CustomEvent("timeflow:private-account-updated")); return; } if (edit) { const entries = read(); const entry = entries.find((item) => item.id === edit.dataset.editAccount); if (!entry) return; const work = isWork(entry); const current = work ? Number(entry.minutes || 0) : Math.abs(Number(entry.adjustment || 0)); const answer = window.prompt("Korrigierte Dauer in Minuten:", String(current)); if (answer === null || !Number.isFinite(Number(answer)) || Number(answer) < 0) return; const before = { ...entry }; if (work) entry.minutes = Number(answer); else entry.adjustment = Math.sign(Number(entry.adjustment || 1)) * Number(answer); entry.note = `${entry.note || "Arbeitszeit"} · korrigiert`; audit("edit", entry, before); reopenArchivedMonth(entry.date); write(entries); render(); document.dispatchEvent(new CustomEvent("timeflow:private-account-updated")); } });
    monthPicker.addEventListener("change", render); dialog.querySelector("[data-account-csv]").addEventListener("click", () => downloadCsv(read().filter((entry) => String(entry.date || "").startsWith(monthPicker.value)))); dialog.querySelector("[data-account-pdf]").addEventListener("click", () => printPdf(read().filter((entry) => String(entry.date || "").startsWith(monthPicker.value)))); dialog.querySelector("[data-account-audit]").addEventListener("click", () => { const list = dialog.querySelector("[data-account-audit-list]"); list.hidden = !list.hidden; const events = (readObject(AUDIT_KEY).events || []).slice().reverse(); list.innerHTML = events.length ? events.map((item) => `<article><strong>${item.action === "edit" ? "Korrigiert" : item.action === "delete" ? "Gelöscht" : "Erstellt"}</strong><span>${escapeHtml(item.date)} · ${new Date(item.at).toLocaleString(locale())}</span></article>`).join("") : "<p>Noch keine manuellen Änderungen protokolliert.</p>"; });
    dialog.querySelector("[data-close-private-account]").addEventListener("click", () => platform().dialog.close(dialog)); dialog.addEventListener("click", (event) => { if (event.target === dialog) platform().dialog.close(dialog); });
    document.addEventListener("timeflow:open-private-account", () => { render(); platform().dialog.open(dialog); }); document.addEventListener("timeflow:workday-updated", render); document.addEventListener("timeflow:settings-updated", render); document.addEventListener("timeflow:private-schedule-updated", render); render(); window.setTimeout(render, 0);
  }
  window.TimeFlowPrivateAccount = { refreshHome: renderHomeMonth, captureCompletedWorkday, targetDueForMonth, scheduleDueForMonth };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install); else install();
}());

import { readFile } from "node:fs/promises";
import vm from "node:vm";

const account = await readFile(new URL("../js/private-account.js", import.meta.url), "utf8");
const home = await readFile(new URL("../js/private-home.js", import.meta.url), "utf8");
const core = await readFile(new URL("../js/script.js", import.meta.url), "utf8");

for (const marker of ["timeflow-private-account-v1", "timeflow-private-schedule-v1", "captureCompletedWorkday", "scheduleTargetForDate", "scheduleDueForMonth", "weeklyTarget", "contractualTarget", "extraFreeDays", "absenceCredit", "monthlyValues", "actualOvertimeForMonth", "renderHomeMonth", "TimeFlowPrivateAccount", "Guthaben hinzufügen", "Stunden abziehen", "data-delete-account", "timeflow:open-private-account", "monthlyTargetHours", "MONATSSOLL", "SOLL BIS HEUTE", "stamped + manual + absenceCredit - targetDue", "targetDueForMonth", "timeflow-private-account-archive-v1", "opening_balance", "time_correction", "manual_work", "Math.max(0, Number(entry.minutes || 0) - target)", "ANGERECHNETE ABWESENHEIT", "Vertragsmodell"]) {
  if (!account.includes(marker)) throw new Error(`Arbeitszeitkonto: ${marker} fehlt.`);
}
if (!home.includes('data-private-action="account"') || !home.includes('document.dispatchEvent(new CustomEvent("timeflow:open-private-account"))')) throw new Error("Das Arbeitszeitkonto fehlt im Schnellzugriff.");
if (home.includes("privateAccountCaptured") || home.includes('monthCard.querySelector(".month-stats")?.insertAdjacentHTML')) throw new Error("Das Arbeitszeitkonto wird noch auf dem Home-Screen ausgegeben.");
if (!core.includes("TimeFlowPrivateAccount?.refreshHome") || !core.includes("if (!privateMode) elements.todayHours")) throw new Error("Die Monatsübersicht wird noch mit dem Tageswert überschrieben.");

const week = [
  ["2026-08-31", "Frei"], ["2026-09-01", "Frühschicht"], ["2026-09-02", "Frühschicht"], ["2026-09-03", "Frühschicht"], ["2026-09-04", "Frühschicht"], ["2026-09-05", "Frei"], ["2026-09-06", "Frei"]
].map(([date, title]) => ({ date, title, start: /Frei/.test(title) ? "" : "07:30", end: /Frei/.test(title) ? "" : "15:00", break: /Frei/.test(title) ? 0 : 30 }));
const storage = new Map([["timeflow-private-schedule-v1", JSON.stringify(week)], ["timeflow-settings-v1", JSON.stringify({ dailyTargetMinutes: 480 })]]);
const context = {
  window: { TimeFlowPlatform: { storage: { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) } } },
  document: { readyState: "loading", addEventListener() {} }, Date, JSON, Map, Math, String, Number, Array, Object, RegExp, console
};
vm.runInNewContext(account, context);
const weeklyTarget = context.window.TimeFlowPrivateAccount.scheduleDueForMonth("2026-09", "2026-09-06");
if (weeklyTarget.targetDue !== 1920 || weeklyTarget.extraFreeDays !== 1 || weeklyTarget.absenceCredit !== 0) throw new Error("40-Stunden-Vertrag: Vier Schichten ergeben 32 Stunden Sollzeit; freie Tage bleiben sollzeitfrei.");
storage.set("timeflow-private-schedule-v1", JSON.stringify(week.map((entry) => entry.date === "2026-09-02" ? { ...entry, title: "Urlaub", start: "", end: "", break: 0 } : entry)));
const absenceTarget = context.window.TimeFlowPrivateAccount.scheduleDueForMonth("2026-09", "2026-09-06");
if (absenceTarget.targetDue !== 1440 || absenceTarget.absenceCredit !== 0) throw new Error("Urlaub und Krankheit dürfen keine Sollzeit oder Zeitgutschrift erzeugen.");
storage.set("timeflow-private-schedule-v1", JSON.stringify(week));
storage.set("timeflow-settings-v1", JSON.stringify({ weeklyTargetHours: 30, regularWorkDays: 4 }));
const partTimeTarget = context.window.TimeFlowPrivateAccount.scheduleDueForMonth("2026-09", "2026-09-06");
if (partTimeTarget.targetDue !== 1800 || partTimeTarget.extraFreeDays !== 0 || partTimeTarget.normalFreeDays !== 3) throw new Error("Teilzeitvertrag: 30 Stunden auf vier Tage muss drei reguläre freie Tage berücksichtigen.");
console.log("Privates Arbeitszeitkonto: Stempelungen, Anfangsstände sowie Plus-/Minuskorrekturen sind verbunden.");

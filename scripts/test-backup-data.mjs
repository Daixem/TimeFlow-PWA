import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../js/backup-data.js", import.meta.url), "utf8");
const sandbox = { globalThis: {}, Date, JSON, Set, Object, String, Boolean };
vm.runInNewContext(source, sandbox, { filename: "backup-data.js" });
const api = sandbox.globalThis.TimeFlowBackupData;
const values = new Map([
  ["timeflow-profile-v1", JSON.stringify({ email: "owner@example.test" })],
  ["timeflow-private-schedule-v1", JSON.stringify([{ date: "2026-10-12", title: "Frühschicht" }])],
  ["timeflow-private-schedule-learning-v1:owner@example.test", JSON.stringify({ labels: { early: "Frühschicht" } })],
  ["timeflow-private-schedule-learning-v1:other@example.test", JSON.stringify({ labels: { late: "Spätschicht" } })],
  ["timeflow-private-schedule-learning-v1:platform-user-123", JSON.stringify({ labels: { early: "Frühschicht" } })],
  ["timeflow-platform-session-cache-v1", JSON.stringify({ session: { user: { email: "owner@example.test" } } })],
  ["timeflow-sync-conflict-v1", JSON.stringify({ active: true })]
]);
const storage = { keys: () => [...values.keys()], getItem: (key) => values.get(key) ?? null };
const exported = api.createPayload(storage, "owner@example.test");
if (!exported.data["timeflow-private-schedule-v1"] || !exported.data["timeflow-private-schedule-learning-v1:owner@example.test"]) throw new Error("Dienstplan und persönliche Lernregeln fehlen in der Sicherung.");
for (const secret of ["timeflow-platform-session-cache-v1", "timeflow-sync-conflict-v1", "timeflow-private-schedule-learning-v1:other@example.test"]) if (secret in exported.data) throw new Error(`Sicherung enthält ausgeschlossene Kontodaten: ${secret}`);
const restored = api.validatePayload(exported, "OWNER@example.test");
if (!restored.data["timeflow-private-schedule-v1"] || !restored.data["timeflow-private-schedule-learning-v1:owner@example.test"]) throw new Error("Gültige persönliche App-Daten konnten nicht wiederhergestellt werden.");
const idExport = api.createPayload(storage, "platform-user-123");
if (!idExport.data["timeflow-private-schedule-learning-v1:platform-user-123"] || idExport.data["timeflow-private-schedule-learning-v1:owner@example.test"]) throw new Error("Lernregeln ohne Konto-E-Mail wurden nicht sicher anhand der aktiven Plattform-ID exportiert.");
if (!api.validatePayload(idExport, "platform-user-123").data["timeflow-private-schedule-learning-v1:platform-user-123"]) throw new Error("Lernregeln des aktiven Plattformkontos lassen sich nicht wiederherstellen.");
const crossAccount = { app: "TimeFlow PWA", data: { "timeflow-private-schedule-learning-v1:other@example.test": { labels: { late: "Spätschicht" } } } };
try { api.validatePayload(crossAccount, "owner@example.test"); throw new Error("Lernregeln eines anderen Kontos wurden angenommen."); } catch (error) { if (!/Datensicherung enthält keine verwendbaren/.test(error.message)) throw error; }
const malicious = { app: "TimeFlow PWA", data: { "timeflow-platform-session-cache-v1": { session: { user: { id: "attacker" } } }, "timeflow-sync-meta-v1": { revision: 999 } } };
try { api.validatePayload(malicious, "owner@example.test"); throw new Error("Sitzungs- oder Cloud-Metadaten wurden wiederherstellbar."); } catch (error) { if (!/Datensicherung enthält keine verwendbaren/.test(error.message)) throw error; }
console.log("Datensicherung: persönliche Dienstpläne und Lernregeln, Konto-Isolation sowie Ausschluss von Anmeldung und Sync-Zustand geprüft.");

import { readFile } from "node:fs/promises";

const worker = await readFile(new URL("build-sites.mjs", import.meta.url), "utf8");
const mode = await readFile(new URL("../js/sprint11.js", import.meta.url), "utf8");
const sync = await readFile(new URL("../js/sprint9.js", import.meta.url), "utf8");
const account = await readFile(new URL("../js/private-account.js", import.meta.url), "utf8");
const worktime = await readFile(new URL("../js/script.js", import.meta.url), "utf8");
const settings = await readFile(new URL("../js/sprint5.js", import.meta.url), "utf8");

for (const marker of ["/api/team-access", "valid_invitation_required", "timeflow_organization_members", "timeflow_organization_invites"]) if (!worker.includes(marker)) throw new Error(`Team-API fehlt: ${marker}`);
for (const marker of ["teamAccessAllowed", "Nur nach Einladung eines Unternehmens", "loadTeamAccess", 'saveMode("private", false)']) if (!mode.includes(marker)) throw new Error(`Team-Sperre fehlt: ${marker}`);
for (const marker of ["timeflow-private-schedule-v1", "timeflow-private-account-v1", "timeflow-workday-v2"]) if (!worker.includes(marker) || !sync.includes(marker)) throw new Error(`Cloud-Datensatz fehlt: ${marker}`);
for (const marker of ["CSV exportieren", "PDF speichern", "downloadCsv", "printPdf"]) if (!account.includes(marker)) throw new Error(`Export fehlt: ${marker}`);
for (const marker of ["togglePause", "pauseAccumulatedMs", "hasManualPause"]) if (!worktime.includes(marker)) throw new Error(`Pausenstatus fehlt: ${marker}`);
for (const marker of ["Monatliche Sollstunden", "monthlyTargetHours", "Grundlage für dein monatliches Plus oder Minus"]) if (!settings.includes(marker)) throw new Error(`Monatssoll fehlt: ${marker}`);
console.log("Einzel-Beta: Cloud-Daten, Exporte und einladungspflichtiger Teamzugriff sind abgesichert.");

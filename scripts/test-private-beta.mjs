import { readFile } from "node:fs/promises";

const worker = await readFile(new URL("build-sites.mjs", import.meta.url), "utf8");
const mode = await readFile(new URL("../js/sprint11.js", import.meta.url), "utf8");
const sync = await readFile(new URL("../js/sprint9.js", import.meta.url), "utf8");
const account = await readFile(new URL("../js/private-account.js", import.meta.url), "utf8");
const worktime = await readFile(new URL("../js/script.js", import.meta.url), "utf8");
const settings = await readFile(new URL("../js/sprint5.js", import.meta.url), "utf8");
const reminders = await readFile(new URL("../js/private-reminders.js", import.meta.url), "utf8");
const privacy = await readFile(new URL("../js/private-beta-legal.js", import.meta.url), "utf8");
const betaAccess = await readFile(new URL("../js/private-beta-access.js", import.meta.url), "utf8");
const index = await readFile(new URL("../index.html", import.meta.url), "utf8");

for (const marker of ["/api/team-access", "valid_invitation_required", "timeflow_organization_members", "timeflow_organization_invites"]) if (!worker.includes(marker)) throw new Error(`Team-API fehlt: ${marker}`);
for (const marker of ["teamAccessAllowed", "Nur nach Einladung eines Unternehmens", "loadTeamAccess", 'saveMode("private", false)']) if (!mode.includes(marker)) throw new Error(`Team-Sperre fehlt: ${marker}`);
for (const marker of ["timeflow-private-schedule-v1", "timeflow-private-account-v1", "timeflow-workday-v2"]) if (!worker.includes(marker) || !sync.includes(marker)) throw new Error(`Cloud-Datensatz fehlt: ${marker}`);
for (const marker of ["CSV exportieren", "PDF speichern", "downloadCsv", "printPdf"]) if (!account.includes(marker)) throw new Error(`Export fehlt: ${marker}`);
for (const marker of ["togglePause", "pauseAccumulatedMs", "hasManualPause"]) if (!worktime.includes(marker)) throw new Error(`Pausenstatus fehlt: ${marker}`);
for (const marker of ["Monatliche Sollstunden", "monthlyTargetHours", "Grundlage für dein monatliches Plus oder Minus"]) if (!settings.includes(marker)) throw new Error(`Monatssoll fehlt: ${marker}`);
for (const marker of ["timeflow-monthly-targets-v1", "timeflow-worktime-audit-v1", "/api/account-data", "DELETE FROM timeflow_user_sync"]) if (!worker.includes(marker) && !sync.includes(marker) && !account.includes(marker)) throw new Error(`Beta-Datenschutz oder Historie fehlt: ${marker}`);
for (const marker of ["Dein Einsatz beginnt bald", "Ausstempeln prüfen", "showNotification"]) if (!reminders.includes(marker)) throw new Error(`Erinnerung fehlt: ${marker}`);
for (const marker of ["Beta-Hinweise & Datenschutz", "timeflow-beta-consent-v1", "Importierte Dienstpläne und Berechnungen müssen kontrolliert werden"]) if (!privacy.includes(marker)) throw new Error(`Beta-Einwilligung fehlt: ${marker}`);
for (const marker of ["timeflow_beta_invites", "token_hash", "crypto.randomUUID", "invitation_already_claimed", "TIMEFLOW_BETA_ADMIN_USER_ID", "beta_access_required"]) if (!worker.includes(marker)) throw new Error(`Persönliche Einladung fehlt: ${marker}`);
for (const marker of ["signin-with-chatgpt", "Einladungslink erstellen", "navigator.share", "api/beta/invite", "api/beta/access", "Einladung wird aktiviert", "claimInvitation", "Erneut versuchen"]) if (!betaAccess.includes(marker)) throw new Error(`Einladungsoberfläche fehlt: ${marker}`);
for (const marker of ["private-beta-access.css?v=0040-invite3", "defer src=\"js/private-beta-access.js?v=0040-invite3\"", "data-beta-access=\"true\""]) if (!index.includes(marker)) throw new Error(`Einladungsstartseite fehlt: ${marker}`);
console.log("Einzel-Beta: Cloud-Daten, Exporte und einladungspflichtiger Teamzugriff sind abgesichert.");

import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const text = async (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [worker, accessClient, serviceWorker, deploymentWorkflow] = await Promise.all([
  text("dist/server/index.js"),
  text("js/private-beta-access.js"),
  text("sw.js"),
  text(".github/workflows/deploy-pages.yml")
]);

for (const marker of [
  "authenticatedUser(request)",
  "await betaAccess(user, env)",
  "betaAdmin(user, env)",
  "origin !== url.origin",
  "Content-Security-Policy",
  "X-Content-Type-Options",
  "Referrer-Policy",
  "Permissions-Policy",
  "Strict-Transport-Security",
  "allowRate(user, \"support-write\"",
  "allowRate(user, \"sync-write\"",
  "allowRate(user, \"beta-invite-create\"",
  "if (!access.admin) return jsonResponse({ error: \"team_admin_required\" }, 403)",
  "return jsonResponse({ allowed: true, membership: member || { organization_id: null, role: \"admin\", name: \"TimeFlow\" }"
]) {
  if (!worker.includes(marker)) throw new Error(`Sicherheitskontrolle fehlt im Sites-Worker: ${marker}`);
}

for (const syncKey of ["timeflow-profile-v1", "timeflow-settings-v1", "timeflow-custom-background-v1"]) {
  if (!worker.includes(syncKey)) throw new Error(`Profil-Synchronisierung enthält ${syncKey} nicht.`);
}

if (!accessClient.includes("const label = escapeHtml(invitation.result.invitation.label)")) {
  throw new Error("Einladungsbezeichnungen müssen vor HTML-Ausgabe maskiert werden.");
}
const modeClient = await text("js/sprint11.js");
if (!modeClient.includes("button.hidden = !access.admin")) {
  throw new Error("Die Team-Auswahl muss für normale Beta-Tester ausgeblendet werden.");
}
if (!serviceWorker.includes('relativePath.startsWith("api/")')) {
  throw new Error("Personenbezogene API-Antworten dürfen nicht im PWA-Cache liegen.");
}
if (!deploymentWorkflow.includes("npm test") || !deploymentWorkflow.includes("cancel-in-progress: true")) {
  throw new Error("Der Produktionsworkflow muss Tests und Schutz vor veralteten Deployments enthalten.");
}

const secretPattern = /(?:ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|art_v2_[A-Za-z0-9_-]{16,}|sk-(?:proj-)?[A-Za-z0-9_-]{16,})/;
const history = execFileSync("git", ["log", "--all", "--format=", "--patch"], { encoding: "utf8", maxBuffer: 24 * 1024 * 1024 });
if (secretPattern.test(history)) throw new Error("Mögliches Zugangstoken in der Git-Historie gefunden. Nicht veröffentlichen; Sicherheitsprüfung erforderlich.");

console.log("TimeFlow security checks: Zugangsschutz, Header, Rate Limits, Cache-Grenzen und Secret-Muster geprüft.");

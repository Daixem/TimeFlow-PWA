import { readFile } from "node:fs/promises";

const workflow = await readFile(new URL("../.github/workflows/deploy-pages.yml", import.meta.url), "utf8");
const verifyWorkflow = await readFile(new URL("../.github/workflows/verify-change.yml", import.meta.url), "utf8");
const worker = await readFile(new URL("../dist/server/index.js", import.meta.url), "utf8");
const clientSync = await readFile(new URL("../js/sprint9.js", import.meta.url), "utf8");
const preprodConfig = await readFile(new URL("../wrangler.preprod.jsonc", import.meta.url), "utf8");

for (const marker of ["npm test", "GITHUB_SHA", "actions/deploy-pages@v4", "cancel-in-progress: true", "Aktuellen Main-Commit verifizieren", "github.ref == 'refs/heads/main'"]) {
  if (!workflow.includes(marker)) throw new Error(`GitHub-Pages-Deployment fehlt: ${marker}`);
}

if (!worker.includes('const MAIN_RELEASE_ORIGIN = "https://daixem.github.io/TimeFlow-PWA/"')) throw new Error("Der gemeinsame Main-Release der Private Beta fehlt.");
if (!worker.includes("latestMainAsset(request, url, env)")) throw new Error("Die Private Beta übernimmt standardmäßig den Main-Stand nicht.");
if (!worker.includes('env?.TIMEFLOW_ASSET_SOURCE === "bundled"')) throw new Error("Eine isolierte Pre-Prod-Oberfläche kann nicht ausgewählt werden.");
if (!worker.includes("timeflow_release")) throw new Error("Die Private Beta umgeht veraltete Main-Release-Caches nicht.");
if (!worker.includes('url.pathname === "/version.json"')) throw new Error("Build-Nachweis der Private Beta fehlt.");
if (!preprodConfig.includes('"keep_vars": true')) throw new Error("Cloudflare muss vertrauliche Laufzeitwerte beim Git-Deploy erhalten.");
if (preprodConfig.includes('"TIMEFLOW_BETA_ADMIN_USER_FINGERPRINT"')) throw new Error("Der Admin-Fingerabdruck darf nicht erneut in der öffentlichen Konfiguration stehen.");
if (!worker.includes("const BUILD_VERSION =") || !worker.includes("const BUILD_METADATA =")) throw new Error("Vollständige Commit-Version fehlt im Hosting-Build.");
if (!worker.includes("function isLearningSnapshotKey(key)") || !worker.includes("timeflow-private-schedule-learning-v1:[A-Za-z0-9._@:+-]{1,256}")) throw new Error("Kontobezogene Lernregeln sind nicht sicher für die Cloud-Synchronisierung freigegeben.");
for (const marker of ["function accountLearningKey()", "const LEARNING_KEY_PREFIX", "platformAccountId = String(event.detail?.user?.id || \"\").trim()"] ) if (!clientSync.includes(marker)) throw new Error(`Kontobezogener Lernregel-Sync fehlt: ${marker}`);

if (workflow.includes("timeflow-connect.daixem.chatgpt.site/version.json")) throw new Error("GitHub Pages darf nicht auf den separaten Beta-Host warten oder dessen Veröffentlichung als Fehler werten.");

for (const marker of ["pull_request:", "branches-ignore:", "npm test", "npm run build:pages", "GITHUB_SHA", "cancel-in-progress: true"]) {
  if (!verifyWorkflow.includes(marker)) throw new Error(`Gemeinsame Cloud-/Arbeitsbranch-Prüfung fehlt: ${marker}`);
}

console.log("Arbeitsbranches, GitHub Pages und Private Beta verwenden denselben überprüfbaren Main-Release ohne fehleranfällige Wartezeit.");

import { readFile } from "node:fs/promises";

const workflow = await readFile(new URL("../.github/workflows/deploy-pages.yml", import.meta.url), "utf8");
const worker = await readFile(new URL("../dist/server/index.js", import.meta.url), "utf8");

for (const marker of ["npm test", "GITHUB_SHA", "actions/deploy-pages@v4"]) {
  if (!workflow.includes(marker)) throw new Error(`GitHub-Pages-Deployment fehlt: ${marker}`);
}

if (!worker.includes('const MAIN_RELEASE_ORIGIN = "https://daixem.github.io/TimeFlow-PWA"')) throw new Error("Der gemeinsame Main-Release der Private Beta fehlt.");
if (!worker.includes("latestMainAsset(request, url)")) throw new Error("Die Private Beta übernimmt den Main-Stand nicht.");
if (!worker.includes("timeflow_release")) throw new Error("Die Private Beta umgeht veraltete Main-Release-Caches nicht.");
if (!worker.includes('url.pathname === "/version.json"')) throw new Error("Build-Nachweis der Private Beta fehlt.");
if (!worker.includes("const BUILD_VERSION =")) throw new Error("Commit-Version fehlt im Hosting-Build.");

if (workflow.includes("timeflow-connect.daixem.chatgpt.site/version.json")) throw new Error("GitHub Pages darf nicht auf den separaten Beta-Host warten oder dessen Veröffentlichung als Fehler werten.");

console.log("GitHub Pages veröffentlicht den Main-Stand unabhängig; die Private Beta übernimmt die App-Dateien ohne fehleranfällige Workflow-Wartezeit.");

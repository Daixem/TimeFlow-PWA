import { readFile } from "node:fs/promises";

const workflow = await readFile(new URL("../.github/workflows/deploy-pages.yml", import.meta.url), "utf8");
const worker = await readFile(new URL("../dist/server/index.js", import.meta.url), "utf8");

for (const marker of [
  "GITHUB_SHA",
  "timeflow-connect.daixem.chatgpt.site/version.json",
  "SOLL BIS HEUTE"
]) {
  if (!workflow.includes(marker)) throw new Error(`Private-Beta-Deployment fehlt: ${marker}`);
}

if (!worker.includes('const MAIN_RELEASE_ORIGIN = "https://daixem.github.io/TimeFlow-PWA"')) throw new Error("Der gemeinsame Main-Release der Private Beta fehlt.");
if (!worker.includes("latestMainAsset(request, url)")) throw new Error("Die Private Beta übernimmt den Main-Stand nicht.");
if (!worker.includes('url.pathname === "/version.json"')) throw new Error("Build-Nachweis der Private Beta fehlt.");
if (!worker.includes("const BUILD_VERSION =")) throw new Error("Commit-Version fehlt im Hosting-Build.");

console.log("GitHub Pages und Private Beta verwenden denselben Main-Stand und werden gemeinsam geprüft.");

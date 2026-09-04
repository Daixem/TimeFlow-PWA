import { readFile } from "node:fs/promises";

const workflow = await readFile(new URL("../.github/workflows/deploy-pages.yml", import.meta.url), "utf8");
const worker = await readFile(new URL("../dist/server/index.js", import.meta.url), "utf8");

for (const marker of [
  "TIMEFLOW_PRIVATE_BETA_DEPLOY_HOOK",
  "appgprj_6a691ed2b46481918ff80390110ca2a6",
  "GITHUB_REF_NAME",
  "GITHUB_SHA",
  "timeflow-connect.daixem.chatgpt.site/version.json",
  "SOLL BIS HEUTE"
]) {
  if (!workflow.includes(marker)) throw new Error(`Private-Beta-Deployment fehlt: ${marker}`);
}

if (!worker.includes('url.pathname === "/version.json"')) throw new Error("Build-Nachweis der Private Beta fehlt.");
if (!worker.includes("const BUILD_VERSION =")) throw new Error("Commit-Version fehlt im Hosting-Build.");

console.log("GitHub Pages und Private Beta werden aus demselben main-Commit veröffentlicht und geprüft.");

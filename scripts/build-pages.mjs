import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const root = new URL("../", import.meta.url);
const output = new URL("../_site/", import.meta.url);
const entries = ["index.html", "manifest.webmanifest", "sw.js", "assets", "css", "js"];
let build = process.env.GITHUB_SHA;
if (!build) build = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
build = build.slice(0, 12).replace(/[^a-zA-Z0-9._-]/g, "");
if (!build) throw new Error("Keine gültige Build-Kennung verfügbar.");

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const entry of entries) await cp(new URL(entry, root), new URL(entry, output), { recursive: true });

async function stampBuild(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);
    if (entry.isDirectory()) await stampBuild(target);
    else if (/\.(?:html|css|js|json|webmanifest|svg)$/.test(entry.name)) {
      const source = await readFile(target, "utf8");
      await writeFile(target, source.replaceAll("__TIMEFLOW_BUILD__", build), "utf8");
    }
  }
}
await stampBuild(output);
await writeFile(new URL("version.json", output), `${JSON.stringify({ build })}\n`, "utf8");
await writeFile(new URL(".nojekyll", output), "", "utf8");
console.log(`GitHub-Pages-Build ${build} wurde erstellt.`);

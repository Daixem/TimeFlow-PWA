import { access, readFile, readdir, stat } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { extname, join, normalize } from "node:path";

const root = new URL("../", import.meta.url);
const output = new URL("../_site/", import.meta.url);
const textExtensions = new Set([".css", ".html", ".js", ".json", ".svg", ".webmanifest"]);
const requiredFeatures = [
  ["Arbeitszeitkonto", "js/private-account.js"],
  ["Dienstplan", "js/private-schedule-import.js"],
  ["Wochen-Navigation", "js/sprint5.js"],
  ["Krankheit/Urlaub/Frei", "js/private-account.js"],
  ["Sprachumschaltung", "js/ui-localization.js"],
  ["Personalisierung", "js/private-beta-personalization.js"]
];

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

await access(output);
const version = JSON.parse(await readFile(new URL("version.json", output), "utf8"));
if (!/^[a-f0-9]{40}$/i.test(version.commit || "") || !/^[a-f0-9]{12}-\d{8}t\d{9}z$/i.test(version.build || "") || Number.isNaN(new Date(version.builtAt).getTime())) {
  throw new Error("version.json enthält keine vollständige Build-Metadaten.");
}
const currentCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim().toLowerCase();
if (currentCommit !== version.commit) throw new Error("Produktions-Build stammt nicht aus dem aktuellen HEAD-Commit.");

for (const file of await walk(output)) {
  if (!textExtensions.has(extname(file.pathname))) continue;
  if ((await readFile(file, "utf8")).includes("__TIMEFLOW_BUILD__")) throw new Error(`Nicht ersetzter Build-Platzhalter: ${file.pathname}`);
}

const index = await readFile(new URL("index.html", output), "utf8");
for (const match of index.matchAll(/(?:src|href)="([^"#?]+)(?:\?[^\"]*)?"/g)) {
  const asset = match[1];
  if (/^(?:https?:|data:|#)/.test(asset)) continue;
  const target = new URL(asset, output);
  try { await stat(target); } catch { throw new Error(`Index referenziert fehlendes Asset: ${asset}`); }
}
for (const file of ["manifest.webmanifest", "sw.js", "assets/icons/timeflow-icon-192.png", "assets/icons/timeflow-icon-512.png", "assets/icons/timeflow-maskable-512.png"]) await access(new URL(file, output));

const manifest = JSON.parse(await readFile(new URL("manifest.webmanifest", output), "utf8"));
for (const icon of manifest.icons || []) await access(new URL(icon.src, output));
const worker = await readFile(new URL("sw.js", output), "utf8");
if (!worker.includes(`const BUILD_VERSION = "${version.build}"`) || !worker.includes("self.skipWaiting()") || !worker.includes("self.clients.claim()")) throw new Error("Service Worker ist nicht für diesen Produktions-Build vorbereitet.");
for (const [name, file] of requiredFeatures) {
  await access(new URL(file, output));
  if (!(await readFile(new URL(file, output), "utf8")).trim()) throw new Error(`${name} fehlt im Produktions-Build.`);
}

console.log(`Produktions-Build geprüft: ${version.build} (${version.commit}).`);

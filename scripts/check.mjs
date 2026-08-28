import { access, readFile } from "node:fs/promises";

const required = [
  "index.html",
  "manifest.webmanifest",
  "sw.js",
  "css/style.css",
  "css/pwa.css",
  "css/sprint3.css",
  "css/sprint4.css",
  "css/stamp.css",
  "js/script.js",
  "js/sprint3.js",
  "js/sprint4.js",
  "js/stamp.js",
  "assets/icons/timeflow-icon.svg",
  "assets/icons/timeflow-icon-192.png",
  "assets/icons/timeflow-icon-512.png",
  "assets/icons/timeflow-maskable-512.png"
];

for (const file of required) await access(file);
const manifest = JSON.parse(await readFile("manifest.webmanifest", "utf8"));
if (!manifest.name || !manifest.start_url || manifest.icons?.length < 3) {
  throw new Error("Manifest ist unvollständig.");
}
const shell = await readFile("sw.js", "utf8");
for (const file of required) {
  if (!shell.includes(file) && file !== "sw.js") throw new Error(`${file} fehlt im App-Cache.`);
}
console.log("TimeFlow PWA: Struktur, Manifest und App-Cache sind vollständig.");

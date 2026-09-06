import { readFile } from "node:fs/promises";

const [worker, manifestText, favicon, phoenix192, icon192, phoenix512, icon512] = await Promise.all([
  readFile("sw.js", "utf8"),
  readFile("manifest.webmanifest", "utf8"),
  readFile("assets/icons/timeflow-icon.svg", "utf8"),
  readFile("assets/icons/timeflow-phoenix-icon-192.png"),
  readFile("assets/icons/timeflow-icon-192.png"),
  readFile("assets/icons/timeflow-phoenix-icon-512.png"),
  readFile("assets/icons/timeflow-icon-512.png")
]);

const manifest = JSON.parse(manifestText);
const expectedIcons = [
  "assets/icons/timeflow-phoenix-icon-192.png",
  "assets/icons/timeflow-phoenix-icon-512.png",
  "assets/icons/timeflow-phoenix-maskable-512.png"
];
if (manifest.icons?.map((icon) => icon.src).join("|") !== expectedIcons.join("|")) throw new Error("Das Manifest referenziert nicht ausschließlich die Phoenix-PWA-Icons.");
if (!favicon.includes('href="timeflow-phoenix-icon-512.png"')) throw new Error("Der Browser-Favicon verweist nicht auf den Phoenix.");
if (!icon192.equals(phoenix192) || !icon512.equals(phoenix512)) throw new Error("Ein bestehender Plattform-Iconpfad enthält noch das alte Uhrsymbol.");

for (const marker of [
  'const CACHE_PREFIX = "timeflow-"',
  'const CACHE_NAME = `${CACHE_PREFIX}app-${BUILD_VERSION}`',
  'key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME',
  "caches.delete(key)",
  "self.skipWaiting()",
  "self.clients.claim()",
  'relativePath === "version.json"',
  'fetch(event.request, { cache: "no-store" })'
]) if (!worker.includes(marker)) throw new Error(`PWA-Cache-Härtung fehlt: ${marker}`);

const versionGuard = worker.slice(worker.indexOf('relativePath === "version.json"'), worker.indexOf('if (event.request.mode === "navigate")'));
if (versionGuard.includes("cacheSuccessful") || versionGuard.includes("caches.match")) throw new Error("version.json darf nicht aus dem statischen App-Cache kommen.");
if (!worker.includes('relativePath.startsWith("api/")')) throw new Error("API-Antworten sind nicht ausdrücklich aus dem App-Cache ausgeschlossen.");

console.log("PWA-Cache: build-spezifisch, Phoenix-basiert und ohne gecachte Build-Metadaten.");

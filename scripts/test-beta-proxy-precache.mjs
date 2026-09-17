import { readFile } from "node:fs/promises";
import worker from "../dist/server/index.js";

const [shell, index, privateHome] = await Promise.all([
  readFile(new URL("../sw.js", import.meta.url), "utf8"),
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../js/private-home.js", import.meta.url), "utf8")
]);

const shellAssets = new Set([...shell.matchAll(/"((?:js|css)\/[^"]+)"/g)].map((match) => match[1].split("?")[0]));
const indexAssets = [
  ...[...index.matchAll(/<(?:script|link)\b[^>]+(?:src|href)="((?:js|css)\/[^"?]+)/g)].map((match) => match[1]),
  ...[...privateHome.matchAll(/\.src = "((?:js|css)\/[^"?]+)/g)].map((match) => match[1])
];
for (const asset of indexAssets) {
  if (!shellAssets.has(asset)) throw new Error(`Lokale Runtime-Datei fehlt im App-Shell-Precache: ${asset}`);
}

const originalFetch = globalThis.fetch;
const proxiedUrls = [];
globalThis.fetch = async (input) => {
  proxiedUrls.push(String(input));
  return new Response("release", { status: 200 });
};
try {
  const response = await worker.fetch(new Request("https://timeflow.test/index.html"), {});
  if (response.status !== 200) throw new Error("Der Beta-Proxy liefert den Main-Release nicht aus.");
} finally {
  globalThis.fetch = originalFetch;
}

if (new URL(proxiedUrls[0]).pathname !== "/TimeFlow-PWA/index.html") {
  throw new Error(`Der Beta-Proxy verwendet einen falschen GitHub-Pages-Pfad: ${proxiedUrls[0] || "kein Upstream-Request"}`);
}
if (!shell.includes('"js/work-time-api.js?v=__TIMEFLOW_BUILD__"') || !shell.includes('"js/sync-conflict.js?v=__TIMEFLOW_BUILD__"')) {
  throw new Error("Work-Time- oder Sync-Konfliktlogik fehlt im deterministischen Offline-Precache.");
}

console.log("Beta-Proxy-Pfad und vollständiger lokaler Runtime-Precache geprüft.");

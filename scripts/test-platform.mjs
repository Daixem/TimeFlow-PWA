import { readdir, readFile } from "node:fs/promises";

const index = await readFile("index.html", "utf8");
const manifest = JSON.parse(await readFile("manifest.webmanifest", "utf8"));
const worker = await readFile("sw.js", "utf8");
const compatibility = await readFile("css/compat.css", "utf8");
for (const marker of ["safe-area-inset-top", "tf-platform-ios", "tf-platform-ipados"]) if (!compatibility.includes(marker)) throw new Error(`iOS-Sicherheitsabstand fehlt: ${marker}`);
const platform = await readFile("js/platform.js", "utf8");

if (index.indexOf("js/platform.js?v=__TIMEFLOW_BUILD__") < 0 || index.indexOf("js/platform.js?v=__TIMEFLOW_BUILD__") > index.indexOf("js/script.js?v=__TIMEFLOW_BUILD__")) {
  throw new Error("Die Plattformbasis wird nicht vor den Funktionsskripten geladen.");
}
for (const asset of ["js/platform.js?v=__TIMEFLOW_BUILD__", "css/compat.css?v=__TIMEFLOW_BUILD__"]) {
  if (!worker.includes(asset)) throw new Error(`Der Offline-Cache enthält ${asset} nicht.`);
}
for (const marker of ["ios", "ipados", "android", "windows", "macos", "linux", "visualViewport", "createStorage"]) {
  if (!platform.includes(marker)) throw new Error(`Plattformmerkmal fehlt: ${marker}`);
}
for (const marker of ["pointer: coarse", "orientation: landscape", "forced-colors: active", "safe-area-inset-bottom"]) {
  if (!compatibility.includes(marker)) throw new Error(`Responsive Schutzregel fehlt: ${marker}`);
}
if (manifest.display !== "standalone" || manifest.orientation !== "any" || manifest.scope !== "./") {
  throw new Error("Das Manifest unterstützt nicht alle vorgesehenen Geräteausrichtungen.");
}

const scriptFiles = (await readdir("js")).filter((file) => file.endsWith(".js") && file !== "platform.js");
for (const file of scriptFiles) {
  const source = await readFile(`js/${file}`, "utf8");
  if (/\b(?:localStorage|sessionStorage)\b/.test(source)) throw new Error(`${file} umgeht den sicheren Plattformspeicher.`);
  if (/\.showModal\(\)/.test(source)) throw new Error(`${file} umgeht den kompatiblen Dialog-Adapter.`);
}

console.log("Gerätematrix: Plattform, Speicher, Dialoge, Viewports, Ausrichtung und Offline-Assets sind abgesichert.");

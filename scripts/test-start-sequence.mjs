import { readFile } from "node:fs/promises";

const [shell, sync, branding, sprint11, index] = await Promise.all([
  readFile("js/shell.js", "utf8"),
  readFile("js/sprint9.js", "utf8"),
  readFile("js/branding-splash.js", "utf8"),
  readFile("js/sprint11.js", "utf8"),
  readFile("index.html", "utf8")
]);

if (!shell.includes("var repairQueued") || !shell.includes("event.persisted")) {
  throw new Error("Die Shell bündelt Start-Reparaturen nicht kontrolliert.");
}
if (sync.includes("window.location.reload()") || !sync.includes("timeflow:sync-restored")) {
  throw new Error("Die Start-Synchronisierung führt noch einen Voll-Reload aus.");
}
if (sprint11.includes("timeflowLaunch") || sprint11.includes("installTimeFlowLaunch")) {
  throw new Error("Neben der zentralen Startansicht wird noch eine zweite Startansicht erzeugt.");
}
if (!branding.includes("DOMContentLoaded") || !branding.includes("520")) {
  throw new Error("Die zentrale Startansicht wird nicht kontrolliert beendet.");
}
if (!index.includes("controllerReloadHandled") || !index.includes("navigator.serviceWorker.addEventListener(\"controllerchange\"")) {
  throw new Error("Die Service-Worker-Update-Sperre für Reloads fehlt.");
}

console.log("Startsequenz: ein zentraler Startbildschirm, keine Sync-Neuladung und gebündelte Shell-Reparatur geprüft.");

import { readFile } from "node:fs/promises";
const script = await readFile(new URL("../js/settings-organization.js", import.meta.url), "utf8");
const css = await readFile(new URL("../css/settings-organization.css", import.meta.url), "utf8");
const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
for (const marker of ["data-language-select", "Deutsch", "English", "applyLanguage", "Darstellung & Sprache", "Arbeitszeit & Schutz", "App & Updates", "aria-expanded", "MutationObserver"]) if (!script.includes(marker)) throw new Error(`Einstellungsorganisation fehlt: ${marker}`);
for (const marker of ["settings-accordion-body", "settings-chevron", "profile-language-select", "max-width:430px"]) if (!css.includes(marker)) throw new Error(`Darstellung der Einstellungen fehlt: ${marker}`);
for (const marker of ["css/settings-organization.css?v=0040-settings1", "js/settings-organization.js?v=0040-settings1", "sw.js?v=0040-beta8"]) if (!index.includes(marker)) throw new Error(`Asset fehlt: ${marker}`);
console.log("Profil-Sprache und aufklappbare Einstellungsgruppen sind verbunden.");

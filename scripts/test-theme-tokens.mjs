import { readFile } from "node:fs/promises";

const theme = await readFile(new URL("../css/theme-personalization.css", import.meta.url), "utf8");
const glass = await readFile(new URL("../css/unified-glass.css", import.meta.url), "utf8");
const personalization = await readFile(new URL("../js/private-beta-personalization.js", import.meta.url), "utf8");

const semanticTokens = [
  "--tf-surface", "--tf-surface-elevated", "--tf-card-background",
  "--tf-navigation-background", "--tf-dialog-background", "--tf-input-background",
  "--tf-border", "--tf-divider", "--tf-text-primary", "--tf-text-secondary",
  "--tf-text-muted", "--tf-accent", "--tf-shadow"
];

for (const token of semanticTokens) {
  if (!theme.includes(`${token}:`)) throw new Error(`Zentraler Theme-Token fehlt: ${token}`);
}

for (const marker of ["data-tf-background=\"custom\"", "--tf-custom-color", "--tf-custom-rgb"]) {
  if (!theme.includes(marker)) throw new Error(`Freie Farbwahl fehlt: ${marker}`);
}
for (const marker of ["data-custom-background-color", "customBackgroundColor", "applyCustomColor", "--tf-text-primary"]) {
  if (!personalization.includes(marker)) throw new Error(`Freie Farbwahl ist nicht vollständig verbunden: ${marker}`);
}

for (const token of ["--tf-glass-panel", "--tf-glass-separator", "--tf-glass-shadow"]) {
  if (glass.includes(token)) throw new Error(`Historischer Glass-Token bleibt als zweite Theme-Quelle aktiv: ${token}`);
}

for (const [component, token] of [
  ["navigation", "--tf-navigation-background"],
  ["controls", "--tf-input-background"],
  ["surfaces", "--tf-card-background"],
  ["dividers", "--tf-divider"]
]) {
  if (!glass.includes(token)) throw new Error(`Zentraler ${component}-Token wird nicht verwendet: ${token}`);
}

for (const selector of [
  "Palette contract", ".timeflow-team-mode", ".brand-splash,.beta-access-gate",
  "dialog,.notification-center", "button,[role=\"button\"]"
]) {
  if (!glass.includes(selector)) throw new Error(`Palette ist nicht für ${selector} vollständig verbunden.`);
}

// The mode classes live on <html>, alongside data-tf-background. Keeping a
// descendant combinator between those selectors silently disables the rules.
const brokenModeScope = /html\[data-tf-background\]\s+:is\(\.timeflow-private-mode,\s*\.timeflow-team-mode\)/;
if (brokenModeScope.test(glass)) {
  throw new Error("Theme-Regeln suchen den Modus als Nachfahren statt direkt auf <html>.");
}
if (!glass.includes("html[data-tf-background]:is(.timeflow-private-mode,.timeflow-team-mode)")) {
  throw new Error("Theme-Regeln sind nicht direkt an die Modi auf <html> gebunden.");
}

for (const surface of [
  ".week-summary", ".week-summary > span + span", ".shift-grid", ".profile-hero",
  ".profile-permission-button", ".statistics-tabs", ".settings-about", ".settings-card",
  ".cloud-sync-card", ".release-readiness-card", ".private-account-audit"
]) {
  if (!glass.includes(surface)) throw new Error(`Einheitliche Kartenregeln fehlen für ${surface}.`);
}

const teamPalette = glass.slice(glass.lastIndexOf("/* Team-only content uses the selected palette too."));
for (const surface of [".team-avatar", ".team-invite-steps b", ".team-card .team-update", ".team-empty-state", "#schedulePage.team-data-empty::after"]) {
  if (!teamPalette.includes(surface)) throw new Error(`Teamansicht hat keine Theme-Regel für ${surface}.`);
}
for (const token of ["--tf-text-secondary", "--tf-accent-contrast", "--tf-divider", "--tf-card-background"]) {
  if (!teamPalette.includes(token)) {
    throw new Error(`Teamansicht ist nicht vollständig an das gewählte Farbschema gebunden: ${token}.`);
  }
}
const themedSwitches = glass.slice(glass.lastIndexOf("/* Custom switches were still fixed to blue after a palette change."));
for (const selector of [".settings-toggle", ".managed-user-toggle", ".detail-content", "input:checked+ i", "input:focus-visible+ i"]) {
  if (!themedSwitches.includes(selector)) throw new Error(`Theme-Farbe fehlt bei einem Schalter: ${selector}.`);
}

console.log("Theme-Tokens: Palette, Fenster, Navigation, Controls und Texte sind zentral verbunden.");

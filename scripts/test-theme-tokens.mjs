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

console.log("Theme-Tokens: Palette, Fenster, Navigation, Controls und Texte sind zentral verbunden.");

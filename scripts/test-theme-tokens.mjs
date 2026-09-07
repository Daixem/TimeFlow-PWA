import { readFile } from "node:fs/promises";

const theme = await readFile(new URL("../css/theme-personalization.css", import.meta.url), "utf8");
const glass = await readFile(new URL("../css/unified-glass.css", import.meta.url), "utf8");

const semanticTokens = [
  "--tf-surface", "--tf-surface-elevated", "--tf-card-background",
  "--tf-navigation-background", "--tf-dialog-background", "--tf-input-background",
  "--tf-border", "--tf-divider", "--tf-text-primary", "--tf-text-secondary",
  "--tf-text-muted", "--tf-accent", "--tf-shadow"
];

for (const token of semanticTokens) {
  if (!theme.includes(`${token}:`)) throw new Error(`Zentraler Theme-Token fehlt: ${token}`);
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

console.log("Theme-Tokens: zentrale Surface-, Navigation-, Control- und Textwerte sind konsolidiert.");

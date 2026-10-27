# Veröffentlichungsweg und aktueller Stand

Den belegten Stand der einzelnen Veröffentlichungen beschreibt
[Status-2026-10-27.md](Status-2026-10-27.md). Dieser Text beschreibt den
tatsächlich eingerichteten Ablauf und keine geplante Zielarchitektur.

## Verbindliche Quelle

`Daixem/TimeFlow-PWA:main` ist die einzige Quelle für einen produktiven
TimeFlow-App-Stand. Der normale Weg ist: Änderung prüfen, nach `main` übernehmen
und den automatischen Release abwarten. Ein Branch ist kein Release.

## GitHub Pages

Der Workflow `.github/workflows/deploy-pages.yml` startet bei jedem Push nach
`main`. Er prüft den ausgecheckten Commit, führt `npm test` aus, erstellt einen
frischen `_site`-Build und veröffentlicht ausschließlich dieses Artefakt. Die
Concurrency-Gruppe bricht einen älteren laufenden Deployment-Lauf ab, wenn ein
neuerer `main`-Commit eintrifft.

Der GitHub-Pages-Workflow ist für `main` aktiv. Der jüngste geprüfte Lauf war
für den aktuellen `main`-Commit erfolgreich. Ein erfolgreicher Pages-Lauf
bestätigt nur die statische PWA, nicht die Sites-App oder deren Serverfunktionen.

`scripts/build-metadata.mjs` bildet die einheitliche Versionsinformation. Ein
offizieller Release-Build bricht ab, wenn `git status --porcelain` Änderungen
oder untracked Dateien meldet. Ein Build schlägt ebenfalls fehl, wenn
`GITHUB_SHA` nicht dem tatsächlich ausgecheckten HEAD entspricht. Für reine
lokale Entwicklungsprüfungen steht `npm run build:dev` zur Verfügung;
`npm run build` und `npm run build:pages` sind Release-Builds.
`scripts/verify-production-build.mjs` stoppt den Release bei
unersetzten Build-Platzhaltern, fehlenden referenzierten Dateien, ungültigem
Manifest oder fehlender Service-Worker-Versionierung.

## Was `main` derzeit veröffentlicht

Ein Push nach `main` veröffentlicht die statische PWA über GitHub Pages. Die
Sites-Veröffentlichung und ihre Serverfunktionen werden dabei nicht automatisch
aktualisiert. Der derzeit aktive Sites-Stand ist älter als `main`.

Das Sites-Projekt stellt Anmeldung, Einladungen, API und eine verwaltete
Datenbank bereit. Seine Veröffentlichung ist derzeit ein eigener Schritt.
Cloudflare Pre-Prod ist ein geschützter Testserver mit einer Test-Datenbank und
ist keine Produktionsveröffentlichung. Es gibt aktuell keinen nachgewiesenen
automatischen Weg, der aus einem `main`-Push sowohl die öffentliche PWA als
auch sämtliche Serverfunktionen aktualisiert.

## Ziel und Sicherheitsgrenze

Der gewünschte Zielzustand ist eine gemeinsame Quelle in `main`, aus der die
öffentliche PWA und Serverfunktionen kontrolliert veröffentlicht werden.
Dieser Ablauf ist noch nicht eingerichtet. Zugangsdaten, Schlüssel und
Nutzerdaten gehören in die jeweiligen geschützten Cloudflare-Einstellungen
oder Datenbanken, nie in GitHub. Vor Änderungen an Produktionsdaten sind ein
aktueller Export, ein getesteter Wiederherstellungsweg und ein Rückfallplan
erforderlich.

## PWA-Updates

Jeder Build erhält neue Asset-Parameter und einen eigenen
`timeflow-app-<build-id>`-Cache. Der Service Worker aktiviert sich kontrolliert,
entfernt nur vorherige TimeFlow-Caches und speichert keine API-Antworten.
localStorage, IndexedDB, Cookies und D1 gehören nicht zu dieser Bereinigung.

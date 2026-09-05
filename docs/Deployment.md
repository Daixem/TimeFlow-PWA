# Einheitlicher Release-Workflow

## Verbindliche Quelle

`Daixem/TimeFlow-PWA:main` ist die einzige Quelle für einen produktiven
TimeFlow-Stand. Codex und Cloud-Aufgaben arbeiten mit demselben Repository:
Änderung auf einem Arbeitsbranch, Prüfung, Merge nach `main`, danach Release.
Ein Branch ist kein Release.

## GitHub Pages

Der Workflow `.github/workflows/deploy-pages.yml` startet bei jedem Push nach
`main`. Er prüft den ausgecheckten Commit, führt `npm test` aus, erstellt einen
frischen `_site`-Build und veröffentlicht ausschließlich dieses Artefakt. Die
Concurrency-Gruppe bricht einen älteren laufenden Deployment-Lauf ab, wenn ein
neuerer `main`-Commit eintrifft.

**Einmalige Repository-Einstellung:** In GitHub unter **Settings → Pages →
Build and deployment → Source** muss **GitHub Actions** ausgewählt sein. Bei
der Bestandsaufnahme lieferte die öffentliche Pages-URL trotz eines erfolgreichen
Actions-Laufs noch den Repository-Quellordner (einschließlich
`__TIMEFLOW_BUILD__`) aus; `version.json` war dort nicht vorhanden. Diese
Einstellung liegt außerhalb des Repositories und kann nicht sicher durch Code
oder einen erfundenen API-Hook ersetzt werden.

`scripts/build-metadata.mjs` bildet die einheitliche Versionsinformation. Ein
Build schlägt fehl, wenn `GITHUB_SHA` nicht dem tatsächlich ausgecheckten HEAD
entspricht. `scripts/verify-production-build.mjs` stoppt den Release bei
unersetzten Build-Platzhaltern, fehlenden referenzierten Dateien, ungültigem
Manifest oder fehlender Service-Worker-Versionierung.

## Bestehende Private Beta

Das bereits gebundene Projekt aus `.openai/hosting.json` bleibt unverändert.
Der Worker leitet statische PWA-Dateien an den veröffentlichten GitHub-Pages-
Stand von `main` weiter, behält aber Anmeldung, Einladungen, API und D1 im
bestehenden Hosting-Projekt. Für Änderungen an dieser Worker-Laufzeit muss die
vorhandene ChatGPT-Sites-Veröffentlichung verwendet werden. Im Repository ist
keine verifizierte automatische GitHub-zu-Sites-Schnittstelle hinterlegt; sie
wird deshalb nicht behauptet oder simuliert.

## PWA-Updates

Jeder Build erhält neue Asset-Parameter und einen eigenen
`timeflow-app-<build-id>`-Cache. Der Service Worker aktiviert sich kontrolliert,
entfernt nur vorherige TimeFlow-Caches und speichert keine API-Antworten.
localStorage, IndexedDB, Cookies und D1 gehören nicht zu dieser Bereinigung.

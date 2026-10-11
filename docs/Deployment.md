# Einheitlicher Release-Workflow

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

**Einmalige Repository-Einstellung:** In GitHub unter **Settings → Pages →
Build and deployment → Source** muss **GitHub Actions** ausgewählt sein. Bei
der Bestandsaufnahme lieferte die öffentliche Pages-URL trotz eines erfolgreichen
Actions-Laufs noch den Repository-Quellordner (einschließlich
`__TIMEFLOW_BUILD__`) aus; `version.json` war dort nicht vorhanden. Diese
Einstellung liegt außerhalb des Repositories und kann nicht sicher durch Code
oder einen erfundenen API-Hook ersetzt werden.

`scripts/build-metadata.mjs` bildet die einheitliche Versionsinformation. Ein
offizieller Release-Build bricht ab, wenn `git status --porcelain` Änderungen
oder untracked Dateien meldet. Ein Build schlägt ebenfalls fehl, wenn
`GITHUB_SHA` nicht dem tatsächlich ausgecheckten HEAD entspricht. Für reine
lokale Entwicklungsprüfungen steht `npm run build:dev` zur Verfügung;
`npm run build` und `npm run build:pages` sind Release-Builds.
`scripts/verify-production-build.mjs` stoppt den Release bei
unersetzten Build-Platzhaltern, fehlenden referenzierten Dateien, ungültigem
Manifest oder fehlender Service-Worker-Versionierung.

## Ein Release für öffentliche PWA und Beta

Ein Merge nach `main` veröffentlicht die öffentliche PWA und aktualisiert
zugleich die App-Dateien, die der Beta-Worker aus GitHub Pages weiterreicht.
Dadurch gibt es für normale App-Änderungen nur einen Release-Schritt; eine
separate Beta-Veröffentlichung ist dafür nicht nötig. Die spätere offizielle
PWA sollte ebenfalls aus diesem `main`-Stand veröffentlicht werden.

Das bestehende Hosting-Projekt aus `.openai/hosting.json` behält Anmeldung,
Einladungen, API und D1. Änderungen an diesem Worker oder seinen Einstellungen
brauchen weiterhin eine Veröffentlichung des Hosting-Projekts. Dafür gibt es
noch keine unterstützte automatische Verbindung zu GitHub Actions. Wir lösen
diese Ausnahme erst, wenn die Hosting-Plattform einen dafür geeigneten
automatischen Veröffentlichungsweg bereitstellt; Zugangsdaten oder eine
unbestätigte Schnittstelle werden nicht in GitHub eingerichtet.

## PWA-Updates

Jeder Build erhält neue Asset-Parameter und einen eigenen
`timeflow-app-<build-id>`-Cache. Der Service Worker aktiviert sich kontrolliert,
entfernt nur vorherige TimeFlow-Caches und speichert keine API-Antworten.
localStorage, IndexedDB, Cookies und D1 gehören nicht zu dieser Bereinigung.

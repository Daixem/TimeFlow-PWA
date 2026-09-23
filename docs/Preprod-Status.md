# TimeFlow Pre-Production

Stand: 23. September 2026

## Umgebung

- Worker: `timeflow-preprod`
- URL: `https://timeflow-preprod.wvzv2wd4zj.workers.dev`
- Worker-ID: `34d459b368234910b7398f868ba60314`
- Worker-Version: `f180f9b5-480b-4659-84fc-4468d7e4031d`
- Deployed Source Commit: `38ab531c726149e85c421342419cfa4dee544838`
- Build-ID: `38ab531c7261-20260923t210558676z`
- Konfiguration: `wrangler.preprod.jsonc`

## D1-Binding

- Binding: `DB`
- Datenbank: `timeflow-migration-test-20260917`
- Datenbank-ID: `4826b07d-8a23-4098-80d7-ee6a6469bcab`
- Migration `0003_timeflow_work_time_journal.sql`: vorhanden und verifiziert
- Migration `0004_timeflow_work_time_sessions.sql`: vorhanden und verifiziert

Die produktive D1 ist nicht gebunden und wurde nicht verändert. Die getrennte
Restore-Test-D1 ist ebenfalls nicht an den Worker gebunden.

## Feature-Gate und Beobachtbarkeit

- `TIMEFLOW_WORK_TIME_SERVER_ENABLED=true`
- Gate gilt ausschließlich für `timeflow-preprod`.
- Workers Logs und Traces sind aktiviert.
- `/api/work-time` antwortet ohne authentifizierte Identität mit HTTP 401.

## Noch offen

Die `workers.dev`-URL ist öffentlich erreichbar, stellt aber nicht automatisch
die von der bestehenden ChatGPT-Sites-Beta gesetzten
`oai-authenticated-user-*`-Header bereit. Die echte Browser-Abnahme mit zwei
Benutzern benötigt deshalb vor Phase D eine isolierte Authentifizierung oder
einen gleichwertigen, serverseitig verifizierten Testzugang.

Kein produktiver Cutover wurde durchgeführt.

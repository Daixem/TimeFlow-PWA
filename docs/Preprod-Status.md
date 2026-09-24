# TimeFlow Pre-Production – Phase D

Stand: 24. September 2026

## Umgebung

- Worker: `timeflow-preprod`
- URL: `https://timeflow-preprod.wvzv2wd4zj.workers.dev`
- Worker-ID: `34d459b368234910b7398f868ba60314`
- Worker-Version: `9dd38c09-103c-4765-8473-abd01342365a`
- Deployed Source Commit: `691d7b5df284036bb21b51ea2530a2a98fa10d40`
- Build-ID: `691d7b5df284-20260924t151247057z`
- Konfiguration: `wrangler.preprod.jsonc`

Die Worker-Version wurde aus dem dokumentierten Phase-D-Commit gebaut. Der
nachfolgende reine Dokumentations-Commit verändert den deployten Code nicht.

## D1-Binding

- Binding: `DB`
- Datenbank: `timeflow-migration-test-20260917`
- Datenbank-ID: `4826b07d-8a23-4098-80d7-ee6a6469bcab`
- Migration `0003_timeflow_work_time_journal.sql`: vorhanden und verifiziert
- Migration `0004_timeflow_work_time_sessions.sql`: vorhanden und verifiziert

Die produktive D1 ist nicht gebunden und wurde nicht verändert. Die getrennte
Restore-Test-D1 ist ebenfalls nicht an den Worker gebunden.

## Phase-D-Ergebnisse

| Prüfung | Status | Ergebnis |
| --- | --- | --- |
| Isolierter Pre-Prod-Worker und Test-D1 | **PASS** | Ausschließlich die vorhandene Test-D1 ist gebunden. |
| Work-Time-Gate | **PASS** | Nur in `timeflow-preprod` aktiviert. |
| CLOCK_IN, Pausen und CLOCK_OUT | **PASS** | Zustände, fortlaufende Revisionen, Journal und Session in D1 verifiziert. |
| Manueller Eintrag und Korrektur-Lebenszyklus | **PASS** | Erstellen, Ändern und Stornieren verifiziert. |
| Gleichzeitige Änderungen | **PASS** | Veraltete Revision liefert HTTP 409 und erzeugt keinen Journal-Eintrag. |
| Rollen und Fremdzugriff | **PASS** | Normaler Nutzer erhält HTTP 403; Admin-Aktion speichert den korrekten Akteur. |
| Append-only-Journal | **PASS** | UPDATE und DELETE werden durch D1-Constraints abgewiesen. |
| Erstmaliger D1-Insert | **PASS** | Falscher HTTP-409-Fall behoben; erneuter Remote-Test liefert HTTP 201. |
| Automatisierte Tests | **PASS** | Vollständige `npm test`-Suite erfolgreich. |
| Monitoring | **PASS** | Logs und Traces aktiv; bei der Abnahme keine 5xx-Fehler festgestellt. |
| Browser-E2E mit echten Identitäten | **BLOCKED** | `workers.dev` setzt keine vertrauenswürdig verifizierten `oai-authenticated-user-*`-Header. |
| Offline/Pending/Reconnect im Browser | **BLOCKED** | Benötigt zuerst einen geschützten, serverseitig verifizierten Testzugang. |
| Service-Worker Build A → B | **BLOCKED** | Authentifizierter Browser-Test und zwei eindeutig zugeordnete Builds fehlen. |
| Entfernung von Demo-Daten | **PARTIAL** | Private Bereinigungstests bestehen; der öffentliche Demo-Modus zeigt weiterhin Beispieldaten. |

## Sicherheitsgrenze

Die öffentliche `workers.dev`-Adresse darf nicht als vertrauenswürdige
Mehrbenutzer-Beta behandelt werden: direkt gesendete Identitätsheader sind dort
nicht durch die vorgesehene Plattform authentifiziert. Für die verbleibenden
Browser-Tests ist Cloudflare Access oder ein gleichwertiger, serverseitig
verifizierter Pre-Prod-Zugang erforderlich. Test-Identitäten und Testdaten
bleiben ausschließlich in der Test-D1.

Kein produktiver Cutover wurde durchgeführt. Produktive D1, produktive
Bindings und produktive Feature-Gates wurden nicht verändert.

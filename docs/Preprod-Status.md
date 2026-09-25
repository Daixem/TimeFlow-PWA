# TimeFlow Pre-Production – Phase D

Stand: 25. September 2026

## Umgebung

- Worker: `timeflow-preprod`
- URL: `https://timeflow-preprod.wvzv2wd4zj.workers.dev`
- Worker-ID: `34d459b368234910b7398f868ba60314`
- Worker-Version: `4d2d1ebb-82d0-43c3-abae-3b03645945a7`
- Deployed Worker-Commit: `5c837e9efebde659f4cdcd1e3966805470043388`
- Worker-Build-ID: `5c837e9efebd-20260925t205205526z`
- GitHub-Main-Commit: `5c837e9efebde659f4cdcd1e3966805470043388`
- Browser-Build-ID: `5c837e9efebd-20260924t214755293z`
- Konfiguration: `wrangler.preprod.jsonc`

Worker und Browser-Build stammen aus demselben GitHub-Main-Commit. Die
unterschiedlichen Build-Zeitstempel entstehen durch die getrennten Worker- und
GitHub-Pages-Builds.

## Browser-Anmeldung

- Cloudflare Zero Trust: `Free`
- Team-Domain: `crimson-bird-5de5.cloudflareaccess.com`
- Access-Anwendung: `TimeFlow Pre-Production`
- Geschütztes Ziel: `timeflow-preprod.wvzv2wd4zj.workers.dev`
- Richtlinie: `Dimitri only`, Aktion `Allow`, Sitzungsdauer 24 Stunden
- Anmeldemethoden: Cloudflare-Konto und E-Mail-Einmalcode
- Identität: serverseitig über `ctx.access.getIdentity()` übernommen

Im Access-Modus entfernt der Worker ungeprüfte eingehende Identitätsheader und
setzt die TimeFlow-Identität ausschließlich aus dem von Cloudflare geprüften
Access-Kontext. Der reale Browser-Test hat die Anmeldung und das Überspringen
der öffentlichen Demo-Kontoauswahl bestätigt.

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
| Browser-Anmeldung mit echter Identität | **PASS** | Cloudflare Access schützt die URL; Dimitris geprüfte Identität wird von TimeFlow übernommen. |
| Browser-E2E mit zwei Identitäten | **PASS** | Zweite temporäre Identität erkannt; eigener Server-Akteur und getrennte D1-Zeile verifiziert. |
| Lokale Arbeitszeit-Isolation je Identität | **PASS** | Kontowechsel entfernt fremden Zustand aus der aktiven Ansicht; Zustand und offene Offline-Buchung bleiben im eigenen Kontobereich. Browser zeigte für Dimitri wieder `Nicht im Dienst`, `--:--` und `0 h 0 min`. |
| Offline/Pending/Reconnect im Browser | **PASS** | Manueller Browserablauf verifiziert: lokaler `CLOCK_IN` um `2026-09-25T20:57:04.255Z`, sofort laufende Anzeige, Reconnect um `20:57:49.973Z`, D1-Quelle `offline_clock`; der ursprüngliche Offline-Zeitpunkt blieb erhalten. Der anschließende Online-`CLOCK_OUT` erzeugte Revision 12 und beendete den Testzustand. |
| Service-Worker Build A → B | **PASS** | Browser wechselte auf Build `5c837e9efebd-20260924t214755293z`; die neuen versionierten Assets und der korrigierte Zustand wurden sichtbar. |
| Entfernung von Demo-Daten | **PARTIAL** | Private Bereinigungstests bestehen; der öffentliche Demo-Modus zeigt weiterhin Beispieldaten. |

## Sicherheitsgrenze

Die `workers.dev`-Adresse ist durch Cloudflare Access geschützt. Der Worker
akzeptiert im Pre-Prod-Access-Modus nur den von Cloudflare bereitgestellten
Access-Kontext; direkt gesendete Identitätsheader werden entfernt.
Test-Identitäten und Testdaten bleiben ausschließlich in der Test-D1.

Die temporäre zweite E-Mail-Freigabe wurde nach dem Test aus Access entfernt.
Die Phase-D-Arbeitszeitereignisse bleiben entsprechend der verifizierten
Append-only-Regel als unveränderbarer Testnachweis erhalten. Der aktuelle
Testzustand ist nach Revision 12 beendet; die temporäre E-Mail-Adresse wird in
diesem Repository nicht dokumentiert.

Kein produktiver Cutover wurde durchgeführt. Produktive D1, produktive
Bindings und produktive Feature-Gates wurden nicht verändert.

# TimeFlow Pre-Production – Phase D bis F

Stand: 10. Oktober 2026

## Umgebung

- Worker: `timeflow-preprod`
- URL: `https://timeflow-preprod.wvzv2wd4zj.workers.dev`
- Worker-ID: `34d459b368234910b7398f868ba60314`
- Worker-Version: `1c1f1a86-88ff-44d3-9872-e618f5ba2495`
- Deployed Worker-Commit: `6e7485598e68eafd71fbb073097053b015be52e6`
- Worker-Build-ID: `6e7485598e68-20260929t192609808z`
- Konfiguration: `wrangler.preprod.jsonc`

## Aktueller Rollout

- Commit: `9704c32bb590b84befe7424a335bd9f8d0d5777d`
- Build-ID: `9704c32bb590-20261010t200117467z`
- Worker-Version: `5c35aff3-0e35-4fc2-b680-ec479eda177a`
- Test-D1: Migration `0009_timeflow_team_chat_and_push_preferences.sql`
  wurde ausschließlich auf `timeflow-migration-test-20260917` angewendet.
- Gemeinsamer Teamchat speichert Nachrichten pro Organisation; die frühere
  lokale Vorschau mit erfundenen Mitgliedern und Nachrichten ist entfernt.
- Push-Einstellungen werden kontoweit gespeichert. Die vorhandenen VAPID-
  Schlüssel bleiben geheim; eine echte Zustellung an ein iPhone wurde noch
  nicht vor Ort geprüft.
- GitHub-Pages-Workflow 225 wurde erfolgreich abgeschlossen. Die statische
  GitHub-Pages-Adresse stellt keine Teamchat-API bereit; der gemeinsame Chat
  ist deshalb derzeit im geschützten Pre-Prod-Worker erreichbar.
- Der Zugriff ohne Cloudflare-Access-Anmeldung wurde geprüft und erhält eine
  Anmeldeweiterleitung. Produktiv-Worker und produktive D1 wurden nicht
  verändert.

Der Worker wurde aus dem dokumentierten Datenschutz- und Retention-Commit gebaut. Die Vorschau
für fällige Löschungen ist in Pre-Prod aktiv. Die tatsächliche Löschung bleibt
über einen zweiten Schalter gesperrt. Der produktive Browser-Build wurde bei
dieser Pre-Prod-Veröffentlichung nicht verändert. Pre-Prod lädt jetzt bewusst
die im Worker enthaltene Testoberfläche, damit neue Funktionen vor einer
Produktivveröffentlichung sichtbar geprüft werden können.

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
- Migration `0005_timeflow_work_time_subjects.sql`: ausschließlich auf der
  Test-D1 und einer ungebundenen Restore-Kopie vorhanden und verifiziert
- Migration `0006_timeflow_work_time_retention.sql`: gezielt auf der Test-D1
  ausgeführt; vorhandene Zeitzähler blieben unverändert

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
| Monitoring | **PASS** | Worker-Logs aktiv; bei der Abnahme keine 5xx-Fehler festgestellt. |
| Browser-Anmeldung mit echter Identität | **PASS** | Cloudflare Access schützt die URL; Dimitris geprüfte Identität wird von TimeFlow übernommen. |
| Browser-E2E mit zwei Identitäten | **PASS** | Zweite temporäre Identität erkannt; eigener Server-Akteur und getrennte D1-Zeile verifiziert. |
| Lokale Arbeitszeit-Isolation je Identität | **PASS** | Kontowechsel entfernt fremden Zustand aus der aktiven Ansicht; Zustand und offene Offline-Buchung bleiben im eigenen Kontobereich. Browser zeigte für Dimitri wieder `Nicht im Dienst`, `--:--` und `0 h 0 min`. |
| Offline/Pending/Reconnect im Browser | **PASS** | Manueller Browserablauf verifiziert: lokaler `CLOCK_IN` um `2026-09-25T20:57:04.255Z`, sofort laufende Anzeige, Reconnect um `20:57:49.973Z`, D1-Quelle `offline_clock`; der ursprüngliche Offline-Zeitpunkt blieb erhalten. Der anschließende Online-`CLOCK_OUT` erzeugte Revision 12 und beendete den Testzustand. |
| Service-Worker Build A → B | **PASS** | Browser wechselte auf Build `5c837e9efebd-20260924t214755293z`; die neuen versionierten Assets und der korrigierte Zustand wurden sichtbar. |
| Entfernung von Demo-Daten | **PARTIAL** | Private Bereinigungstests bestehen; der öffentliche Demo-Modus zeigt weiterhin Beispieldaten. |
| Team-E2E mit Mitgliedsrolle | **PASS** | Zweite Access-Identität als normales Mitglied erkannt; eigene Team-Session und getrennte Revisionen in der Test-D1 verifiziert. Der private Administratorzustand blieb auf Revision 12 unverändert. |
| Retention-Schema und Schutzregeln | **PASS** | Legal Holds, Löschprotokoll und Datenbank-Sperre sind auf der Test-D1 vorhanden; vorhandene 11 Subjects, 10 Current-States, 12 Sessions und 38 Journalereignisse blieben erhalten. |
| Retention-Vorschau | **PASS** | Der geschützte Browser-Endpunkt bestätigte vor dem Test genau 1 fälligen Wegwerf-Datensatz und danach wieder 0 fällige Datensätze. |
| Automatischer Retention-Lauf | **PASS** | Nach vollständigem Test-D1-Export wurde genau 1 eigens angelegter Wegwerf-Datensatz gelöscht. Der Lauf meldete 1 von 1 gelöscht und wurde als abgeschlossen protokolliert. Die ursprünglichen Zähler von 11 Subjects, 10 Current-States, 12 Sessions und 38 Journalereignissen wurden danach bestätigt. Der Ausführungsschalter ist wieder aus. |
| 30-Tage-Wiederherstellung | **PASS** | Die App zeigte für das vorgemerkte private Testkonto den 29. Oktober 2026 als Frist und einen verständlichen Wiederherstellungsknopf. Der echte Browseraufruf entfernte die Vormerkung; Arbeitszeiten, Journal und Teamzuordnung blieben unverändert. |
| Verständliche Löschhinweise | **PASS** | Die Beta-Hinweise und die Bestätigung vor einer Cloud-Löschung erklären klar, welche Daten sofort entfernt werden, welche 30 Tage wiederherstellbar bleiben, wie lange Team-Arbeitszeiten bestehen und dass lokale Daten getrennt gelöscht werden. Der Hinweis wurde im Browser geöffnet und vollständig geprüft. |
| Isolierte Pre-Prod-Oberfläche | **PASS** | Pre-Prod verwendet den gebündelten Teststand. Der produktive Browser-Build und die produktive D1 wurden nicht verändert. |

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

Am 27. September 2026 wurde der geprüfte Code als TimeFlow-Connect-Version 65
veröffentlicht. Sites wendete dabei die Migrationen `0003` bis `0005`
automatisch auf die produktive D1 an. Die neuen Arbeitszeittabellen waren nach
dem Rollout leer. Die Arbeitszeit wurde später kontrolliert nur für das
Administratorkonto aktiviert und im Browser geprüft. Produktive Bindings und
bestehende fachliche Daten wurden dabei nicht verändert. Die Retention-
Migration und Retention-Ausführung bleiben außerhalb der Produktion.

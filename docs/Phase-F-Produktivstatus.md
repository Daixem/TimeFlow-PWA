# TimeFlow – Phase F: Produktivstatus

Stand: 28. September 2026

Status: **ADMIN-ROLLOUT AKTIV – LESE- UND SCHREIBTEST BESTANDEN**

## Veröffentlichter Stand

- GitHub-Rolloutcommit: `d223432de938fd47c9c9694adc54e2c1df6afe57`
- Verifizierter GitHub-Pages-Build: `d223432de938-20260928t182451561z`
- TimeFlow Connect: Version 71
- Sites-Quellcommit: `973ff004683a105f67f8883bc05068293b5846bc`
- Sites-Build: `973ff004683a-20260928t182436221z`
- Produktions-URL: `https://timeflow-connect.daixem.chatgpt.site`

## Recovery-Nachweis

- Isolierte Recovery-D1: `timeflow-prod-recovery-20260927`
- D1-ID: `861246c6-cd21-43ee-8e51-d85634040e6c`
- Region: `EEUR`
- Sicherungszeitpunkt: 27. September 2026, 22:36 Uhr Europe/Berlin
- Sicherungsformat: `timeflow-d1-recovery-v1`
- Sicherungsgröße: 45.169 Byte
- SHA-256 der vollständigen Sicherung: `d0e400b3f88a01e7b25aad69276d09d54602e88dd840e8d70a81258024523b08`
- Umfang: 12 Tabellen, 12 Indizes, 7 Trigger und 26 Datensätze
- Restore: 57 SQL-Anweisungen erfolgreich auf der getrennten Recovery-D1 ausgeführt
- Verifikation: Tabellenzählungen, Schemaobjekte und fünf sicherheitskritische Trigger/Indizes stimmen mit der Sicherung überein
- Temporärer Admin-Export: nach erfolgreicher Verifikation entfernt; Produktionsroute liefert wieder HTTP 404
- Lokale Klartext-Artefakte: nach erfolgreichem Remote-Restore gelöscht

## Abnahme

| Punkt | Status | Ergebnis |
| --- | --- | --- |
| Vollständige Test-Suite | **PASS** | Alle Client-, API-, Tenant-, Offline-, Sicherheits- und Build-Tests erfolgreich. |
| GitHub Pages | **PASS** | Live-Version liefert den dokumentierten Bereinigungscommit. |
| TimeFlow Connect | **PASS** | Version 71 erfolgreich mit Env-Revision 6 veröffentlicht. |
| Produktive D1-Migrationen 0003–0005 | **PASS** | Vier Arbeitszeittabellen vorhanden; Current, Journal, Sessions und Subjects nach Rollout leer. |
| Produktive Recovery-Sicherung | **PASS** | Vollständige Daten und vollständiges Schema einschließlich Indizes und Trigger erfasst. |
| Isolierter Remote-Restore | **PASS** | 26 Datensätze und alle erwarteten Schemaobjekte in separater Recovery-D1 verifiziert. |
| Temporärer Sicherungszugang | **PASS** | Export-Endpunkt entfernt; HTTP 404 bestätigt. |
| Bestehende produktive Bindings | **PASS** | Weiterhin ausschließlich das bestehende Binding `DB`; Recovery-D1 ist nicht an die Produktion gebunden. |
| Produktionslogs | **PASS** | Wiederholte Admin-Lesezugriffe auf Current und Sessions liefern HTTP 200 mit Worker-Outcome `ok`; keine D1-Fehler. Erwartete HTTP 503 aus einer älteren Hintergrundseite ohne Admin-Freigabe bestätigen die Abgrenzung. |
| Admin-only-Rolloutschutz | **PASS** | Die Freigabe erkennt das kontrollierte Administratorkonto auch dann stabil, wenn Sites bei Folgeaufrufen nur die E-Mail-Identität liefert. Andere Konten bleiben ausgeschlossen. |
| Produktive Arbeitszeit-Aktivierung | **PASS** | Env-Revision 6 aktiviert den Serverpfad ausschließlich für das Administratorkonto. Wiederholte Lesetests sowie ein bewusstes CLOCK_IN/CLOCK_OUT wurden ohne Fehler abgeschlossen. |
| Lösch-/Anonymisierungsroutine | **PARTIAL** | Fachliche Regel beschlossen; technische Routine noch nicht umgesetzt. |

Die produktive Datenbank wurde weder ersetzt noch aus der Recovery-D1
zurückgespielt. Die Recovery-D1 ist eine getrennte, nicht produktiv gebundene
Wiederherstellungskopie. Der serverseitige Arbeitszeitpfad ist ausschließlich
für das kontrollierte Administratorkonto aktiv. Die vier produktiven
Arbeitszeittabellen enthalten nach dem bewussten Produktionstest genau ein
privates Arbeitssubjekt, einen aktuellen Zustand mit Revision 2, zwei
unveränderliche Journalereignisse und eine abgeschlossene Sitzung. CLOCK_IN
und CLOCK_OUT wurden jeweils genau einmal gespeichert; es gab keine Fehler
oder doppelten Einträge. Die kurze Testdauer von rund 23 Sekunden wird korrekt
als 0 Minuten ausgewiesen. Alle anderen Beta-Konten verwenden weiterhin den
bisherigen lokalen Pfad.

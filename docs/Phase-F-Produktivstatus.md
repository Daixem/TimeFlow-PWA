# TimeFlow – Phase F: Produktivstatus

Stand: 28. September 2026

Status: **CODE UND SCHEMA LIVE – RECOVERY VERIFIZIERT – ARBEITSZEIT-GATE AUS**

## Veröffentlichter Stand

- GitHub-Bereinigungscommit: `083cafb91a7f114cfc43d8e77a97a3fe868c154a`
- GitHub-Pages-Build: `083cafb91a7f-20260928t134713636z`
- TimeFlow Connect: Version 69
- Sites-Quellcommit: `d425c89b114b54dddee248dfc69a3d6244d3a5cf`
- Sites-Build: `d425c89b114b-20260928t135521515z`
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
| TimeFlow Connect | **PASS** | Version 69 erfolgreich veröffentlicht; Live-Version liefert den dokumentierten Sites-Build. |
| Produktive D1-Migrationen 0003–0005 | **PASS** | Vier Arbeitszeittabellen vorhanden; Current, Journal, Sessions und Subjects nach Rollout leer. |
| Produktive Recovery-Sicherung | **PASS** | Vollständige Daten und vollständiges Schema einschließlich Indizes und Trigger erfasst. |
| Isolierter Remote-Restore | **PASS** | 26 Datensätze und alle erwarteten Schemaobjekte in separater Recovery-D1 verifiziert. |
| Temporärer Sicherungszugang | **PASS** | Export-Endpunkt entfernt; HTTP 404 bestätigt. |
| Bestehende produktive Bindings | **PASS** | Weiterhin ausschließlich das bestehende Binding `DB`; Recovery-D1 ist nicht an die Produktion gebunden. |
| Produktionslogs | **PASS** | Nach der bereinigten Veröffentlichung keine Fehlerereignisse festgestellt. |
| Produktive Arbeitszeit-Aktivierung | **PARTIAL** | Technische Recovery-Voraussetzung erfüllt; `TIMEFLOW_WORK_TIME_SERVER_ENABLED` bleibt für einen getrennten kontrollierten Aktivierungsschritt ungesetzt. |
| Lösch-/Anonymisierungsroutine | **PARTIAL** | Fachliche Regel beschlossen; technische Routine noch nicht umgesetzt. |

Die produktive Datenbank wurde weder ersetzt noch aus der Recovery-D1
zurückgespielt. Die Recovery-D1 ist eine getrennte, nicht produktiv gebundene
Wiederherstellungskopie. Der Arbeitszeit-Schreibpfad bleibt bis zum nächsten
kontrollierten Aktivierungsschritt ausgeschaltet.

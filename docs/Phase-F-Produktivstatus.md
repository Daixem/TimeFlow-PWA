# TimeFlow – Phase F: Produktivstatus

Stand: 28. September 2026

Status: **KONTROLLIERTER ADMIN-ROLLOUT AKTIV**

## Veröffentlichter Stand

- GitHub-Rolloutcommit: `400b834a9a5bb90ae420b1fdeef09678d1b92597`
- Zuletzt verifizierter GitHub-Pages-Build vor dem Rollout: `083cafb91a7f-20260928t134713636z`
- TimeFlow Connect: Version 70
- Sites-Quellcommit: `c4e0b10cbc0d7a3a010663874e5db2bd09b2c292`
- Sites-Build: `c4e0b10cbc0d-20260928t144824860z`
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
| TimeFlow Connect | **PASS** | Version 70 erfolgreich veröffentlicht; Live-Version liefert den dokumentierten Sites-Build. |
| Produktive D1-Migrationen 0003–0005 | **PASS** | Vier Arbeitszeittabellen vorhanden; Current, Journal, Sessions und Subjects nach Rollout leer. |
| Produktive Recovery-Sicherung | **PASS** | Vollständige Daten und vollständiges Schema einschließlich Indizes und Trigger erfasst. |
| Isolierter Remote-Restore | **PASS** | 26 Datensätze und alle erwarteten Schemaobjekte in separater Recovery-D1 verifiziert. |
| Temporärer Sicherungszugang | **PASS** | Export-Endpunkt entfernt; HTTP 404 bestätigt. |
| Bestehende produktive Bindings | **PASS** | Weiterhin ausschließlich das bestehende Binding `DB`; Recovery-D1 ist nicht an die Produktion gebunden. |
| Produktionslogs | **PASS** | Nach der bereinigten Veröffentlichung keine Fehlerereignisse festgestellt. |
| Admin-only-Rolloutschutz | **PASS** | API und Sync trennen kontrolliertes Administratorkonto von allen übrigen Beta-Konten; vollständige Test-Suite erfolgreich. |
| Produktive Arbeitszeit-Aktivierung | **PARTIAL** | Env-Revision 4 aktiviert Servermodus und `TIMEFLOW_WORK_TIME_ADMIN_ONLY`; schreibender CLOCK_IN-/CLOCK_OUT-E2E steht noch aus. |
| Lösch-/Anonymisierungsroutine | **PARTIAL** | Fachliche Regel beschlossen; technische Routine noch nicht umgesetzt. |

Die produktive Datenbank wurde weder ersetzt noch aus der Recovery-D1
zurückgespielt. Die Recovery-D1 ist eine getrennte, nicht produktiv gebundene
Wiederherstellungskopie. Der serverseitige Arbeitszeitpfad ist ausschließlich
für das Administratorkonto aktiv. Alle anderen Beta-Konten verwenden weiterhin
den bisherigen lokalen Pfad. Eine breitere Aktivierung bleibt bis zum
vollständigen produktiven E2E und einer dokumentierten Beobachtungsphase
gesperrt.

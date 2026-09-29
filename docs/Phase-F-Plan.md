# TimeFlow – Phase F: Datenregeln und Cutover-Vorbereitung

Stand: 28. September 2026

Status: **IN ARBEIT – KEIN PRODUKTIV-CUTOVER**

## Ziel

Phase F legt die fachlichen Datenregeln fest und prüft sie zuerst auf getrennten
Test-D1s. Die Arbeitszeiterfassung wurde zuvor kontrolliert für das
Produktions-Administratorkonto aktiviert. Die neuen Retention-Regeln und ihre
Migration bleiben weiterhin ausschließlich in Pre-Prod und auf der Test-D1.

## Arbeitspakete

### 1. Retention

Für jede Datenklasse ist eine verbindliche Regel festzulegen:

| Datenklasse | Offene Entscheidung |
| --- | --- |
| `timeflow_work_time_current` | Löschen, anonymisieren oder nach Kontoende für eine Frist erhalten |
| `timeflow_work_time_journal` | Aufbewahrungsfrist, Anonymisierung und zulässige Löschgründe |
| `timeflow_work_time_sessions` | Aufbewahrungsfrist und Verhalten bei Konto- oder Organisationsende |
| D1-Backups | Aufbewahrungsdauer, Zugriff, Verschlüsselung und sichere Löschung |

Die Fristen sind eine fachliche und rechtliche Produktentscheidung. Bis zur
Freigabe verändert die normale Account-Löschung keine Arbeitszeitdaten.

### 2. Organisationszuordnung

- Private Konten und private Arbeitszeiten bleiben ohne erfundene Organisation.
- Teamdaten erhalten eine explizite `organization_id`.
- Eine Zuordnung entsteht nur durch bestätigte Einladung oder einen
  nachvollziehbaren administrativen Vorgang.
- Ein Backfill darf keine Default-Organisation erzeugen.
- Cross-Tenant-Zugriff wird serverseitig über Mitgliedschaft und Rolle geprüft.
- Austritt, Entfernung und Organisationswechsel müssen persönliche und
  organisatorische Daten sauber trennen.

### 3. Löschung und Anonymisierung

Nach der Retention-Entscheidung wird ein idempotenter, protokollierter Ablauf
für Kontoende, Organisationsaustritt und berechtigte Löschanforderungen
entworfen. Das append-only Journal darf erst durch eine ausdrücklich
freigegebene Regel anonymisiert oder bereinigt werden.

### 4. Testmigration

Erst nach den Entscheidungen wird eine neue Migration erstellt. Sie muss:

1. ausschließlich auf einer Kopie der Test-D1 laufen;
2. private Datensätze ohne Organisation erhalten;
3. Organisationsdaten eindeutig zuordnen;
4. Trigger, Indizes und Rollenprüfungen ergänzen;
5. einen dokumentierten Rückfall- und Restore-Test bestehen;
6. Cross-Tenant-, Account-Lösch- und Reconnect-Tests bestehen.

### 5. Cutover-Freigabe

Der produktive Cutover bleibt gesperrt, bis Retention, Organisationsmodell,
Testmigration, produktives Backup/Restore und kontrollierter Testkonten-Rollout
jeweils **PASS** sind. Eine spätere Freigabe muss den konkreten Commit, die
produktive D1-ID, die Recovery-D1-ID, das Backup und den Rückfallplan nennen.

## Anfangsstatus

| Punkt | Status |
| --- | --- |
| Phase E vorläufig abgeschlossen | **PASS** |
| Retention-Entscheidung | **PASS – Beschäftigungsdauer plus 24 Monate; privat 30 Tage Wiederherstellung** |
| Organisationsmodell | **PASS – Test-D1 migriert; Clientkontext und lokale Trennung validiert** |
| Lösch-/Anonymisierungsablauf | **PASS – Vorschau und echter Lauf mit einem Wegwerf-Datensatz auf der Test-D1 geprüft; Ausführung anschließend wieder gesperrt, Produktion unverändert** |
| 30-Tage-Wiederherstellung | **PASS – Frist und Wiederherstellungsknopf in Pre-Prod sichtbar; Vormerkung im Browser aufgehoben und Daten unverändert** |
| Verständliche Löschhinweise | **PASS – App erklärt sofortige Löschung, 30-Tage-Wiederherstellung, Team-Aufbewahrung, lokale Daten und Sicherungen in Alltagssprache** |
| Tenant-Testmigration | **PASS – Kopie und gebundene Test-D1 migriert; Daten vollständig** |
| Team-E2E auf Test-D1 | **PASS – zwei Access-Identitäten, Mitgliedsrolle, getrennte Teamdaten und private Isolation im Browser verifiziert** |
| Produktiver Code- und Schema-Rollout | **PASS – Sites-Version 65; Migrationen 0003–0005 vorhanden; neue Arbeitszeittabellen leer** |
| Produktive Arbeitszeit-Aktivierung | **PASS – kontrolliert nur für das Administratorkonto aktiviert und im Browser geprüft** |

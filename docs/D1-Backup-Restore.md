# TimeFlow D1 – Backup, Restore und Test-D1

Status: **auf getrennten Cloudflare-Test-D1s am 17. September 2026 verifiziert**. Der Nachweis umfasst Migrationen 0003/0004, Export, Import in eine zweite Test-D1, Schema- und Datenvergleich sowie wiederhergestellte Trigger und Constraints. Er ist ausdrücklich **kein** Produktiv-Restore-Nachweis.

## Sicherheitsregel

Vor jeder schreibenden Aktion müssen die beiden IDs aus der autorisierten Cloudflare-Umgebung abgelesen und verglichen werden:

```text
TARGET_DB_ID != PRODUCTION_DB_ID
SOURCE_DB_ID != RESTORE_DB_ID
```

Wenn die IDs fehlen oder identisch sind: **abbrechen**. Niemals die produktive D1 für Export-/Import- oder Migrationstests verwenden.

## Getrennte Umgebungen

| Zweck | Verifizierter Name | Zulässige Daten |
| --- | --- | --- |
| Produktion | bestehende Produktions-D1 | echte TimeFlow-Daten, keine Tests |
| Exportquelle | `timeflow-migration-test-20260917` | ausschließlich synthetische Testdaten |
| Restoreziel | `timeflow-migration-restore-20260917` | ausschließlich wiederherstellbare synthetische Testdaten |

Namen sind keine Sicherheitskontrolle. Entscheidend ist der serverseitig überprüfte Unterschied der D1-IDs.

## Offizieller Ablauf

1. Getrennte Test-D1-Datenbanken über die autorisierte Cloudflare-Konsole oder Wrangler erstellen.
2. Backend-Typ und Kennung mit `wrangler d1 info <test-db>` prüfen.
3. Harmlose Tabellen und Testdaten nur in der getrennten Testquelle anlegen.
4. Vollständigen Export erstellen:

   ```text
   wrangler d1 export <test-db> --remote --output=<sicherer-lokaler-pfad>/timeflow-test.sql
   ```

5. Datei lokal prüfen: vorhanden, nicht leer, erwartetes Schema und Testdaten enthalten. Sie darf nicht in Git oder einen öffentlichen Ordner gelangen.
6. Export nur in die getrennte Restore-D1 importieren:

   ```text
   wrangler d1 execute <restore-test-db> --remote --file=<sicherer-lokaler-pfad>/timeflow-test.sql
   ```

7. Quelle und Restoreziel vergleichen: Tabellen, Spalten, Indizes, eindeutige IDs, Zeilenanzahlen und repräsentative Testwerte.
8. Erst nach bestandenem Recovery-Test Migrationen `drizzle/0003_timeflow_work_time_journal.sql` und `drizzle/0004_timeflow_work_time_sessions.sql` gegen die Testquelle anwenden und Trigger, Revisionen sowie Append-only-Regeln dort prüfen.

## Tatsächlich verifizierter Testablauf

Auf zwei neuen, leeren, getrennten Test-D1s wurden beide Migrationen angewendet und ausschließlich synthetische Work-Time-Daten geschrieben. Der offizielle Export und Import erfolgte außerhalb von Git und öffentlichen Ordnern:

```text
wrangler d1 export timeflow-migration-test-20260917 --remote --output=<sicherer-lokaler-pfad>/timeflow-migration-test.sql
wrangler d1 execute timeflow-migration-restore-20260917 --remote --file=<sicherer-lokaler-pfad>/timeflow-migration-test.sql
```

Quelle und Restoreziel waren danach bei Tabellen, Indizes, Triggern, Current-/Journal-/Session-Zeilen und repräsentativen fachlichen Werten identisch: drei Current-Zeilen, acht Journal-Ereignisse und zwei Sessions. Auf dem Restoreziel wurden außerdem der Append-only-Schutz (`UPDATE`/`DELETE` scheitern) und die Session-Unique-Constraint (`user_id`, `end_revision`) real bestätigt.

## Recovery-Runbook

1. Schreibzugriffe begrenzen und Incident-Zeitpunkt dokumentieren.
2. Ziel-D1, Ziel-ID und Produktions-ID vor jedem Import prüfen; bei Gleichheit **abbrechen**.
3. Zuerst in eine getrennte Restore-Test-D1 exportieren/importieren und Tabellen, Indizes, Trigger, Zeilenanzahlen und fachliche Stichproben vergleichen.
4. Migrationen, Trigger und Work-Time-Smoke-Tests ausschließlich in dieser Restore-Test-D1 prüfen.
5. Das Work-Time-Feature-Gate bleibt AUS, solange Backup, Wiederherstellung, Integritätsvergleich oder Freigabe nicht vollständig nachgewiesen sind.
6. Ein Produktiv-Restore erfordert eine separate ausdrückliche Freigabe, einen aktuellen verifizierten Export, dokumentierte Ziel-ID und Rückfallplan. Cloudflare Time Travel kann eine Plattformoption sein, ersetzt aber keinen getesteten Import-/Recovery-Ablauf.

Vor einer erneuten Gate-Freigabe müssen mindestens API-Authentifizierung, Current-State, Journal, Sessions, Revisionen, Append-only-Trigger und ein nichtdestruktiver Client-Sync in der getrennten Umgebung PASS sein.

## Offene Voraussetzungen

- autorisierte Cloudflare-/Wrangler-Ausführung;
- bekannte, getrennte D1-IDs;
- sicherer lokaler Speicherort für SQL-Exporte;
- Retention- und Verschlüsselungsentscheidung für Backups;
- separate Produktivfreigabe und eine getestete Recovery-Übung.

Migrationen `0003` und `0004` bleiben **NOT APPLIED TO PRODUCTION**.

## Account-Löschung und Retention

Der aktuelle Account-Delete-Pfad löscht Supportdaten, allgemeinen Sync und Organisationsmitgliedschaften. `timeflow_work_time_current`, `timeflow_work_time_journal` und `timeflow_work_time_sessions` werden bewusst **nicht** automatisch einbezogen, solange keine fachliche und rechtliche Retention-Entscheidung vorliegt. Das verhindert sowohl ein unbeabsichtigtes Löschen eines append-only Audit-Journals als auch eine unzulässige Aufbewahrung.

Vor einer produktiven Aktivierung ist verbindlich festzulegen, ob Arbeitszeitdaten je Datenklasse gelöscht, anonymisiert oder für eine definierte Frist aufbewahrt werden müssen. Erst danach darf eine serverseitige, getestete Lösch-/Anonymisierungsroutine ergänzt werden. Bis dahin dürfen weder Client noch normale Account-Löschung Journal-Daten verändern.

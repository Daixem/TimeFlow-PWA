# TimeFlow D1 – Backup, Restore und Test-D1

Status: **noch nicht live verifiziert**. Dieses Dokument beschreibt ausschließlich den offiziellen Cloudflare-Weg. Es enthält keine Zugangsdaten und ersetzt keinen erfolgreichen Export-/Import-Test.

## Sicherheitsregel

Vor jeder schreibenden Aktion müssen die beiden IDs aus der autorisierten Cloudflare-Umgebung abgelesen und verglichen werden:

```text
TEST_DB_ID != PRODUCTION_DB_ID
```

Wenn die IDs fehlen oder identisch sind: **abbrechen**. Niemals die produktive D1 für Export-/Import- oder Migrationstests verwenden.

## Getrennte Umgebungen

| Zweck | Geplanter Name | Zulässige Daten |
| --- | --- | --- |
| Produktion | bestehende Produktions-D1 | echte TimeFlow-Daten, keine Tests |
| Exportquelle | `timeflow-test` | ausschließlich harmlose Testdaten |
| Restoreziel | `timeflow-restore-test` | ausschließlich wiederherstellbare Testdaten |

Die Namen sind Vorschläge. Entscheidend ist der serverseitig überprüfte Unterschied der D1-IDs.

## Offizieller Ablauf

1. Getrennte Test-D1-Datenbanken über die autorisierte Cloudflare-Konsole oder Wrangler erstellen.
2. Backend-Typ und Kennung mit `wrangler d1 info <test-db>` prüfen.
3. Harmlose Tabellen und Testdaten nur in `timeflow-test` anlegen.
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
8. Erst nach bestandenem Recovery-Test Migration `drizzle/0003_timeflow_work_time_journal.sql` gegen `timeflow-test` anwenden und Trigger, Revisionen sowie Append-only-Regeln dort prüfen.

## Recovery

Für D1 auf dem Production-Backend kann Cloudflare Time Travel als Point-in-Time-Recovery bereitstellen. Ein Restore überschreibt die jeweilige Ziel-D1 und wird deshalb zunächst ausschließlich an einer Test-D1 nachgewiesen. Vor einem Restore müssen der aktuelle Bookmark, der Zielname und die Ziel-ID dokumentiert werden.

## Offene Voraussetzungen

- autorisierte Cloudflare-/Wrangler-Ausführung;
- bekannte, getrennte D1-IDs;
- sicherer lokaler Speicherort für SQL-Exporte;
- Retention- und Verschlüsselungsentscheidung für Backups;
- erfolgreicher Import- und Integritätsnachweis.

Bis dahin bleibt Migration `0003` **NOT APPLIED TO PRODUCTION**.

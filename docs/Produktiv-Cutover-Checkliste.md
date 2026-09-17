# TimeFlow – Produktiv-Cutover-Checkliste

Status: **nicht freigegeben**. Diese Checkliste ist eine Sperre gegen einen versehentlichen Work-Time-Cutover, keine Deployment-Anweisung.

## Zwingende Reihenfolge

1. Produktive D1-ID und eine getrennte Recovery-D1-ID dokumentieren und vergleichen.
2. Vollständigen produktiven D1-Export erstellen, sicher speichern und Prüfsumme/Dateigröße erfassen.
3. Export in die getrennte Recovery-D1 importieren; Schema, Indizes, Trigger, Zeilenanzahlen und Stichproben vergleichen.
4. Bei jeder Abweichung, fehlendem Export oder fehlgeschlagenem Import: **STOPP**.
5. Work-Time-Gate bleibt AUS.
6. Migration `0003_timeflow_work_time_journal.sql` anwenden und Current-/Journal-Tabellen sowie Append-only-Trigger prüfen.
7. Migration `0004_timeflow_work_time_sessions.sql` anwenden und Session-Index/-Trigger prüfen.
8. Alle künftigen Tenant-/Organisation-Migrationen erst nach expliziter Freigabe und Test-D1-Nachweis anwenden.
9. Worker/API-Smoke-Test mit einem kontrollierten Testkonto durchführen.
10. Gate nur für kontrollierte Testkonten aktivieren, niemals global.
11. CLOCK_IN, Pause, CLOCK_OUT, Session, Journal und Revision prüfen.
12. Korrektur, Korrekturänderung und Stornierung prüfen.
13. Zweiten Nutzer und organisationsübergreifende Zugriffssperren prüfen.
14. Monitoring auf 5xx, D1-Fehler, 403, 409 und Pending-/Reconnect-Fehler prüfen.
15. Erst nach dokumentierter Beobachtungsphase eine breitere Beta erwägen.

## Harte STOP-Kriterien

- Backup oder Restore nicht verifiziert;
- Migration/Trigger/Schema unvollständig;
- Journal, Session oder Revision inkonsistent;
- 5xx- oder D1-Fehler;
- Cross-Tenant-Leak oder unberechtigter Fremdzugriff;
- Pending-/Konflikt-Regression;
- unklare Retention-/Account-Löschregel;
- kein erfolgreicher Zweitnutzer- oder Browser-E2E-Nachweis.

## Noch offene Freigaben

Die Work-Time-Tabellen sind derzeit nicht organisationsgebunden. Eine produktive Tenant-Migration darf erst nach einem vollständigen Datenmodell, einer expliziten Backfill-/Zuordnungsentscheidung ohne erfundene Default-Organisation und einem Test-D1-Nachweis erfolgen. Ebenso ist die Retention für Current, Journal und Sessions vor jeder produktiven Aktivierung verbindlich festzulegen.

# TimeFlow – Phase F: Organisationsmodell

Stand: 26. September 2026

Status: **LOKAL VALIDIERT – NOCH NICHT AUF D1 ANGEWENDET**

## Modell

Migration `0005_timeflow_work_time_subjects.sql` führt ein stabiles
Arbeitszeit-Subjekt ein. Ein Subjekt verbindet genau einen Benutzer mit genau
einem Arbeitszeitkontext:

- `private`: keine `organization_id` und keine erfundene Organisation;
- `organization`: echte `organization_id` und Beginn der Beschäftigung;
- eine aktive Beschäftigung je Benutzer und Organisation;
- eine spätere Rückkehr erzeugt nach beendetem Beschäftigungsverhältnis ein
  neues Subjekt und vermischt die Zeiträume nicht.

Current-State, Journal und Sessions erhalten `subject_id`, `scope_type` und
`organization_id`. Damit können private Arbeitszeit und mehrere Unternehmen
für denselben Login getrennt bleiben. Die Organisation wird bei jedem
Journal-Ereignis und jeder Session als unveränderlicher Kontext mitgeführt.

## Übernahme vorhandener Daten

Vorhandene Datensätze aus Migration `0003` und `0004` werden vollständig als
`private` übernommen. Die Migration:

- erstellt keine Organisation;
- leitet keine Organisation aus Einladung, E-Mail oder Beta-Zugang ab;
- erhält Current-, Journal- und Session-Zeilenzahlen;
- erhält Revisionen, Ereignisse und Sitzungswerte;
- erhält den Append-only-Schutz des Journals.

## Rollout-Sperre

Migration `0005` ersetzt den Primärschlüssel des Current-State durch
`subject_id`. Der aktuelle Worker schreibt noch ausschließlich anhand von
`user_id`. Deshalb darf `0005` noch nicht auf die laufende Test-D1 angewendet
werden.

Vor der Test-D1-Migration ist ein kompatibler Worker-Schreibpfad erforderlich,
der:

1. den Kontext serverseitig aus Benutzer und bestätigter Mitgliedschaft löst;
2. `subject_id`, `scope_type` und `organization_id` selbst setzt;
3. keine Organisations-ID aus dem Request übernimmt;
4. Lesen, Schreiben, Journal und Sessions immer auf das aufgelöste Subjekt
   begrenzt;
5. während der koordinierten Migration mit deaktiviertem Work-Time-Gate
   ausgerollt und erst nach dem Schema-Smoke-Test aktiviert wird.

## Lokale Validierung

`scripts/test-work-time-subjects.py` wendet Migrationen `0001`, `0003`, `0004`
und `0005` ausschließlich auf eine flüchtige SQLite-Datenbank an. Geprüft sind:

| Prüfung | Status |
| --- | --- |
| Bestehende Zeilen vollständig erhalten | **PASS** |
| Bestehende Daten ausschließlich privat | **PASS** |
| Keine Default-Organisation erzeugt | **PASS** |
| Private und Team-Subjekte getrennt | **PASS** |
| Mehrere Organisationen pro Login getrennt | **PASS** |
| Doppelte aktive Beschäftigung abgewiesen | **PASS** |
| Rückkehr nach Austritt als neues Subjekt | **PASS** |
| Cross-Tenant-Subjektfehler abgewiesen | **PASS** |
| Organisation in Journal und Session erhalten | **PASS** |
| Append-only-Journal weiterhin geschützt | **PASS** |

Produktion, produktive D1, Test-D1, Worker-Bindings und Feature-Gates wurden
durch diesen Entwurf nicht verändert.


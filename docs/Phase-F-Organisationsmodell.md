# TimeFlow – Phase F: Organisationsmodell

Stand: 26. September 2026

Status: **SCHEMA UND WORKER LOKAL VALIDIERT – NOCH NICHT AUF D1 ANGEWENDET**

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

Der kompatible Worker-Schreibpfad ist lokal implementiert und getestet. Er:

1. den Kontext serverseitig aus Benutzer und bestätigter Mitgliedschaft löst;
2. `subject_id`, `scope_type` und `organization_id` selbst setzt;
3. keine Organisations-ID aus dem Request übernimmt;
4. Lesen, Schreiben, Journal und Sessions immer auf das aufgelöste Subjekt
   begrenzt;
5. erkennt das bisherige und das neue Schema, ohne Teamdaten in das alte Schema
   zu schreiben;
6. verlangt für Teamzugriffe eine serverseitig bestätigte Mitgliedschaft und
   für Fremdkorrekturen zusätzlich eine Admin- oder Owner-Rolle derselben
   Organisation.

Für den Remote-Test wird dieser kompatible Worker zuerst auf Pre-Prod
ausgerollt. Migration `0005` läuft anschließend zunächst auf einer ungebundenen
Kopie der Test-D1. Erst nach Export, Schema-/Zeilenvergleich und Smoke-Test darf
die gebundene Test-D1 in einem kontrollierten Wartungsfenster folgen.

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
| Bisheriges Schema weiterhin unterstützt | **PASS** |
| Teamkontext nur mit bestätigter Mitgliedschaft | **PASS** |
| Adminzugriff auf dieselbe Organisation begrenzt | **PASS** |
| Organisations-ID im Request-Body abgewiesen | **PASS** |
| Private und Team-Sessions API-seitig getrennt | **PASS** |

Produktion, produktive D1, Test-D1, Worker-Bindings und Feature-Gates wurden
durch diesen Entwurf nicht verändert.

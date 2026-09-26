# TimeFlow – Phase F: Organisationsmodell

Stand: 26. September 2026

Status: **TEST-D1 MIGRIERT – TEAM-E2E NOCH AUSSTEHEND**

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

## Pre-Production-Rollout

Migration `0005` ersetzt den Primärschlüssel des Current-State durch
`subject_id`. Der kompatible Worker-Schreibpfad wurde deshalb vor der Migration
auf Pre-Production ausgerollt. Er:

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

Migration `0005` lief anschließend zuerst auf einer ungebundenen Kopie der
Test-D1 und nach Export, Schema-/Zeilenvergleich und Smoke-Test in einem
kontrollierten Wartungsfenster auf der gebundenen Test-D1.

Der Browserclient übermittelt den bestätigten Organisationskontext als Header.
Private Daten und jede Organisation verwenden getrennte lokale Current-,
Revision-, Pending- und Konfliktspeicher. Beim Wechsel zwischen Privat- und
Teammodus wird der jeweilige Serverstand neu geladen; eine abweichende
Kontextantwort wird verworfen.

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
| Organisationsheader im Client gesetzt | **PASS** |
| Private und Team-Offlinedaten lokal getrennt | **PASS** |
| Kontextwechsel lädt den getrennten Serverstand | **PASS** |

## Remote-Validierung

- Worker-Commit: `10d5459aa42356a5076be74d2e1dd594aaf67107`
- Pre-Prod-Version nach Migration: `64f24f36-d1e0-4b8d-8f17-41961847f0ce`
- Worker: `timeflow-preprod`
- Gebundene Test-D1: `timeflow-migration-test-20260917`
- Test-D1-ID: `4826b07d-8a23-4098-80d7-ee6a6469bcab`
- Ungebundene Migrationskopie: `timeflow-phase-e-restore-20260926`
- Kopie-ID: `c2e61847-7edd-40ac-89ad-57b80756a353`
- Export vor Migration: 49.345 Byte
- Export-SHA-256:
  `10cfdb543d6c85c173fe067ee441fb2a0eb084ad3c08128ffc87595e58254456`

Migration `0005` wurde zuerst auf die ungebundene Kopie und anschließend in
einem Work-Time-Wartungsfenster auf die gebundene Test-D1 angewendet. In beiden
Fällen wurden 35 Abfragen erfolgreich ausgeführt. Vor und nach der Migration
blieben 8 Current-, 34 Journal- und 10 Session-Zeilen erhalten. Neun eindeutige
private Subjekte wurden aus allen vorhandenen Arbeitszeitdaten gebildet; die
Zahl ist höher als Current, weil ein historischer Benutzer nur in Journal oder
Sessions vorkommt. Es wurde keine Organisation erzeugt.

Auf der ungebundenen Kopie wurden Journal-UPDATE, Scope-Änderung am
Current-State und ein Organisationssubjekt ohne `organization_id` remote durch
Trigger beziehungsweise CHECK-Constraint abgewiesen. Die Fehlversuche
veränderten keine Zeilenzahl. Nach der Migration wurde das Work-Time-Gate wieder
aktiviert; der angemeldete Pre-Prod-Client lud den privaten Arbeitszeitstand und
gab die Stempelfunktion frei.

Produktion, produktive D1 und produktive Bindings wurden nicht verändert. Die
SQL-Exporte liegen nur im lokalen temporären Verzeichnis und werden nicht
versioniert.

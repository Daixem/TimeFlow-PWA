# Phase 7 – serverseitiges Arbeitszeit-Journal (Entwurf)

Status: **nur Entwurf, nicht migriert, nicht deployed**. Dieser Entwurf darf erst nach einem verifizierten Backup-/Restore-Weg und einer getrennten Test-D1 umgesetzt werden.

## Ist-Zustand

Arbeitszeit ist heute browserlokal. `js/script.js` schreibt den laufenden Zustand nach `timeflow-workday-v2`; abgeschlossene Tage werden nach `timeflow-workday-history-v1` kopiert. `js/private-account.js` leitet daraus Einträge in `timeflow-private-account-v1` ab und führt einen lokalen, auf 500 Ereignisse begrenzten Verlauf in `timeflow-worktime-audit-v1`.

Der allgemeine Sync sendet diese Werte als Teil von `timeflow_user_sync.payload_json` über `PUT /api/sync`. Der Worker speichert lediglich den gesamten Snapshot und dessen globale Revision. Es gibt heute keinen eigenen Arbeitszeit-Endpunkt und keine serverseitige Arbeitszeit- oder Journal-Tabelle. Dadurch sind Client-Zeit, Korrekturen und der lokale Audit-Verlauf nicht revisionssicher auf dem Server.

## Zielmodell

Arbeitszeit wird als eigener serverseitiger Bereich geführt, getrennt vom allgemeinen Einstellungs-/Profilsnapshot:

* `timeflow_work_time_current`: aktueller, effizient lesbarer Zustand je Benutzer.
* `timeflow_work_time_journal`: append-only Historie jeder serverseitig akzeptierten Änderung.

Der aktuelle Zustand ist die Lesemodell-Tabelle; das Journal ist der nachvollziehbare Beleg. Für eine Änderung schreibt der Worker ausschließlich den aktuellen Zustand. Datenbank-Trigger fügen den Journal-Eintrag in derselben D1-Transaktion ein. Die normale API stellt weder `UPDATE` noch `DELETE` für Journal-Datensätze bereit.

Die Arbeitszeit erhält eine **eigene Ressourcenrevision** `revision`. Das ist kein Ersatz und kein Bypass für Phase 6: `timeflow_user_sync.revision` bleibt die Concurrency-Revision des allgemeinen Snapshots; `timeflow_work_time_current.revision` schützt nur die separat serverautoritative Arbeitszeitressource. Das ist erforderlich, weil Arbeitszeit nicht mehr als frei überschreibbarer Teil eines Gesamt-Snapshots behandelt werden darf.

## Vorgeschlagenes Schema (Migration 0003, Entwurf)

```sql
CREATE TABLE timeflow_work_time_current (
  user_id TEXT PRIMARY KEY NOT NULL,
  state_json TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision > 0),
  last_actor_user_id TEXT NOT NULL,
  last_event_type TEXT NOT NULL CHECK (last_event_type IN ('CLOCK_IN','CLOCK_OUT','PAUSE_START','PAUSE_END','TIME_CORRECTION','ADMIN_CORRECTION','MANUAL_ENTRY','SYNC_IMPORT')),
  last_source TEXT NOT NULL,
  effective_timestamp TEXT,
  server_updated_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE timeflow_work_time_journal (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  source TEXT NOT NULL,
  revision INTEGER NOT NULL,
  effective_timestamp TEXT,
  server_timestamp TEXT NOT NULL,
  previous_state_json TEXT,
  new_state_json TEXT NOT NULL
);
CREATE INDEX idx_work_time_journal_user_revision
  ON timeflow_work_time_journal(user_id, revision DESC);
```

Für die endgültige Migration werden zwei Trigger ergänzt: einer für den initialen `INSERT` in `timeflow_work_time_current`, einer für jedes `UPDATE`. Sie schreiben den Journal-Eintrag mit `NEW.last_actor_user_id`, `NEW.last_event_type`, `NEW.last_source` und der vom Worker erzeugten Serverzeit. Im Produktpfad dürfen keine Trigger oder Journal-Daten entfernt, deaktiviert oder direkt aktualisiert werden.

Die endgültige Trigger-Syntax und die D1-Batch-Semantik sind vor einer Migration gegen eine getrennte Test-D1 zu prüfen. Die Cloudflare-D1-Dokumentation beschreibt `batch()` als sequentielle SQL-Transaktion mit Rollback bei einem fehlgeschlagenen Statement; das ist die vorgesehene Basis für Zustand und Journal.[^d1]

## Isolierte SQL-Validierung (noch nicht produktiv)

`scripts/test-work-time-journal.mjs` startet `scripts/test-work-time-journal.py` mit einer ausschließlich flüchtigen SQLite-Datenbank. Der Harness verwendet das vorgeschlagene Current-State-Schema, Datenbanktrigger für die Journal-Erzeugung und Datenbanktrigger, die Journal-`UPDATE` und `DELETE` blockieren. Er ist keine Verbindung zur produktiven D1 und keine Migration.

Der Runner verwendet eine vorhandene Python-3-Laufzeit mit dem Standardmodul `sqlite3`. Wenn `python` nicht im `PATH` liegt, wird der Pfad per `TIMEFLOW_PYTHON` übergeben. Es wird keine Python- oder Node-Dependency installiert.

Der Worker-Entwurf setzt `actor_user_id`, `last_event_type`, `last_source` und `server_updated_at` selbst aus der authentifizierten Identität und der serverseitigen Fachregel. Diese Auditwerte dürfen nicht aus einem Request-Payload übernommen werden. Ein clientseitiger effektiver Zeitpunkt kann getrennt als fachlicher Zeitpunkt gespeichert werden.

Der isolierte Harness validiert Create/Update, veraltete und parallele Revisionen, eigene und administrative Korrekturen, unberechtigte Fremdkorrekturen, Actor- und Serverzeit-Manipulation, Trigger-Atomarität bei einem absichtlich fehlschlagenden Journal-Insert sowie die Append-only-Regeln. Er bestätigt damit das SQL-Design, nicht die noch nicht existierende produktive Worker-Route oder eine D1-Migration.

## Übergang: lokaler Client zu serverautoritativem Arbeitszeitpfad

Der heutige Client schreibt `CLOCK_IN`, `CLOCK_OUT` und die manuelle Pause in `js/script.js` nach `timeflow-workday-v2`. `js/private-account.js` erstellt daraus lokale Kontoeinträge und Korrekturen; `js/sprint9.js` nimmt diese Schlüssel weiterhin in den allgemeinen Sync-Snapshot auf. Die automatische Pause ist ein aus Dauer und Einstellungen abgeleiteter Wert, kein eigenes Ereignis.

`js/work-time-api.js` ist ein fachlicher Adapter für die spätere API. Er hält eine **eigene** Arbeitszeitrevision unter `timeflow-work-time-meta-v1`, einen Offline-Pending-Vorgang und einen separaten Konfliktzustand. Er kennt weder die allgemeine Sync-Revision noch das Theme oder die UI. Der Adapter ist in dieser Phase absichtlich noch nicht an die vorhandenen Stempelfunktionen gebunden.

Der Worker akzeptiert den neuen Pfad nur bei `TIMEFLOW_WORK_TIME_SERVER_ENABLED === "true"`. Fehlt die serverseitige Variable oder ist sie anders gesetzt, geben `/api/work-time` und `/api/work-time/journal` `503 work_time_feature_disabled` zurück. Dadurch kann kein Client- oder LocalStorage-Wert den Pfad vor einer Migration aktivieren.

Der spätere Cutover braucht einen klaren Umschaltpunkt: Entweder schreibt eine Aktion ausschließlich lokal in den bisherigen Snapshot **oder** ausschließlich über die Work-Time-API. Dauerhaftes Double-Write ist verboten. Erst nach echter Test-D1-Migration, einem aktivierten Server-Gate, verifizierter Client-Übernahme und einer bewusst abgeschlossenen Legacy-Übernahme darf `timeflow-workday-v2` aus `SYNC_KEYS` entfernt werden. Bis dahin bleibt die lokale Arbeitszeit unverändert führend.

Ein Legacy-Import ist später ausschließlich als bewusst ausgelöster, idempotenter `SYNC_IMPORT` eines aktuellen lokalen Snapshots zulässig. Er benötigt eine Client-Event-ID, einen Importmarker pro Benutzer und eine sichtbare Bestätigung. Historische lokale Einträge dürfen nicht als nachträgliche `CLOCK_IN`-/`CLOCK_OUT`-Kette rekonstruiert werden.

## Reale Test-D1 sowie Backup- und Recovery-Vorbereitung

Eine getrennte, autorisierte Test-D1 ist derzeit in diesem Projekt nicht konfiguriert oder verifizierbar. Daher wurde weder eine Datenbank erstellt noch eine D1-Verbindung geöffnet.

Der spätere reale Testprozess ist ausschließlich mit den offiziellen Cloudflare-Wegen auszuführen:

1. Test-D1 separat erstellen und ihre Kennung/Berechtigung dokumentieren.
2. Mit `wrangler d1 info <test-db>` den Speicher-Backend-Typ prüfen.
3. Mit `wrangler d1 export <test-db> --remote --output=<sicherer-pfad>` einen vollständigen SQL-Export erstellen.
4. Den Export nur in eine getrennte Test-D1 mit `wrangler d1 execute <restore-ziel> --remote --file=<export.sql>` importieren.
5. Schema, Trigger, Indizes, Tabellen- und Datensatzanzahlen vergleichen.
6. Erst dort Migration `0003` anwenden und Current/Journal-Trigger mit Testdaten prüfen.
7. Bei D1 auf dem Production-Backend kann Time Travel als Recovery-Weg geprüft werden; ein Restore überschreibt die jeweilige Ziel-D1 in-place und ist deshalb ausschließlich auf der Test-D1 zu testen.

Cloudflare dokumentiert SQL-Export und -Import über Wrangler sowie Time Travel als Point-in-Time-Recovery. Time Travel klont oder forkt eine Datenbank derzeit nicht; es ersetzt keinen getrennten Test-D1-Nachweis.[^d1-export][^d1-time-travel]

## API- und Autorisierungsentwurf

Ein späterer `/api/work-time`-Schreibpfad akzeptiert nur fachliche Ereignisdaten, `expectedRevision`, einen clientseitigen effektiven Zeitpunkt und eine idempotente Client-Event-ID. Er akzeptiert niemals `actor_user_id`, Auditzeit oder eine neue Revision aus dem Payload.

* Die Identität stammt ausschließlich aus `authenticatedUser(request)`.
* Eigene Ereignisse verwenden `actor_user_id = user.id` und dürfen nur die eigene Ressource ändern.
* Fremde Korrekturen benötigen `betaAccess(...).admin`; der Worker setzt dabei den authentifizierten Admin als Actor.
* Der Worker erzeugt `server_timestamp`, `created_at` und die nächste Revision selbst.
* Ein fehlendes, negatives oder nicht-integer `expectedRevision` liefert 400; ein veralteter Stand liefert 409 mit ausschließlich dem eigenen aktuellen Zustand.

`CLOCK_IN`, `CLOCK_OUT`, `PAUSE_START` und `PAUSE_END` sind für den vorhandenen Zustand erforderlich. `TIME_CORRECTION`, `ADMIN_CORRECTION` und `MANUAL_ENTRY` sind für die heutige Korrektur-/Arbeitszeitkonto-Funktion erforderlich. `SYNC_IMPORT` ist ausschließlich für eine bewusst bestätigte einmalige Legacy-Übernahme vorgesehen, nicht für regulären Snapshot-Sync.

## Legacy-Daten

Vorhandene lokale Werte in `timeflow-workday-v2`, `timeflow-workday-history-v1`, `timeflow-private-account-v1` und `timeflow-worktime-audit-v1` sind keine beweisbare Serverhistorie. Sie dürfen daher nicht nachträglich als einzelne Journal-Ereignisse erfunden werden.

Die spätere Migration behandelt sie als Legacy-Stand: Nach ausdrücklicher Benutzerbestätigung kann ein einzelnes `SYNC_IMPORT`-Ereignis mit Quelle `legacy_import` und einem klaren Hinweis auf die begrenzte Herkunft entstehen. Ohne Bestätigung bleiben sie lokal lesbar und unverändert.

## Pause und Aufbewahrung (offene Produktentscheidung)

TimeFlow berechnet die automatische Pause heute aus Arbeitsdauer und Einstellungen; dafür darf keine erfundene automatische Journalbuchung entstehen. Die vorhandene manuelle Pause (`PAUSE_START`/`PAUSE_END`) ist dagegen eine tatsächliche Benutzeraktion und gehört im späteren serverseitigen Pfad als Ereignis in das Journal.

Der spätere Umgang mit `DELETE /api/account-data` und Journal-Daten ist **offen**: Eine Kontolöschung, gesetzliche Aufbewahrungspflichten und eine anonymisierte statt physische Löschung benötigen vor Implementierung eine Produkt- und Datenschutzentscheidung. Bis dahin darf kein Account-Delete-Pfad Journal-Daten still löschen oder entgegen einer noch nicht festgelegten Regel erhalten.

## Isolierte Testmatrix vor jeder Migration

* CLOCK_IN und CLOCK_OUT: aktueller Zustand und genau ein Journal-Eintrag pro akzeptiertem Ereignis.
* PAUSE_START/PAUSE_END sowie automatische Pausenberechnung.
* TIME_CORRECTION und ADMIN_CORRECTION mit serverseitigem Actor.
* Manipulierte `actor_user_id`, `revision`, Auditzeit oder fremde `user_id`: keine Wirkung.
* Zwei parallele Writes mit derselben Ressourcenrevision: genau einer erfolgreich, zweiter 409.
* Fehler im Journal-Insert/Trigger: Zustand darf nicht aktualisiert werden.
* Journal ist per normalem Worker-Routing weder update- noch löschbar.
* Legacy-Import erstellt höchstens ein klar gekennzeichnetes Import-Ereignis und niemals eine erfundene Historie.

[^d1]: Cloudflare D1 Worker API – `D1Database.batch()`: https://developers.cloudflare.com/d1/worker-api/d1-database/
[^d1-export]: Cloudflare D1 – Import and export data: https://developers.cloudflare.com/d1/best-practices/import-export-data/
[^d1-time-travel]: Cloudflare D1 – Time Travel and backups: https://developers.cloudflare.com/d1/reference/time-travel/

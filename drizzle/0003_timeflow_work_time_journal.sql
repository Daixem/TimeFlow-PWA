-- NOT APPLIED TO PRODUCTION.
-- Phase 7 schema for the future server-authoritative work-time API.
-- Apply only after a verified backup/restore and a separately authorized migration.

CREATE TABLE timeflow_work_time_current (
  user_id TEXT PRIMARY KEY NOT NULL,
  state_json TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision > 0),
  last_actor_user_id TEXT NOT NULL,
  last_event_type TEXT NOT NULL CHECK (last_event_type IN ('CLOCK_IN', 'CLOCK_OUT', 'PAUSE_START', 'PAUSE_END', 'TIME_CORRECTION', 'ADMIN_CORRECTION', 'MANUAL_ENTRY', 'SYNC_IMPORT')),
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
  revision INTEGER NOT NULL CHECK (revision > 0),
  effective_timestamp TEXT,
  server_timestamp TEXT NOT NULL,
  previous_state_json TEXT,
  new_state_json TEXT NOT NULL
);

CREATE INDEX idx_work_time_journal_user_revision
  ON timeflow_work_time_journal(user_id, revision DESC);

CREATE TRIGGER work_time_current_journal_insert
AFTER INSERT ON timeflow_work_time_current
BEGIN
  INSERT INTO timeflow_work_time_journal (
    id, user_id, actor_user_id, event_type, source, revision,
    effective_timestamp, server_timestamp, previous_state_json, new_state_json
  ) VALUES (
    lower(hex(randomblob(16))),
    NEW.user_id, NEW.last_actor_user_id, NEW.last_event_type, NEW.last_source,
    NEW.revision, NEW.effective_timestamp, NEW.server_updated_at, NULL, NEW.state_json
  );
END;

CREATE TRIGGER work_time_current_journal_update
AFTER UPDATE OF state_json, revision, last_actor_user_id, last_event_type,
                last_source, effective_timestamp, server_updated_at
ON timeflow_work_time_current
BEGIN
  INSERT INTO timeflow_work_time_journal (
    id, user_id, actor_user_id, event_type, source, revision,
    effective_timestamp, server_timestamp, previous_state_json, new_state_json
  ) VALUES (
    lower(hex(randomblob(16))),
    NEW.user_id, NEW.last_actor_user_id, NEW.last_event_type, NEW.last_source,
    NEW.revision, NEW.effective_timestamp, NEW.server_updated_at, OLD.state_json, NEW.state_json
  );
END;

CREATE TRIGGER work_time_journal_append_only_update
BEFORE UPDATE ON timeflow_work_time_journal
BEGIN
  SELECT RAISE(ABORT, 'work time journal is append-only');
END;

CREATE TRIGGER work_time_journal_append_only_delete
BEFORE DELETE ON timeflow_work_time_journal
BEGIN
  SELECT RAISE(ABORT, 'work time journal is append-only');
END;

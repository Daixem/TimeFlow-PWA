-- NOT APPLIED TO PRODUCTION.
-- Requires verified D1 backup/restore and migration 0003 before use.
-- Completed sessions are the server-authoritative work-time history.

CREATE TABLE timeflow_work_time_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  work_date TEXT NOT NULL,
  clock_in TEXT NOT NULL,
  clock_out TEXT NOT NULL,
  pause_minutes INTEGER NOT NULL CHECK (pause_minutes >= 0),
  gross_minutes INTEGER NOT NULL CHECK (gross_minutes >= 0),
  net_minutes INTEGER NOT NULL CHECK (net_minutes >= 0),
  status TEXT NOT NULL CHECK (status = 'completed'),
  start_revision INTEGER NOT NULL CHECK (start_revision > 0),
  end_revision INTEGER NOT NULL CHECK (end_revision > start_revision),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (user_id, end_revision)
);

CREATE INDEX idx_work_time_sessions_user_date
  ON timeflow_work_time_sessions(user_id, work_date DESC, clock_out DESC);

-- The session is derived in the same D1 statement transaction as CLOCK_OUT.
-- A session constraint/trigger failure therefore also rolls back Current + Journal.
CREATE TRIGGER work_time_current_complete_session
AFTER UPDATE OF state_json, revision, last_event_type, server_updated_at
ON timeflow_work_time_current
WHEN NEW.last_event_type = 'CLOCK_OUT'
BEGIN
  INSERT INTO timeflow_work_time_sessions (
    id, user_id, work_date, clock_in, clock_out, pause_minutes,
    gross_minutes, net_minutes, status, start_revision, end_revision,
    created_at, updated_at
  ) VALUES (
    lower(hex(randomblob(16))),
    NEW.user_id,
    substr(json_extract(NEW.state_json, '$.workStart'), 1, 10),
    json_extract(NEW.state_json, '$.workStart'),
    NEW.server_updated_at,
    max(0, cast(coalesce(json_extract(NEW.state_json, '$.pauseAccumulatedMs'), 0) / 60000 as integer)),
    max(0, cast((julianday(NEW.server_updated_at) - julianday(json_extract(NEW.state_json, '$.workStart'))) * 1440 as integer)),
    max(0, cast((julianday(NEW.server_updated_at) - julianday(json_extract(NEW.state_json, '$.workStart'))) * 1440 as integer) - max(0, cast(coalesce(json_extract(NEW.state_json, '$.pauseAccumulatedMs'), 0) / 60000 as integer))),
    'completed',
    coalesce(json_extract(NEW.state_json, '$.workStartRevision'), NEW.revision - 1),
    NEW.revision,
    NEW.server_updated_at,
    NEW.server_updated_at
  );
END;

-- NOT APPLIED TO PRODUCTION.
-- Phase F tenant expansion for a coordinated test-only migration.
-- Existing work-time rows are preserved as private data. No organization is
-- inferred or created by this migration.

DROP TRIGGER IF EXISTS work_time_current_complete_session;
DROP TRIGGER IF EXISTS work_time_current_journal_insert;
DROP TRIGGER IF EXISTS work_time_current_journal_update;
DROP TRIGGER IF EXISTS work_time_journal_append_only_update;
DROP TRIGGER IF EXISTS work_time_journal_append_only_delete;

CREATE TABLE timeflow_work_time_subjects (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('private', 'organization')),
  organization_id TEXT,
  employment_started_at TEXT,
  employment_ended_at TEXT,
  private_deletion_requested_at TEXT,
  delete_after TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (
    (scope_type = 'private' AND organization_id IS NULL
      AND employment_started_at IS NULL AND employment_ended_at IS NULL)
    OR
    (scope_type = 'organization' AND organization_id IS NOT NULL
      AND employment_started_at IS NOT NULL)
  ),
  CHECK (employment_ended_at IS NULL OR employment_ended_at >= employment_started_at),
  CHECK (
    (private_deletion_requested_at IS NULL AND delete_after IS NULL)
    OR
    (scope_type = 'private' AND private_deletion_requested_at IS NOT NULL
      AND delete_after IS NOT NULL
      AND delete_after >= private_deletion_requested_at)
  )
);

CREATE UNIQUE INDEX idx_work_time_subject_private_user
  ON timeflow_work_time_subjects(user_id)
  WHERE scope_type = 'private';

CREATE UNIQUE INDEX idx_work_time_subject_active_organization_user
  ON timeflow_work_time_subjects(organization_id, user_id)
  WHERE scope_type = 'organization' AND employment_ended_at IS NULL;

CREATE INDEX idx_work_time_subject_organization_status
  ON timeflow_work_time_subjects(organization_id, employment_ended_at, user_id)
  WHERE scope_type = 'organization';

CREATE INDEX idx_work_time_subject_deletion_due
  ON timeflow_work_time_subjects(delete_after)
  WHERE delete_after IS NOT NULL;

INSERT INTO timeflow_work_time_subjects (
  id, user_id, scope_type, organization_id, employment_started_at,
  employment_ended_at, private_deletion_requested_at, delete_after,
  created_at, updated_at
)
SELECT
  lower(hex(randomblob(16))),
  existing.user_id,
  'private',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  min(existing.first_seen_at),
  max(existing.last_seen_at)
FROM (
  SELECT user_id, created_at AS first_seen_at, server_updated_at AS last_seen_at
    FROM timeflow_work_time_current
  UNION ALL
  SELECT user_id, server_timestamp, server_timestamp
    FROM timeflow_work_time_journal
  UNION ALL
  SELECT user_id, created_at, updated_at
    FROM timeflow_work_time_sessions
) AS existing
GROUP BY existing.user_id;

CREATE TABLE timeflow_work_time_current_v2 (
  subject_id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('private', 'organization')),
  organization_id TEXT,
  state_json TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision > 0),
  last_actor_user_id TEXT NOT NULL,
  last_event_type TEXT NOT NULL CHECK (last_event_type IN ('CLOCK_IN', 'CLOCK_OUT', 'PAUSE_START', 'PAUSE_END', 'TIME_CORRECTION', 'ADMIN_CORRECTION', 'CORRECTION_UPDATED', 'CORRECTION_REVOKED', 'MANUAL_ENTRY', 'SYNC_IMPORT')),
  last_source TEXT NOT NULL,
  effective_timestamp TEXT,
  server_updated_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  CHECK (
    (scope_type = 'private' AND organization_id IS NULL)
    OR (scope_type = 'organization' AND organization_id IS NOT NULL)
  )
);

CREATE TABLE timeflow_work_time_journal_v2 (
  id TEXT PRIMARY KEY NOT NULL,
  subject_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('private', 'organization')),
  organization_id TEXT,
  actor_user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  source TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision > 0),
  effective_timestamp TEXT,
  server_timestamp TEXT NOT NULL,
  previous_state_json TEXT,
  new_state_json TEXT NOT NULL,
  CHECK (
    (scope_type = 'private' AND organization_id IS NULL)
    OR (scope_type = 'organization' AND organization_id IS NOT NULL)
  )
);

CREATE TABLE timeflow_work_time_sessions_v2 (
  id TEXT PRIMARY KEY NOT NULL,
  subject_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('private', 'organization')),
  organization_id TEXT,
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
  UNIQUE (subject_id, end_revision),
  CHECK (
    (scope_type = 'private' AND organization_id IS NULL)
    OR (scope_type = 'organization' AND organization_id IS NOT NULL)
  )
);

INSERT INTO timeflow_work_time_current_v2 (
  subject_id, user_id, scope_type, organization_id, state_json, revision,
  last_actor_user_id, last_event_type, last_source, effective_timestamp,
  server_updated_at, created_at
)
SELECT
  subject.id, current.user_id, 'private', NULL, current.state_json,
  current.revision, current.last_actor_user_id, current.last_event_type,
  current.last_source, current.effective_timestamp, current.server_updated_at,
  current.created_at
FROM timeflow_work_time_current AS current
JOIN timeflow_work_time_subjects AS subject
  ON subject.user_id = current.user_id AND subject.scope_type = 'private';

INSERT INTO timeflow_work_time_journal_v2 (
  id, subject_id, user_id, scope_type, organization_id, actor_user_id,
  event_type, source, revision, effective_timestamp, server_timestamp,
  previous_state_json, new_state_json
)
SELECT
  journal.id, subject.id, journal.user_id, 'private', NULL,
  journal.actor_user_id, journal.event_type, journal.source, journal.revision,
  journal.effective_timestamp, journal.server_timestamp,
  journal.previous_state_json, journal.new_state_json
FROM timeflow_work_time_journal AS journal
JOIN timeflow_work_time_subjects AS subject
  ON subject.user_id = journal.user_id AND subject.scope_type = 'private';

INSERT INTO timeflow_work_time_sessions_v2 (
  id, subject_id, user_id, scope_type, organization_id, work_date, clock_in,
  clock_out, pause_minutes, gross_minutes, net_minutes, status,
  start_revision, end_revision, created_at, updated_at
)
SELECT
  session.id, subject.id, session.user_id, 'private', NULL,
  session.work_date, session.clock_in, session.clock_out,
  session.pause_minutes, session.gross_minutes, session.net_minutes,
  session.status, session.start_revision, session.end_revision,
  session.created_at, session.updated_at
FROM timeflow_work_time_sessions AS session
JOIN timeflow_work_time_subjects AS subject
  ON subject.user_id = session.user_id AND subject.scope_type = 'private';

DROP TABLE timeflow_work_time_sessions;
DROP TABLE timeflow_work_time_journal;
DROP TABLE timeflow_work_time_current;

ALTER TABLE timeflow_work_time_current_v2 RENAME TO timeflow_work_time_current;
ALTER TABLE timeflow_work_time_journal_v2 RENAME TO timeflow_work_time_journal;
ALTER TABLE timeflow_work_time_sessions_v2 RENAME TO timeflow_work_time_sessions;

CREATE INDEX idx_work_time_current_user_scope
  ON timeflow_work_time_current(user_id, scope_type, organization_id);

CREATE INDEX idx_work_time_journal_subject_revision
  ON timeflow_work_time_journal(subject_id, revision DESC);

CREATE INDEX idx_work_time_journal_organization_user_revision
  ON timeflow_work_time_journal(organization_id, user_id, revision DESC)
  WHERE scope_type = 'organization';

CREATE INDEX idx_work_time_sessions_subject_date
  ON timeflow_work_time_sessions(subject_id, work_date DESC, clock_out DESC);

CREATE INDEX idx_work_time_sessions_organization_user_date
  ON timeflow_work_time_sessions(organization_id, user_id, work_date DESC)
  WHERE scope_type = 'organization';

CREATE TRIGGER work_time_current_subject_insert_guard
BEFORE INSERT ON timeflow_work_time_current
WHEN NOT EXISTS (
  SELECT 1 FROM timeflow_work_time_subjects AS subject
  WHERE subject.id = NEW.subject_id
    AND subject.user_id = NEW.user_id
    AND subject.scope_type = NEW.scope_type
    AND subject.organization_id IS NEW.organization_id
)
BEGIN
  SELECT RAISE(ABORT, 'work time subject mismatch');
END;

CREATE TRIGGER work_time_current_subject_update_guard
BEFORE UPDATE OF subject_id, user_id, scope_type, organization_id
ON timeflow_work_time_current
BEGIN
  SELECT RAISE(ABORT, 'work time subject is immutable');
END;

CREATE TRIGGER work_time_current_journal_insert
AFTER INSERT ON timeflow_work_time_current
BEGIN
  INSERT INTO timeflow_work_time_journal (
    id, subject_id, user_id, scope_type, organization_id, actor_user_id,
    event_type, source, revision, effective_timestamp, server_timestamp,
    previous_state_json, new_state_json
  ) VALUES (
    lower(hex(randomblob(16))), NEW.subject_id, NEW.user_id, NEW.scope_type,
    NEW.organization_id, NEW.last_actor_user_id, NEW.last_event_type,
    NEW.last_source, NEW.revision, NEW.effective_timestamp,
    NEW.server_updated_at, NULL, NEW.state_json
  );
END;

CREATE TRIGGER work_time_current_journal_update
AFTER UPDATE OF state_json, revision, last_actor_user_id, last_event_type,
                last_source, effective_timestamp, server_updated_at
ON timeflow_work_time_current
BEGIN
  INSERT INTO timeflow_work_time_journal (
    id, subject_id, user_id, scope_type, organization_id, actor_user_id,
    event_type, source, revision, effective_timestamp, server_timestamp,
    previous_state_json, new_state_json
  ) VALUES (
    lower(hex(randomblob(16))), NEW.subject_id, NEW.user_id, NEW.scope_type,
    NEW.organization_id, NEW.last_actor_user_id, NEW.last_event_type,
    NEW.last_source, NEW.revision, NEW.effective_timestamp,
    NEW.server_updated_at, OLD.state_json, NEW.state_json
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

CREATE TRIGGER work_time_current_complete_session
AFTER UPDATE OF state_json, revision, last_event_type, server_updated_at
ON timeflow_work_time_current
WHEN NEW.last_event_type = 'CLOCK_OUT'
BEGIN
  INSERT INTO timeflow_work_time_sessions (
    id, subject_id, user_id, scope_type, organization_id, work_date,
    clock_in, clock_out, pause_minutes, gross_minutes, net_minutes, status,
    start_revision, end_revision, created_at, updated_at
  ) VALUES (
    lower(hex(randomblob(16))),
    NEW.subject_id,
    NEW.user_id,
    NEW.scope_type,
    NEW.organization_id,
    substr(json_extract(NEW.state_json, '$.workStart'), 1, 10),
    json_extract(NEW.state_json, '$.workStart'),
    NEW.server_updated_at,
    max(max(0, cast(coalesce(json_extract(NEW.state_json, '$.pauseAccumulatedMs'), 0) / 60000 as integer)), max(0, cast(coalesce(json_extract(NEW.state_json, '$.automaticPauseMinutes'), 0) as integer))),
    max(0, cast((julianday(NEW.server_updated_at) - julianday(json_extract(NEW.state_json, '$.workStart'))) * 1440 as integer)),
    max(0, cast((julianday(NEW.server_updated_at) - julianday(json_extract(NEW.state_json, '$.workStart'))) * 1440 as integer) - max(max(0, cast(coalesce(json_extract(NEW.state_json, '$.pauseAccumulatedMs'), 0) / 60000 as integer)), max(0, cast(coalesce(json_extract(NEW.state_json, '$.automaticPauseMinutes'), 0) as integer)))),
    'completed',
    coalesce(json_extract(NEW.state_json, '$.workStartRevision'), NEW.revision - 1),
    NEW.revision,
    NEW.server_updated_at,
    NEW.server_updated_at
  );
END;

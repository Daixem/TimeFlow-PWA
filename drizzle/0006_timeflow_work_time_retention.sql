-- NOT APPLIED TO PRODUCTION.
-- Phase F retention controls. This migration only adds policy metadata and
-- database guards. It does not delete or anonymize existing rows.

CREATE TABLE timeflow_work_time_legal_holds (
  id TEXT PRIMARY KEY NOT NULL,
  subject_id TEXT NOT NULL,
  reason_code TEXT NOT NULL,
  created_by TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  CHECK (ends_at > starts_at)
);

CREATE INDEX idx_work_time_legal_holds_subject_period
  ON timeflow_work_time_legal_holds(subject_id, starts_at, ends_at);

CREATE TABLE timeflow_work_time_retention_runs (
  id TEXT PRIMARY KEY NOT NULL,
  rule_version TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  dry_run INTEGER NOT NULL CHECK (dry_run IN (0, 1)),
  eligible_count INTEGER NOT NULL DEFAULT 0 CHECK (eligible_count >= 0),
  deleted_count INTEGER NOT NULL DEFAULT 0 CHECK (deleted_count >= 0),
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  error_code TEXT
);

CREATE INDEX idx_work_time_retention_runs_started
  ON timeflow_work_time_retention_runs(started_at DESC);

DROP TRIGGER IF EXISTS work_time_journal_append_only_delete;

CREATE TRIGGER work_time_journal_append_only_delete
BEFORE DELETE ON timeflow_work_time_journal
WHEN NOT EXISTS (
  SELECT 1
  FROM timeflow_work_time_subjects AS subject
  WHERE subject.id = OLD.subject_id
    AND (
      (subject.scope_type = 'private'
        AND subject.delete_after IS NOT NULL
        AND julianday(subject.delete_after) <= julianday('now'))
      OR
      (subject.scope_type = 'organization'
        AND subject.employment_ended_at IS NOT NULL
        AND julianday(subject.employment_ended_at, '+24 months') <= julianday('now'))
    )
    AND NOT EXISTS (
      SELECT 1
      FROM timeflow_work_time_legal_holds AS hold
      WHERE hold.subject_id = subject.id
        AND julianday(hold.starts_at) <= julianday('now')
        AND julianday(hold.ends_at) > julianday('now')
    )
    AND NOT EXISTS (
      SELECT 1
      FROM timeflow_work_time_current AS current
      WHERE current.subject_id = subject.id
        AND coalesce(json_extract(current.state_json, '$.isWorking'), 0) = 1
    )
)
BEGIN
  SELECT RAISE(ABORT, 'work time journal is append-only');
END;

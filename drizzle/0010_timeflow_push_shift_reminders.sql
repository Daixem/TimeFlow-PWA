CREATE TABLE IF NOT EXISTS timeflow_push_schedule_state (
  user_id TEXT PRIMARY KEY NOT NULL,
  revision INTEGER NOT NULL,
  time_zone TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS timeflow_push_shifts (
  user_id TEXT NOT NULL,
  shift_key TEXT NOT NULL,
  shift_date TEXT NOT NULL,
  shift_start TEXT NOT NULL,
  shift_end TEXT NOT NULL,
  title TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  sync_revision INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, shift_key)
);

CREATE INDEX IF NOT EXISTS idx_timeflow_push_shifts_starts_at
  ON timeflow_push_shifts(starts_at, user_id);

CREATE TABLE IF NOT EXISTS timeflow_push_reminder_deliveries (
  user_id TEXT NOT NULL,
  shift_key TEXT NOT NULL,
  claimed_at TEXT NOT NULL,
  delivered_at TEXT,
  status TEXT NOT NULL,
  PRIMARY KEY (user_id, shift_key)
);

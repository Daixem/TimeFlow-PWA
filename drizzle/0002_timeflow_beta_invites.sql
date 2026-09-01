CREATE TABLE IF NOT EXISTS timeflow_beta_invites (
  id TEXT PRIMARY KEY NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  claimed_by TEXT,
  claimed_at TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
);
CREATE INDEX IF NOT EXISTS idx_timeflow_beta_invites_token_status ON timeflow_beta_invites(token_hash, status);
CREATE TABLE IF NOT EXISTS timeflow_beta_access (
  user_id TEXT PRIMARY KEY NOT NULL,
  invite_id TEXT,
  granted_at TEXT NOT NULL,
  revoked_at TEXT
);

-- Prepared for the future HourRise sign-in. Apply only when the complete
-- sign-in and recovery flow is ready to be released.
-- Existing TimeFlow identities and data are not altered by this migration.
CREATE TABLE IF NOT EXISTS hourrise_auth_accounts (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_hash TEXT NOT NULL,
  email_verified_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  disabled_at TEXT
);

CREATE TABLE IF NOT EXISTS hourrise_auth_sessions (
  token_hash TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES hourrise_auth_accounts(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_hourrise_auth_sessions_account
  ON hourrise_auth_sessions(account_id);

CREATE TABLE IF NOT EXISTS hourrise_auth_challenges (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES hourrise_auth_accounts(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK (purpose IN ('verify_email', 'reset_password')),
  verifier_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  consumption_nonce TEXT,
  revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_hourrise_auth_challenges_account_purpose
  ON hourrise_auth_challenges(account_id, purpose, created_at);

CREATE TABLE IF NOT EXISTS hourrise_auth_rate_limits (
  bucket_hash TEXT PRIMARY KEY NOT NULL,
  window_started_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0)
);

CREATE TABLE IF NOT EXISTS timeflow_team_chat_messages (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_timeflow_team_chat_messages_org_created
  ON timeflow_team_chat_messages(organization_id, created_at);

CREATE TABLE IF NOT EXISTS timeflow_team_chat_reads (
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  last_read_at TEXT NOT NULL,
  PRIMARY KEY (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS timeflow_push_preferences (
  user_id TEXT PRIMARY KEY NOT NULL,
  preferences_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

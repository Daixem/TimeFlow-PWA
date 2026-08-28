export const timeflowUserSyncSchema = `
CREATE TABLE IF NOT EXISTS timeflow_user_sync (
  user_id TEXT PRIMARY KEY NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_at TEXT NOT NULL
)
`;

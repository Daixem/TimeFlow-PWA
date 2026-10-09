CREATE TABLE IF NOT EXISTS timeflow_push_subscriptions (
  user_id TEXT NOT NULL,
  endpoint TEXT PRIMARY KEY NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_timeflow_push_subscriptions_user
  ON timeflow_push_subscriptions(user_id);

(function (root) {
  "use strict";

  const LEARNING_PREFIX = "timeflow-private-schedule-learning-v1:";
  const COLLEAGUE_PREFIX = "timeflow-private-colleague-schedule-v1:";
  const ALLOWED_KEYS = new Set([
    "timeflow-profile-v1", "timeflow-settings-v1", "timeflow-profile-preferences-v1",
    "timeflow-custom-background-v1", "timeflow-private-schedule-v1", "timeflow-private-account-v1",
    "timeflow-worktime-audit-v1", "timeflow-monthly-targets-v1", "timeflow-private-setup-v1",
    "timeflow-workday-v2", "timeflow-workday-history-v1", "timeflow-notifications-v1",
    "timeflow-notification-read-v1", "timeflow-quick-actions-v1"
  ]);
  const EXCLUDED_KEYS = new Set([
    "timeflow-session-v1", "timeflow-platform-session-cache-v1", "timeflow-sync-meta-v1",
    "timeflow-sync-base-v1", "timeflow-sync-conflict-v1", "timeflow-backup-restore-pending-v1",
    "timeflow-last-backup-v1"
  ]);

  function isAllowedKey(key, accountEmail = "") {
    if (EXCLUDED_KEYS.has(key)) return false;
    if (ALLOWED_KEYS.has(key)) return true;
    if (key.startsWith(COLLEAGUE_PREFIX)) {
      const suffix = key.slice(COLLEAGUE_PREFIX.length);
      return suffix === "local-private-user" || (Boolean(accountEmail) && suffix.toLowerCase() === String(accountEmail).trim().toLowerCase());
    }
    if (!key.startsWith(LEARNING_PREFIX)) return false;
    const suffix = key.slice(LEARNING_PREFIX.length);
    return suffix === "local-private-user" || (Boolean(accountEmail) && suffix.toLowerCase() === String(accountEmail).trim().toLowerCase());
  }

  function createPayload(storage, accountEmail = "") {
    const data = {};
    for (const key of storage.keys()) {
      if (!key?.startsWith("timeflow-") || !isAllowedKey(key, accountEmail)) continue;
      try { data[key] = JSON.parse(storage.getItem(key)); } catch { data[key] = storage.getItem(key); }
    }
    return { app: "TimeFlow PWA", version: "1.0.1", exportedAt: new Date().toISOString(), data };
  }

  function validatePayload(payload, accountEmail = "") {
    if (!payload || payload.app !== "TimeFlow PWA" || !payload.data || typeof payload.data !== "object" || Array.isArray(payload.data)) {
      throw new Error("Diese Datei ist keine gültige TimeFlow-Datensicherung.");
    }
    if (JSON.stringify(payload).length > 1_000_000) throw new Error("Die Datensicherung ist zu groß.");
    const data = {};
    for (const [key, value] of Object.entries(payload.data)) {
      if (!key.startsWith("timeflow-") || !isAllowedKey(key, accountEmail) || value === undefined || typeof value === "function") continue;
      data[key] = value;
    }
    if (!Object.keys(data).length || Object.keys(data).length > 100) throw new Error("Die Datensicherung enthält keine verwendbaren TimeFlow-Daten für dieses Konto.");
    return { data, exportedAt: payload.exportedAt || null };
  }

  root.TimeFlowBackupData = { createPayload, validatePayload, isAllowedKey };
})(globalThis);

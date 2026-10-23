import worker from "../dist/server/index.js";

async function run() {
const userId = "push-user";
const database = new PushD1();
const pending = [];
const ctx = { waitUntil(promise) { pending.push(promise); } };
const env = { DB: database, TIMEFLOW_VAPID_PUBLIC_KEY: "", TIMEFLOW_VAPID_PRIVATE_KEY: "", TIMEFLOW_VAPID_SUBJECT: "mailto:test@example.test", TIMEFLOW_PUSH_CRON_TOKEN: "test-cron-token" };
const originalFetch = globalThis.fetch;
let pushCount = 0;
let lastPushHeaders = null;
globalThis.fetch = async (endpoint, init = {}) => { if (String(endpoint).includes("version.json")) return Response.json({ commit: "a".repeat(40) }); pushCount += 1; lastPushHeaders = new Headers(init.headers); return new Response(null, { status: 201 }); };

try {
  const vapid = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const vapidPublic = new Uint8Array(await crypto.subtle.exportKey("raw", vapid.publicKey));
  const vapidPrivate = await crypto.subtle.exportKey("jwk", vapid.privateKey);
  env.TIMEFLOW_VAPID_PUBLIC_KEY = b64(vapidPublic);
  env.TIMEFLOW_VAPID_PRIVATE_KEY = vapidPrivate.d;
  const device = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const devicePublic = new Uint8Array(await crypto.subtle.exportKey("raw", device.publicKey));
  const auth = crypto.getRandomValues(new Uint8Array(16));
  database.subscriptions.set(userId, [{ endpoint: "https://fcm.googleapis.com/fcm/send/test", p256dh: b64(devicePublic), auth: b64(auth) }]);

  const now = Date.now();
  await expect(await request("/api/internal/push-reminders", { method: "POST" }), 401);
  const first = shiftAt(now + 25 * 60 * 1000);
  const emptyDay = { date: first.date, start: "00:00", end: "00:00", title: "Frei" };
  const firstSave = await putSnapshot(0, [first, emptyDay], "UTC");
  if (firstSave.revision !== 1) throw new Error("Initial schedule was not saved.");
  await flush();
  if (database.scheduleState.get(userId)?.time_zone !== "UTC") throw new Error("The initial timezone fixture was not saved.");
  if (pushCount) throw new Error("First-time schedule setup unexpectedly sent an update push.");

  const missingZoneUser = "push-user-no-timezone";
  await requestSync("PUT", { expectedRevision: 0, snapshot: { "timeflow-private-schedule-v1": [shiftAt(now + 24 * 60 * 60 * 1000)] } }, undefined, missingZoneUser);
  if (database.scheduleState.has(missingZoneUser) || [...database.shifts.values()].some((shift) => shift.user_id === missingZoneUser)) throw new Error("A schedule without a known timezone was silently scheduled as UTC.");
  await requestSync("GET", undefined, "Europe/Berlin", missingZoneUser);
  await flush();
  if (database.scheduleState.get(missingZoneUser)?.time_zone !== "Europe/Berlin") throw new Error("A missing timezone was not repaired once a valid device timezone arrived.");

  await requestSync("GET", undefined, "Europe/Berlin");
  await flush();
  if (database.scheduleState.get(userId)?.time_zone !== "Europe/Berlin") throw new Error("A timezone change on read did not repair the saved schedule timezone.");
  const corrected = database.shifts.get(userId + ":" + first.date + "_" + first.start);
  const expectedStart = Date.parse(first.date + "T" + first.start + ":00+02:00");
  if (Date.parse(corrected?.starts_at) !== expectedStart) throw new Error("The existing schedule was not recalculated using the corrected timezone.");
  if (database.shifts.has(userId + ":" + emptyDay.date + "_00:00")) throw new Error("An empty 00:00–00:00 day was treated as a shift.");
  await flush();
  if (pushCount) throw new Error("Correcting a timezone unexpectedly sent a schedule-change push.");

  await runSchedule();
  if (pushCount !== 1) throw new Error("The 30-minute shift reminder was not sent.");
  if (lastPushHeaders?.get("ttl") !== "600" || lastPushHeaders?.get("urgency") !== "high") throw new Error("Shift reminders must have high urgency and expire after ten minutes.");
  await runSchedule();
  if (pushCount !== 1) throw new Error("The same shift reminder was sent more than once.");

  const changed = shiftAt(now + 20 * 60 * 1000);
  const changedSave = await putSnapshot(1, [changed]);
  if (changedSave.revision !== 2) throw new Error("Updated schedule was not saved.");
  await flush();
  if (pushCount !== 2) throw new Error("A schedule change did not send its own push.");
  await runSchedule();
  if (pushCount !== 3) throw new Error("The changed shift did not receive a new reminder.");
  await runSchedule();
  if (pushCount !== 3) throw new Error("The changed shift reminder was duplicated.");

  await expect(await request("/api/notifications/push-preferences", {
    method: "PUT", headers: { Origin: "https://timeflow.test", "Content-Type": "application/json" },
    body: JSON.stringify({ preferences: { deviceNotifications: true, shiftReminders: true, scheduleUpdates: false } })
  }), 200);
  const laterChange = shiftAt(now + 40 * 60 * 1000);
  await putSnapshot(2, [laterChange]);
  await flush();
  if (pushCount !== 3) throw new Error("Disabling schedule-change notifications did not stop them.");
  console.log("Push schedule: time-zone conversion, single reminders, schedule-change pushes and settings passed.");
} finally {
  globalThis.fetch = originalFetch;
}

function b64(bytes) { return Buffer.from(bytes).toString("base64url"); }
function shiftAt(timestamp) {
  const date = new Date(timestamp);
  const end = new Date(timestamp + 8 * 60 * 60 * 1000);
  return { date: date.toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" }), start: date.toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }), end: end.toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }), title: "Frühschicht" };
}
async function flush() { while (pending.length) await Promise.all(pending.splice(0)); }
async function runSchedule() { await expect(await request("/api/internal/push-reminders", { method: "POST", headers: { Authorization: "Bearer " + env.TIMEFLOW_PUSH_CRON_TOKEN } }), 200); await flush(); }
async function putSnapshot(expectedRevision, schedule, timeZone = "Europe/Berlin") {
  return requestSync("PUT", { expectedRevision, snapshot: { "timeflow-private-schedule-v1": schedule } }, timeZone);
}
async function requestSync(method, body, timeZone, requestUserId = userId) {
  return expect(await request("/api/sync", {
    method, headers: { Origin: "https://timeflow.test", "Content-Type": "application/json", ...(timeZone ? { "X-TimeFlow-Time-Zone": timeZone } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  }, requestUserId), 200);
}
function request(path, options = {}, requestUserId = userId) {
  return worker.fetch(new Request("https://timeflow.test" + path, { ...options, headers: { "oai-authenticated-user-id": requestUserId, "oai-authenticated-user-email": requestUserId + "@example.test", ...(options.headers || {}) } }), env, ctx);
}
async function expect(response, status) {
  if (response.status !== status) throw new Error("Expected HTTP " + status + ", got " + response.status + ": " + await response.text());
  return response.json();
}
}

class PushD1 {
  constructor() { this.sync = new Map(); this.scheduleState = new Map(); this.shifts = new Map(); this.deliveries = new Map(); this.subscriptions = new Map(); this.preferences = new Map(); }
  prepare(sql) {
    const database = this;
    return { run() { return database.run(sql, []); }, bind(...values) { return {
      first() { return database.first(sql, values); }, all() { return database.all(sql, values); }, run() { return database.run(sql, values); }
    }; } };
  }
  async batch(statements) { const results = []; for (const statement of statements) results.push(await statement.run()); return results; }
  first(sql, values) {
    if (sql.includes("FROM timeflow_beta_access")) return { user_id: values[0] };
    if (sql.includes("FROM timeflow_user_sync")) {
      const row = this.sync.get(values[0]);
      if (!row || (values.length > 1 && row.revision !== values[1])) return null;
      return { ...row };
    }
    if (sql.includes("FROM timeflow_push_schedule_state")) return this.scheduleState.has(values[0]) ? { ...this.scheduleState.get(values[0]) } : null;
    if (sql.includes("FROM timeflow_push_preferences")) return this.preferences.has(values[0]) ? { preferences_json: this.preferences.get(values[0]) } : null;
    return null;
  }
  all(sql, values) {
    if (sql.includes("FROM timeflow_push_shifts WHERE user_id")) return { results: [...this.shifts.values()].filter((shift) => shift.user_id === values[0]).map((shift) => ({ ...shift })) };
    if (sql.includes("FROM timeflow_push_shifts AS shift")) {
      const [from, to] = values;
      return { results: [...this.shifts.values()].filter((shift) => shift.starts_at >= from && shift.starts_at <= to && this.deliveries.get(shift.user_id + ":" + shift.shift_key)?.status !== "sent").map((shift) => ({ user_id: shift.user_id, shift_key: shift.shift_key, shift_date: shift.shift_date, shift_start: shift.shift_start, title: shift.title, starts_at: shift.starts_at, time_zone: this.scheduleState.get(shift.user_id)?.time_zone })) };
    }
    if (sql.includes("FROM timeflow_push_subscriptions")) return { results: (this.subscriptions.get(values[0]) || []).map((subscription) => ({ ...subscription })) };
    return { results: [] };
  }
  run(sql, values) {
    if (sql.startsWith("CREATE ")) return { meta: { changes: 0 } };
    if (sql.includes("INSERT INTO timeflow_user_sync")) {
      if (this.sync.has(values[0])) return { meta: { changes: 0 } };
      this.sync.set(values[0], { payload_json: values[1], revision: 1, updated_at: values[2] });
      return { meta: { changes: 1 } };
    }
    if (sql.includes("UPDATE timeflow_user_sync SET")) {
      const row = this.sync.get(values[2]);
      if (!row || row.revision !== values[3]) return { meta: { changes: 0 } };
      this.sync.set(values[2], { payload_json: values[0], revision: row.revision + 1, updated_at: values[1] });
      return { meta: { changes: 1 } };
    }
    if (sql.includes("INSERT INTO timeflow_push_schedule_state")) {
      const [userId, revision, timeZone, updatedAt] = values;
      const prior = this.scheduleState.get(userId);
      if (prior && (prior.revision > revision || (prior.revision === revision && prior.time_zone === timeZone))) return { meta: { changes: 0 } };
      this.scheduleState.set(userId, { revision, time_zone: timeZone, updated_at: updatedAt });
      return { meta: { changes: 1 } };
    }
    if (sql.includes("INSERT INTO timeflow_push_shifts")) {
      const [userId, shiftKey, date, start, end, title, startsAt, revision, updatedAt, checkUser, checkRevision] = values;
      if (this.scheduleState.get(checkUser)?.revision !== checkRevision) return { meta: { changes: 0 } };
      const key = userId + ":" + shiftKey; const prior = this.shifts.get(key);
      if (prior && (prior.sync_revision > revision || (prior.sync_revision === revision && prior.starts_at === startsAt))) return { meta: { changes: 0 } };
      this.shifts.set(key, { user_id: userId, shift_key: shiftKey, shift_date: date, shift_start: start, shift_end: end, title, starts_at: startsAt, sync_revision: revision, updated_at: updatedAt });
      return { meta: { changes: 1 } };
    }
    if (sql.includes("DELETE FROM timeflow_push_shifts WHERE user_id")) {
      const [userId, revision, checkUser, checkRevision] = values;
      if (this.scheduleState.get(checkUser)?.revision !== checkRevision) return { meta: { changes: 0 } };
      let changes = 0;
      for (const [key, shift] of this.shifts) if (shift.user_id === userId && shift.sync_revision < revision) { this.shifts.delete(key); changes += 1; }
      return { meta: { changes } };
    }
    if (sql.includes("INSERT OR IGNORE INTO timeflow_push_reminder_deliveries")) {
      const [userId, shiftKey, claimedAt] = values; const key = userId + ":" + shiftKey;
      if (this.deliveries.has(key)) return { meta: { changes: 0 } };
      this.deliveries.set(key, { status: "sending", claimed_at: claimedAt, delivered_at: null });
      return { meta: { changes: 1 } };
    }
    if (sql.includes("UPDATE timeflow_push_reminder_deliveries")) {
      const [deliveredAt, userId, shiftKey] = values; const row = this.deliveries.get(userId + ":" + shiftKey);
      if (!row || row.status !== "sending") return { meta: { changes: 0 } };
      this.deliveries.set(userId + ":" + shiftKey, { ...row, status: "sent", delivered_at: deliveredAt });
      return { meta: { changes: 1 } };
    }
    if (sql.includes("DELETE FROM timeflow_push_reminder_deliveries WHERE user_id")) {
      return { meta: { changes: this.deliveries.delete(values[0] + ":" + values[1]) ? 1 : 0 } };
    }
    if (sql.includes("INSERT INTO timeflow_push_preferences")) { this.preferences.set(values[0], values[1]); return { meta: { changes: 1 } }; }
    if (sql.includes("DELETE FROM timeflow_push_subscriptions")) return { meta: { changes: 0 } };
    if (sql.startsWith("DELETE FROM timeflow_push_reminder_deliveries WHERE status")) return { meta: { changes: 0 } };
    return { meta: { changes: 0 } };
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });

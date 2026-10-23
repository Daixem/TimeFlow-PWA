import worker from "../dist/server/index.js";

class ReleaseD1 {
  constructor() { this.release = null; this.subscriptions = new Map(); this.preferences = new Map(); }
  prepare(sql) {
    const database = this;
    return { run() { return database.run(sql, []); }, bind(...values) { return {
      first() { return database.first(sql, values); },
      all() { return database.all(sql, values); },
      run() { return database.run(sql, values); }
    }; } };
  }
  first(sql, values) {
    if (sql.includes("FROM timeflow_push_release_state")) return this.release ? { ...this.release } : null;
    if (sql.includes("FROM timeflow_push_preferences")) return this.preferences.has(values[0]) ? { preferences_json: this.preferences.get(values[0]) } : null;
    return null;
  }
  all(sql, values) {
    if (sql.includes("SELECT DISTINCT user_id FROM timeflow_push_subscriptions")) return { results: [...this.subscriptions.keys()].map((user_id) => ({ user_id })) };
    if (sql.includes("FROM timeflow_push_subscriptions WHERE user_id")) return { results: (this.subscriptions.get(values[0]) || []).map((item) => ({ endpoint: item.endpoint, p256dh: item.p256dh, auth: item.auth })) };
    if (sql.includes("FROM timeflow_push_shifts AS shift")) return { results: [] };
    return { results: [] };
  }
  run(sql, values) {
    if (sql.startsWith("CREATE ")) return { meta: { changes: 0 } };
    if (sql.includes("INSERT OR IGNORE INTO timeflow_push_release_state")) {
      if (this.release) return { meta: { changes: 0 } };
      this.release = { source: values[0], version: values[1], pending_version: null, pending_claimed_at: null, updated_at: values[2] };
      return { meta: { changes: 1 } };
    }
    if (sql.includes("UPDATE timeflow_push_release_state SET pending_version = ?")) {
      const [version, claimedAt, updatedAt, source, expectedVersion, staleClaim] = values;
      if (!this.release || this.release.source !== source || this.release.version !== expectedVersion) return { meta: { changes: 0 } };
      if (this.release.pending_version !== null && this.release.pending_claimed_at >= staleClaim) return { meta: { changes: 0 } };
      this.release = { ...this.release, pending_version: version, pending_claimed_at: claimedAt, updated_at: updatedAt };
      return { meta: { changes: 1 } };
    }
    if (sql.includes("UPDATE timeflow_push_release_state SET version = ?")) {
      const [version, updatedAt, source, pendingVersion] = values;
      if (!this.release || this.release.source !== source || this.release.pending_version !== pendingVersion) return { meta: { changes: 0 } };
      this.release = { ...this.release, version, pending_version: null, pending_claimed_at: null, updated_at: updatedAt };
      return { meta: { changes: 1 } };
    }
    if (sql.includes("UPDATE timeflow_push_release_state SET pending_version = NULL")) {
      const [updatedAt, source, pendingVersion] = values;
      if (!this.release || this.release.source !== source || this.release.pending_version !== pendingVersion) return { meta: { changes: 0 } };
      this.release = { ...this.release, pending_version: null, pending_claimed_at: null, updated_at: updatedAt };
      return { meta: { changes: 1 } };
    }
    return { meta: { changes: 0 } };
  }
}

const database = new ReleaseD1();
const env = {
  DB: database,
  TIMEFLOW_PUSH_CRON_TOKEN: "release-test-token",
  TIMEFLOW_VAPID_SUBJECT: "mailto:timeflow@example.test"
};
let currentCommit = "a".repeat(40);
let pushCount = 0;
let lastPushHeaders;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init = {}) => {
  const url = String(input);
  if (url.includes("version.json")) return Response.json({ commit: currentCommit });
  pushCount += 1;
  lastPushHeaders = new Headers(init.headers);
  return new Response(null, { status: 201 });
};

try {
  const vapid = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  env.TIMEFLOW_VAPID_PUBLIC_KEY = b64(new Uint8Array(await crypto.subtle.exportKey("raw", vapid.publicKey)));
  env.TIMEFLOW_VAPID_PRIVATE_KEY = (await crypto.subtle.exportKey("jwk", vapid.privateKey)).d;
  const device = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  database.subscriptions.set("user-1", [{ endpoint: "https://fcm.googleapis.com/fcm/send/update-test", p256dh: b64(new Uint8Array(await crypto.subtle.exportKey("raw", device.publicKey))), auth: b64(crypto.getRandomValues(new Uint8Array(16))) }]);

  const unauthorized = await call(false);
  if (unauthorized.status !== 401) throw new Error("The release check endpoint must reject unauthenticated callers.");
  await call();
  if (pushCount !== 0 || database.release?.version !== currentCommit) throw new Error("The first check must save a baseline without sending a false update alert.");

  currentCommit = "b".repeat(40);
  await call();
  if (pushCount !== 1 || database.release?.version !== currentCommit) throw new Error("A new published main commit did not send one update alert and advance the saved version.");
  if (lastPushHeaders?.get("ttl") !== "86400") throw new Error("An update notice must remain available while the app is closed.");
  await call();
  if (pushCount !== 1) throw new Error("The same published version sent a duplicate update alert.");

  database.preferences.set("user-1", JSON.stringify({ systemAlerts: false }));
  currentCommit = "c".repeat(40);
  await call();
  if (pushCount !== 1 || database.release?.version !== currentCommit) throw new Error("Disabled system notices must not send update alerts.");

  database.preferences.set("user-1", JSON.stringify({ systemAlerts: true }));
  currentCommit = "d".repeat(40);
  await call();
  if (pushCount !== 2) throw new Error("A later enabled release did not send its update alert.");
  console.log("Release push: initial baseline, new releases, duplicate prevention and user preferences passed.");
} finally {
  globalThis.fetch = originalFetch;
}

async function call(authenticated = true) {
  const response = await worker.fetch(new Request("https://timeflow.test/api/internal/push-reminders", {
    method: "POST",
    headers: authenticated ? { Authorization: "Bearer " + env.TIMEFLOW_PUSH_CRON_TOKEN } : {}
  }), env, {});
  if (authenticated && response.status !== 200) throw new Error("Release scheduler failed: " + response.status + " " + await response.text());
  return response;
}

function b64(bytes) { return Buffer.from(bytes).toString("base64url"); }

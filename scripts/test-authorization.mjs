import worker from "../dist/server/index.js";

const bindings = [];
const normalUserId = "test-normal-user";
const adminUserId = "test-admin-user";

function resultFor(sql, values) {
  if (sql.includes("FROM timeflow_beta_access")) {
    return { first: async () => values[0] === normalUserId ? { user_id: normalUserId } : null };
  }
  if (sql.includes("SELECT payload_json, revision, updated_at FROM timeflow_user_sync")) {
    return { first: async () => ({ payload_json: "{}", revision: 1, updated_at: "2026-01-01T00:00:00.000Z" }) };
  }
  if (sql.includes("SELECT revision, updated_at FROM timeflow_user_sync")) {
    return { first: async () => ({ revision: 2, updated_at: "2026-01-01T00:00:00.000Z" }) };
  }
  if (sql.includes("SELECT \* FROM timeflow_support_tickets WHERE id = ?")) {
    return { first: async () => ({ id: values[0], user_id: normalUserId, screenshot_data: null }) };
  }
  if (sql.includes("SELECT id FROM timeflow_support_tickets WHERE user_id")) return { all: async () => ({ results: [] }) };
  return { first: async () => null, all: async () => ({ results: [] }), run: async () => ({ meta: { changes: 1 } }) };
}

const database = {
  prepare(sql) {
    const statement = {
      bind(...values) {
        bindings.push({ sql, values });
        return resultFor(sql, values);
      },
      first: async () => null,
      all: async () => ({ results: [] }),
      run: async () => ({ meta: { changes: 1 }})
    };
    return statement;
  }
};

const fingerprint = async (value) => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((entry) => entry.toString(16).padStart(2, "0")).join("");
};
const adminFingerprint = await fingerprint(adminUserId);
const env = { DB: database, TIMEFLOW_BETA_ADMIN_USER_FINGERPRINT: adminFingerprint };
const headersFor = (id, email = `${id}@example.test`) => ({
  "oai-authenticated-user-id": id,
  "oai-authenticated-user-email": email
});
const call = async (path, options = {}) => worker.fetch(new Request(`https://timeflow.test${path}`, options), env);
const expectStatus = async (path, expected, options) => {
  const response = await call(path, options);
  if (response.status !== expected) throw new Error(`${path}: expected ${expected}, got ${response.status}`);
  return response;
};

for (const path of ["/api/sync", "/api/team-access", "/api/beta/invites", "/api/support", "/api/account-data"]) {
  await expectStatus(path, 401);
}
await expectStatus("/api/beta/identity-fingerprint", 401);

const normalHeaders = headersFor(normalUserId);
const normalFingerprintResponse = await expectStatus("/api/beta/identity-fingerprint", 200, { headers: normalHeaders });
const normalFingerprint = (await normalFingerprintResponse.json()).fingerprint;
if (normalFingerprint !== await fingerprint(normalUserId) || normalFingerprint === adminFingerprint) throw new Error("Der eigene Identitätsfingerprint muss deterministisch sein und darf keinen Adminzugriff erzeugen.");
await expectStatus("/api/beta/invites", 403, { headers: normalHeaders });
await expectStatus("/api/team-access", 403, { headers: normalHeaders });
await expectStatus("/api/sync", 200, { headers: normalHeaders });
await expectStatus("/api/support?admin=1", 200, { headers: normalHeaders });
await expectStatus("/api/support", 403, {
  method: "POST",
  headers: { ...normalHeaders, Origin: "https://timeflow.test", "Content-Type": "application/json" },
  body: JSON.stringify({ action: "status", ticketId: "ticket-own", status: "resolved" })
});

bindings.length = 0;
await expectStatus("/api/sync", 200, {
  method: "PUT",
  headers: { ...normalHeaders, Origin: "https://timeflow.test", "Content-Type": "application/json" },
  body: JSON.stringify({ userId: adminUserId, role: "admin", expectedRevision: 0, snapshot: { "timeflow-profile-v1": { name: "Test" } } })
});
const syncWrite = bindings.find(({ sql }) => sql.includes("INSERT INTO timeflow_user_sync"));
if (!syncWrite || syncWrite.values[0] !== normalUserId || syncWrite.values.includes(adminUserId)) {
  throw new Error("Sync darf weder userId noch role aus dem Request als Autorisierung verwenden.");
}

const adminHeaders = headersFor(adminUserId);
await expectStatus("/api/beta/invites", 200, { headers: adminHeaders });
await expectStatus("/api/team-access", 200, { headers: adminHeaders });
await expectStatus("/api/support?admin=1", 200, { headers: adminHeaders });

const clientFingerprintHeaders = { ...normalHeaders, "x-timeflow-admin-fingerprint": adminFingerprint };
await expectStatus("/api/beta/invites", 403, { headers: clientFingerprintHeaders });
await expectStatus("/api/team-access", 403, { headers: clientFingerprintHeaders });
const missingFingerprintEnv = { DB: database };
const missingFingerprintResponse = await worker.fetch(new Request("https://timeflow.test/api/beta/invites", { headers: adminHeaders }), missingFingerprintEnv);
if (missingFingerprintResponse.status !== 403) throw new Error("Ohne Admin-Fingerprint muss der sichere Default 403 sein.");

console.log("Autorisierung: 401, 403, Adminzugriff und Sync-Identitätsbindung mit isolierter D1-Attrappe geprüft.");

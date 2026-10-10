import worker from "../dist/server/index.js";

const now = "2026-10-10T10:00:00.000Z";
const teams = new Map([
  ["owner-a", { organization_id: "org-a", role: "admin", name: "Team A" }],
  ["member-a", { organization_id: "org-a", role: "member", name: "Team A" }],
  ["member-b", { organization_id: "org-b", role: "member", name: "Team B" }]
]);

class ChatD1 {
  constructor() { this.messages = []; this.reads = new Map(); this.preferences = new Map(); }
  prepare(sql) {
    const db = this;
    return { run() { return { meta: { changes: 0 } }; }, bind(...values) { return {
      async first() { return db.first(sql, values); },
      async all() { return db.all(sql, values); },
      async run() { return db.run(sql, values); }
    }; } };
  }
  first(sql, values) {
    if (sql.includes("FROM timeflow_beta_access")) return ["owner-a", "member-a", "member-b", "no-team"].includes(values[0]) ? { user_id: values[0] } : null;
    if (sql.includes("FROM timeflow_organization_members m JOIN timeflow_organizations")) return teams.get(values[0]) || null;
    if (sql.includes("FROM timeflow_team_chat_reads")) return this.reads.get(`${values[0]}:${values[1]}`) || null;
    if (sql.includes("FROM timeflow_push_preferences")) return this.preferences.has(values[0]) ? { preferences_json: this.preferences.get(values[0]) } : null;
    return null;
  }
  all(sql, values) {
    if (sql.includes("FROM timeflow_team_chat_messages")) return { results: this.messages.filter((item) => item.organization_id === values[0]).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 100).map((item) => ({ ...item })) };
    return { results: [] };
  }
  run(sql, values) {
    if (sql.includes("INSERT INTO timeflow_team_chat_messages")) {
      const [id, organization_id, sender_id, sender_name, message, created_at] = values;
      this.messages.push({ id, organization_id, sender_id, sender_name, message, created_at });
      return { meta: { changes: 1 } };
    }
    if (sql.includes("INSERT INTO timeflow_team_chat_reads")) {
      this.reads.set(`${values[0]}:${values[1]}`, { last_read_at: values[2] });
      return { meta: { changes: 1 } };
    }
    if (sql.includes("INSERT INTO timeflow_push_preferences")) {
      this.preferences.set(values[0], values[1]);
      return { meta: { changes: 1 } };
    }
    return { meta: { changes: 0 } };
  }
}

const database = new ChatD1();
const env = { DB: database };
const pendingBackground = [];
const ctx = { waitUntil(promise) { pendingBackground.push(promise); } };
const headersFor = (userId, extra = {}) => ({ "oai-authenticated-user-id": userId, "oai-authenticated-user-email": `${userId}@example.test`, ...extra });
const request = (path, userId, options = {}) => worker.fetch(new Request(`https://timeflow.test${path}`, { ...options, headers: headersFor(userId, options.headers || {}) }), env, ctx);
const expect = async (response, status, expectedError) => {
  if (response.status !== status) throw new Error(`Expected ${status}, received ${response.status}: ${await response.text()}`);
  const body = await response.json();
  if (expectedError && body.error !== expectedError) throw new Error(`Expected error ${expectedError}, got ${body.error}`);
  return body;
};

await expect(await worker.fetch(new Request("https://timeflow.test/api/team-chat"), env), 401, "authentication_required");
await expect(await request("/api/team-chat", "no-team"), 403, "team_membership_required");
await expect(await request("/api/team-chat", "member-a", { method: "POST", headers: { Origin: "https://attacker.test", "Content-Type": "application/json" }, body: JSON.stringify({ message: "Not allowed" }) }), 403, "origin_not_allowed");
await expect(await request("/api/team-chat", "member-a", { method: "POST", headers: { Origin: "https://timeflow.test", "Content-Type": "application/json" }, body: JSON.stringify({ message: "   " }) }), 400, "message_length_invalid");
await expect(await request("/api/team-chat", "member-a", { method: "POST", headers: { Origin: "https://timeflow.test", "Content-Type": "application/json" }, body: JSON.stringify({ message: "x".repeat(1001) }) }), 400, "message_length_invalid");

const sent = await expect(await request("/api/team-chat", "owner-a", { method: "POST", headers: { Origin: "https://timeflow.test", "Content-Type": "application/json" }, body: JSON.stringify({ message: "Gemeinsame Nachricht" }) }), 201);
if (sent.message.message !== "Gemeinsame Nachricht" || sent.message.sender_id !== "owner-a") throw new Error("Chat message was not stored with its authenticated sender.");
const peerData = await expect(await request("/api/team-chat", "member-a"), 200);
if (peerData.team.id !== "org-a" || peerData.messages.length !== 1 || peerData.messages[0].message !== "Gemeinsame Nachricht" || peerData.unread !== 1) throw new Error("A team member could not read the shared message.");
const otherTeam = await expect(await request("/api/team-chat", "member-b"), 200);
if (otherTeam.team.id !== "org-b" || otherTeam.messages.length !== 0) throw new Error("Messages leaked across organizations.");
await expect(await request("/api/team-chat", "member-a", { method: "PUT", headers: { Origin: "https://timeflow.test" } }), 200);
const readBack = await expect(await request("/api/team-chat", "member-a"), 200);
if (readBack.unread !== 0) throw new Error("Read receipt did not clear the unread count.");

const savedPreferences = await expect(await request("/api/notifications/push-preferences", "member-a", { method: "PUT", headers: { Origin: "https://timeflow.test", "Content-Type": "application/json" }, body: JSON.stringify({ preferences: { deviceNotifications: true, chatAlerts: false, unexpected: true } }) }), 200);
if (!savedPreferences.saved || savedPreferences.preferences.chatAlerts !== false || "unexpected" in savedPreferences.preferences) throw new Error("Push preferences were not safely normalized.");
const loadedPreferences = await expect(await request("/api/notifications/push-preferences", "member-a"), 200);
if (loadedPreferences.preferences.chatAlerts !== false) throw new Error("Push preferences did not persist.");

await expect(await request("/api/notifications/push-subscription", "member-a", { method: "POST", headers: { Origin: "https://timeflow.test", "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: "https://example.test/attacker", keys: { p256dh: "x", auth: "y" } }) }), 400, "valid_endpoint_required");
await Promise.all(pendingBackground);
console.log("Team chat API: auth, team isolation, message validation, read markers and push preferences passed.");

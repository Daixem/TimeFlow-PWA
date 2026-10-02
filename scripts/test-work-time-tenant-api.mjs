import worker from "../dist/server/index.js";

const userA = "tenant-user-a";
const userB = "tenant-user-b";
const admin = "tenant-admin";
const orgA = "org-a";
const orgB = "org-b";

class TenantD1 {
  constructor() {
    this.subjects = new Map();
    this.current = new Map();
    this.journal = [];
    this.sessions = [];
    this.memberships = new Map([
      [`${orgA}:${userA}`, { organization_id: orgA, user_id: userA, role: "member", joined_at: "2026-01-01T00:00:00.000Z" }],
      [`${orgA}:${userB}`, { organization_id: orgA, user_id: userB, role: "member", joined_at: "2026-01-02T00:00:00.000Z" }],
      [`${orgA}:${admin}`, { organization_id: orgA, user_id: admin, role: "admin", joined_at: "2026-01-01T00:00:00.000Z" }]
    ]);
  }

  prepare(sql) {
    const database = this;
    const bound = (values) => ({
      sql,
      values,
      async first() { return database.first(sql, values); },
      async all() { return database.all(sql, values); },
      async run() { return database.run(sql, values); }
    });
    return {
      bind(...values) { return bound(values); },
      async first() { return database.first(sql, []); },
      async all() { return database.all(sql, []); },
      async run() { return database.run(sql, []); }
    };
  }

  first(sql, values) {
    if (sql.includes("FROM sqlite_master") && sql.includes("timeflow_work_time_subjects")) return { name: "timeflow_work_time_subjects" };
    if (sql.includes("FROM timeflow_beta_access")) return [userA, userB].includes(values[0]) ? { user_id: values[0] } : null;
    if (sql.includes("FROM timeflow_organization_members")) return this.memberships.get(`${values[1]}:${values[0]}`) || null;
    if (sql.includes("FROM timeflow_work_time_subjects")) {
      const matches = [...this.subjects.values()].filter((subject) => subject.user_id === values[0]);
      if (sql.includes("scope_type = 'organization'")) return matches.find((subject) => subject.organization_id === values[1] && subject.scope_type === "organization" && !subject.employment_ended_at) || null;
      return matches.find((subject) => subject.scope_type === "private") || null;
    }
    if (sql.includes("FROM timeflow_work_time_current") && sql.includes("subject_id = ?")) return this.current.get(values[0]) || null;
    return null;
  }

  all(sql, values) {
    if (sql.includes("FROM timeflow_work_time_journal")) return { results: this.journal.filter((row) => row.subject_id === values[0]).sort((a, b) => b.revision - a.revision) };
    if (sql.includes("FROM timeflow_work_time_sessions")) {
      const prefix = values[1] ? String(values[1]).replace("%", "") : null;
      return { results: this.sessions.filter((row) => row.subject_id === values[0] && (!prefix || row.work_date.startsWith(prefix))) };
    }
    return { results: [] };
  }

  run(sql, values) {
    if (sql.includes("INSERT INTO timeflow_work_time_subjects")) {
      const [id, userId, scopeType, organizationId, employmentStartedAt, createdAt, updatedAt] = values;
      const existing = [...this.subjects.values()].find((subject) => subject.user_id === userId
        && subject.scope_type === scopeType
        && (scopeType === "private" || (subject.organization_id === organizationId && !subject.employment_ended_at)));
      if (existing) return { meta: { changes: 0 } };
      this.subjects.set(id, { id, user_id: userId, scope_type: scopeType, organization_id: organizationId, employment_started_at: employmentStartedAt, employment_ended_at: null, created_at: createdAt, updated_at: updatedAt });
      return { meta: { changes: 1 } };
    }
    return { meta: { changes: 0 } };
  }

  async batch(statements) {
    const results = [];
    for (const { sql, values } of statements) {
      if (sql.includes("INSERT INTO timeflow_work_time_current")) {
        const [subjectId, userId, scopeType, organizationId, stateJson, actorUserId, eventType, source, effectiveTimestamp, updatedAt, createdAt] = values;
        if (this.current.has(subjectId)) { results.push({ meta: { changes: 0 } }); continue; }
        const subject = this.subjects.get(subjectId);
        if (!subject || subject.user_id !== userId || subject.scope_type !== scopeType || subject.organization_id !== organizationId) throw new Error("subject mismatch");
        const row = { subject_id: subjectId, user_id: userId, scope_type: scopeType, organization_id: organizationId, state_json: stateJson, revision: 1, last_actor_user_id: actorUserId, last_event_type: eventType, last_source: source, effective_timestamp: effectiveTimestamp, server_updated_at: updatedAt, created_at: createdAt };
        this.current.set(subjectId, row);
        this.journal.push({ id: `journal-${subjectId}-1`, subject_id: subjectId, user_id: userId, organization_id: organizationId, actor_user_id: actorUserId, event_type: eventType, source, revision: 1, effective_timestamp: effectiveTimestamp, server_timestamp: updatedAt, previous_state_json: null, new_state_json: stateJson });
        results.push({ meta: { changes: 1 } });
        continue;
      }
      if (sql.includes("UPDATE timeflow_work_time_current")) {
        const [stateJson, actorUserId, eventType, source, effectiveTimestamp, updatedAt, subjectId, expectedRevision] = values;
        const old = this.current.get(subjectId);
        if (!old || old.revision !== expectedRevision) { results.push({ meta: { changes: 0 } }); continue; }
        const row = { ...old, state_json: stateJson, revision: old.revision + 1, last_actor_user_id: actorUserId, last_event_type: eventType, last_source: source, effective_timestamp: effectiveTimestamp, server_updated_at: updatedAt };
        this.current.set(subjectId, row);
        this.journal.push({ id: `journal-${subjectId}-${row.revision}`, subject_id: subjectId, user_id: row.user_id, organization_id: row.organization_id, actor_user_id: actorUserId, event_type: eventType, source, revision: row.revision, effective_timestamp: effectiveTimestamp, server_timestamp: updatedAt, previous_state_json: old.state_json, new_state_json: stateJson });
        if (eventType === "CLOCK_OUT") {
          const state = JSON.parse(stateJson);
          const gross = Math.max(0, Math.floor((Date.parse(updatedAt) - Date.parse(state.workStart)) / 60000));
          const pause = Math.max(0, Math.floor(Number(state.pauseAccumulatedMs || 0) / 60000));
          this.sessions.push({ id: `session-${subjectId}-${row.revision}`, subject_id: subjectId, user_id: row.user_id, organization_id: row.organization_id, work_date: state.workStart.slice(0, 10), clock_in: state.workStart, clock_out: updatedAt, pause_minutes: pause, gross_minutes: gross, net_minutes: Math.max(0, gross - pause), status: "completed", start_revision: state.workStartRevision, end_revision: row.revision, created_at: updatedAt, updated_at: updatedAt });
        }
        results.push({ meta: { changes: 1 } });
      }
    }
    return results;
  }
}

const fingerprint = async (value) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((entry) => entry.toString(16).padStart(2, "0")).join("");
};

const database = new TenantD1();
const env = { DB: database, TIMEFLOW_BETA_ADMIN_USER_FINGERPRINT: await fingerprint(admin), TIMEFLOW_WORK_TIME_SERVER_ENABLED: "true" };
const headers = (userId, organizationId) => ({
  "oai-authenticated-user-id": userId,
  "oai-authenticated-user-email": `${userId}@example.test`,
  ...(organizationId ? { "X-TimeFlow-Organization-Id": organizationId } : {})
});
const call = (path, userId, options = {}, organizationId = null) => worker.fetch(new Request(`https://timeflow.test${path}`, { ...options, headers: { ...headers(userId, organizationId), ...(options.headers || {}) } }), env);
const expect = async (path, userId, status, options = {}, organizationId = null) => {
  const response = await call(path, userId, options, organizationId);
  if (response.status !== status) throw new Error(`${path}: expected ${status}, got ${response.status}: ${await response.text()}`);
  return response;
};
const write = (userId, body, organizationId = null) => expect("/api/work-time", userId, body.expectedRevision === 0 ? 201 : 200, {
  method: "PUT",
  headers: { Origin: "https://timeflow.test", "Content-Type": "application/json" },
  body: JSON.stringify(body)
}, organizationId);
const sessionMonth = new Date().toISOString().slice(0, 7);

let response = await expect("/api/work-time", userA, 200);
let body = await response.json();
if (body.context.scope !== "private" || body.context.organizationId !== null) throw new Error("Default work-time context is not private.");

await write(userA, { expectedRevision: 0, eventType: "CLOCK_IN" });
await write(userA, { expectedRevision: 0, eventType: "CLOCK_IN" }, orgA);
const subjectsA = [...database.subjects.values()].filter((subject) => subject.user_id === userA);
if (subjectsA.length !== 2 || !subjectsA.some((subject) => subject.scope_type === "private") || !subjectsA.some((subject) => subject.organization_id === orgA)) throw new Error("Private and organization subjects were not separated.");

response = await expect("/api/work-time", userA, 200, {}, orgA);
body = await response.json();
if (body.context.scope !== "organization" || body.context.organizationId !== orgA || body.revision !== 1) throw new Error("Verified organization context was not returned.");

await expect("/api/work-time", userA, 403, {}, orgB);
await expect(`/api/work-time?organizationId=${orgB}`, userA, 400, {}, orgA);
await expect("/api/work-time", userA, 400, {
  method: "PUT", headers: { Origin: "https://timeflow.test", "Content-Type": "application/json" },
  body: JSON.stringify({ expectedRevision: 1, eventType: "CLOCK_OUT", organizationId: orgA })
}, orgA);

await expect("/api/work-time", userA, 403, {
  method: "PUT", headers: { Origin: "https://timeflow.test", "Content-Type": "application/json" },
  body: JSON.stringify({ userId: userB, expectedRevision: 0, eventType: "ADMIN_CORRECTION", correctionId: "forbidden", date: "2026-09-26", adjustmentMinutes: 10, note: "forbidden" })
}, orgA);

response = await expect("/api/work-time", admin, 201, {
  method: "PUT", headers: { Origin: "https://timeflow.test", "Content-Type": "application/json" },
  body: JSON.stringify({ userId: userB, expectedRevision: 0, eventType: "ADMIN_CORRECTION", correctionId: "approved", date: "2026-09-26", adjustmentMinutes: 10, note: "approved" })
}, orgA);
body = await response.json();
if (body.context.organizationId !== orgA || !database.journal.some((event) => event.user_id === userB && event.organization_id === orgA && event.actor_user_id === admin)) throw new Error("Organization admin correction lost tenant or actor binding.");

await expect(`/api/work-time/journal?userId=${encodeURIComponent(userB)}`, userA, 403, {}, orgA);
response = await expect(`/api/work-time/journal?userId=${encodeURIComponent(userB)}`, admin, 200, {}, orgA);
if ((await response.json()).events.length !== 1) throw new Error("Organization admin could not read the verified target journal.");
await expect("/api/work-time", admin, 403, {}, orgB);

await write(userA, { expectedRevision: 1, eventType: "CLOCK_OUT" }, orgA);
response = await expect(`/api/work-time/sessions?month=${sessionMonth}`, userA, 200, {}, orgA);
body = await response.json();
if (body.sessions.length !== 1 || body.context.organizationId !== orgA) throw new Error("Organization sessions were not isolated by subject.");
response = await expect(`/api/work-time/sessions?month=${sessionMonth}`, userA, 200);
if ((await response.json()).sessions.length !== 0) throw new Error("Organization session leaked into private context.");

console.log("Work-time tenant API: private/team subjects, verified membership, admin scope, body spoofing and cross-tenant isolation verified.");

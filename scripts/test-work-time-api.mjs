import worker from "../dist/server/index.js";

const normalUserId = "work-time-user-a";
const otherUserId = "work-time-user-b";
const adminUserId = "work-time-admin";

class WorkTimeTestD1 {
  constructor() {
    this.current = new Map();
    this.journal = [];
    this.failJournalOnce = false;
  }

  prepare(sql) {
    const database = this;
    return {
      bind(...values) {
        return {
          sql,
          values,
          async first() { return database.readFirst(sql, values); },
          async all() { return database.readAll(sql, values); },
          async run() { return { meta: { changes: 0 } }; }
        };
      },
      async first() { return database.readFirst(sql, []); },
      async all() { return database.readAll(sql, []); },
      async run() { return { meta: { changes: 0 } }; }
    };
  }

  readFirst(sql, values) {
    if (sql.includes("FROM timeflow_beta_access")) return [normalUserId, otherUserId, "work-time-journal-failure"].includes(values[0]) ? { user_id: values[0] } : null;
    if (sql.includes("FROM timeflow_work_time_current")) {
      const row = this.current.get(values[0]);
      return row ? { ...row } : null;
    }
    return null;
  }

  readAll(sql, values) {
    if (sql.includes("FROM timeflow_work_time_journal")) {
      return { results: this.journal.filter((event) => event.user_id === values[0]).sort((a, b) => b.revision - a.revision).map((event) => ({ ...event })) };
    }
    return { results: [] };
  }

  async batch(statements) {
    const nextCurrent = new Map([...this.current.entries()].map(([id, row]) => [id, { ...row }]));
    const nextJournal = this.journal.map((event) => ({ ...event }));
    const results = [];
    for (const statement of statements) {
      const { sql, values } = statement;
      if (sql.includes("INSERT INTO timeflow_work_time_current")) {
        const [userId, stateJson, actorUserId, eventType, source, effectiveTimestamp, serverUpdatedAt, createdAt] = values;
        if (nextCurrent.has(userId)) { results.push({ meta: { changes: 0 } }); continue; }
        if (this.failJournalOnce) { this.failJournalOnce = false; throw new Error("isolated journal trigger failed"); }
        const row = { user_id: userId, state_json: stateJson, revision: 1, last_actor_user_id: actorUserId, last_event_type: eventType, last_source: source, effective_timestamp: effectiveTimestamp, server_updated_at: serverUpdatedAt, created_at: createdAt };
        nextCurrent.set(userId, row);
        nextJournal.push({ id: `journal-${userId}-1`, user_id: userId, actor_user_id: actorUserId, event_type: eventType, source, revision: 1, effective_timestamp: effectiveTimestamp, server_timestamp: serverUpdatedAt, previous_state_json: null, new_state_json: stateJson });
        results.push({ meta: { changes: 1 } });
        continue;
      }
      if (sql.includes("UPDATE timeflow_work_time_current")) {
        const [stateJson, actorUserId, eventType, source, effectiveTimestamp, serverUpdatedAt, userId, expectedRevision] = values;
        const old = nextCurrent.get(userId);
        if (!old || old.revision !== expectedRevision) { results.push({ meta: { changes: 0 } }); continue; }
        if (this.failJournalOnce) { this.failJournalOnce = false; throw new Error("isolated journal trigger failed"); }
        const row = { ...old, state_json: stateJson, revision: old.revision + 1, last_actor_user_id: actorUserId, last_event_type: eventType, last_source: source, effective_timestamp: effectiveTimestamp, server_updated_at: serverUpdatedAt };
        nextCurrent.set(userId, row);
        nextJournal.push({ id: `journal-${userId}-${row.revision}`, user_id: userId, actor_user_id: actorUserId, event_type: eventType, source, revision: row.revision, effective_timestamp: effectiveTimestamp, server_timestamp: serverUpdatedAt, previous_state_json: old.state_json, new_state_json: stateJson });
        results.push({ meta: { changes: 1 } });
        continue;
      }
      results.push({ meta: { changes: 0 } });
    }
    this.current = nextCurrent;
    this.journal = nextJournal;
    return results;
  }
}

const fingerprint = async (value) => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((entry) => entry.toString(16).padStart(2, "0")).join("");
};

const database = new WorkTimeTestD1();
const env = { DB: database, TIMEFLOW_BETA_ADMIN_USER_FINGERPRINT: await fingerprint(adminUserId), TIMEFLOW_WORK_TIME_SERVER_ENABLED: "true" };
const headersFor = (id) => ({ "oai-authenticated-user-id": id, "oai-authenticated-user-email": `${id}@example.test` });
const request = (path, options = {}) => worker.fetch(new Request(`https://timeflow.test${path}`, options), env);
const expectStatus = async (path, status, options) => {
  const response = await request(path, options);
  if (response.status !== status) throw new Error(`${path}: expected ${status}, got ${response.status}: ${await response.text()}`);
  return response;
};
const put = (userId, body) => expectStatus("/api/work-time", 200, {
  method: "PUT", headers: { ...headersFor(userId), Origin: "https://timeflow.test", "Content-Type": "application/json" }, body: JSON.stringify(body)
});

await expectStatus("/api/work-time", 401);
await expectStatus("/api/work-time/journal", 401);
const disabled = await worker.fetch(new Request("https://timeflow.test/api/work-time", { headers: headersFor(normalUserId) }), { ...env, TIMEFLOW_WORK_TIME_SERVER_ENABLED: "false" });
if (disabled.status !== 503) throw new Error("The server work-time feature gate must default to a disabled response.");
await expectStatus("/api/work-time", 200, { headers: headersFor(normalUserId) });
await expectStatus("/api/work-time", 400, { method: "PUT", headers: { ...headersFor(normalUserId), Origin: "https://timeflow.test", "Content-Type": "application/json" }, body: JSON.stringify({ expectedRevision: "0", eventType: "CLOCK_IN" }) });
await expectStatus("/api/work-time", 400, { method: "PUT", headers: { ...headersFor(normalUserId), Origin: "https://timeflow.test", "Content-Type": "application/json" }, body: JSON.stringify({ expectedRevision: 0, eventType: "CLOCK_IN", server_timestamp: "2099-01-01T00:00:00.000Z" }) });

let response = await expectStatus("/api/work-time", 201, {
  method: "PUT", headers: { ...headersFor(normalUserId), Origin: "https://timeflow.test", "Content-Type": "application/json" },
  body: JSON.stringify({ expectedRevision: 0, eventType: "CLOCK_IN" })
});
let body = await response.json();
if (body.revision !== 1 || database.journal.length !== 1 || database.journal[0].actor_user_id !== normalUserId) throw new Error("CLOCK_IN must use the authenticated server actor.");

await expectStatus("/api/work-time", 200, { headers: headersFor(normalUserId) });
const beforeInvalidPayload = database.journal.length;
await expectStatus("/api/work-time", 400, { method: "PUT", headers: { ...headersFor(normalUserId), Origin: "https://timeflow.test", "Content-Type": "application/json" }, body: JSON.stringify({ expectedRevision: 1, eventType: "TIME_CORRECTION" }) });
if (database.journal.length !== beforeInvalidPayload) throw new Error("Invalid payload created a journal event.");
await expectStatus("/api/work-time", 409, { method: "PUT", headers: { ...headersFor(normalUserId), Origin: "https://timeflow.test", "Content-Type": "application/json" }, body: JSON.stringify({ expectedRevision: 1, eventType: "CLOCK_IN" }) });

response = await put(normalUserId, { expectedRevision: 1, eventType: "PAUSE_START" });
if ((await response.json()).revision !== 2) throw new Error("PAUSE_START revision invalid.");
response = await put(normalUserId, { expectedRevision: 2, eventType: "PAUSE_END" });
if ((await response.json()).revision !== 3) throw new Error("PAUSE_END revision invalid.");
response = await put(normalUserId, { expectedRevision: 3, eventType: "CLOCK_OUT" });
if ((await response.json()).revision !== 4) throw new Error("CLOCK_OUT revision invalid.");

const correction = { expectedRevision: 4, eventType: "TIME_CORRECTION", correctionId: "correction-1", date: "2026-09-16", adjustmentMinutes: 30, note: "corrected" };
response = await put(normalUserId, correction);
body = await response.json();
if (body.revision !== 5 || database.journal.at(-1).actor_user_id !== normalUserId || body.state.isWorking || body.state.manualCorrections.at(-1).adjustmentMinutes !== 30) throw new Error("Own correction must be server-computed without changing the clock state.");

for (const field of [{ isWorking: true }, { revision: 999 }, { actor_user_id: adminUserId }, { server_timestamp: "2099-01-01T00:00:00.000Z" }, { state: { isWorking: true } }, { unknown: true }]) {
  await expectStatus("/api/work-time", 400, { method: "PUT", headers: { ...headersFor(normalUserId), Origin: "https://timeflow.test", "Content-Type": "application/json" }, body: JSON.stringify({ ...correction, ...field }) });
}
if (database.journal.length !== 5) throw new Error("Rejected correction command created a journal event.");

const beforeForbidden = database.journal.length;
await expectStatus("/api/work-time", 400, { method: "PUT", headers: { ...headersFor(normalUserId), Origin: "https://timeflow.test", "Content-Type": "application/json" }, body: JSON.stringify({ userId: otherUserId, ...correction }) });
if (database.current.has(otherUserId) || database.journal.length !== beforeForbidden) throw new Error("Forbidden cross-user correction changed data.");
await expectStatus("/api/work-time", 403, { method: "PUT", headers: { ...headersFor(normalUserId), Origin: "https://timeflow.test", "Content-Type": "application/json" }, body: JSON.stringify({ userId: otherUserId, expectedRevision: 0, eventType: "ADMIN_CORRECTION", correctionId: "forbidden-admin-correction", date: "2026-09-16", adjustmentMinutes: 10, note: "forbidden" }) });
await expectStatus("/api/work-time", 403, { method: "PUT", headers: { ...headersFor(adminUserId), Origin: "https://timeflow.test", "Content-Type": "application/json" }, body: JSON.stringify({ userId: "outside-timeflow-beta", expectedRevision: 0, eventType: "ADMIN_CORRECTION", correctionId: "outside-admin-correction", date: "2026-09-16", adjustmentMinutes: 10, note: "outside" }) });
if (database.journal.length !== beforeForbidden) throw new Error("Forbidden admin correction created a journal event.");

response = await expectStatus("/api/work-time", 201, { method: "PUT", headers: { ...headersFor(adminUserId), Origin: "https://timeflow.test", "Content-Type": "application/json" }, body: JSON.stringify({ userId: otherUserId, expectedRevision: 0, eventType: "ADMIN_CORRECTION", correctionId: "admin-correction-1", date: "2026-09-16", adjustmentMinutes: -15, note: "admin correction" }) });
if ((await response.json()).revision !== 1 || database.journal.at(-1).actor_user_id !== adminUserId || database.journal.at(-1).event_type !== "ADMIN_CORRECTION") throw new Error("Admin correction actor binding invalid.");

const beforeStale = database.journal.length;
const manualEntry = { eventType: "MANUAL_ENTRY", date: "2026-09-16", start: "08:00", end: "16:00", breakMinutes: 30, note: "manual entry" };
await expectStatus("/api/work-time", 409, { method: "PUT", headers: { ...headersFor(normalUserId), Origin: "https://timeflow.test", "Content-Type": "application/json" }, body: JSON.stringify({ ...manualEntry, expectedRevision: 4 }) });
if (database.current.get(normalUserId).revision !== 5 || database.journal.length !== beforeStale) throw new Error("Stale revision wrote current or journal.");

for (const invalidManual of [{ start: "28:00" }, { end: "07:00" }, { breakMinutes: -1 }, { actor_user_id: adminUserId }, { extra: true }]) {
  await expectStatus("/api/work-time", 400, { method: "PUT", headers: { ...headersFor(normalUserId), Origin: "https://timeflow.test", "Content-Type": "application/json" }, body: JSON.stringify({ ...manualEntry, expectedRevision: 5, ...invalidManual }) });
}
response = await put(normalUserId, { ...manualEntry, expectedRevision: 5 });
if ((await response.json()).revision !== 6) throw new Error("Parallel winner failed.");
const journalAfterWinner = database.journal.length;
await expectStatus("/api/work-time", 409, { method: "PUT", headers: { ...headersFor(normalUserId), Origin: "https://timeflow.test", "Content-Type": "application/json" }, body: JSON.stringify({ ...manualEntry, note: "parallel-b", expectedRevision: 5 }) });
if (database.current.get(normalUserId).revision !== 6 || JSON.parse(database.current.get(normalUserId).state_json).manualEntries.at(-1).note !== "manual entry" || database.journal.length !== journalAfterWinner) throw new Error("Parallel loser overwrote state or added journal event.");
if (database.journal.filter((event) => event.user_id === normalUserId).length !== 6) throw new Error("Successful writes did not produce exactly one journal event each.");

const failureUser = "work-time-journal-failure";
database.failJournalOnce = true;
await expectStatus("/api/work-time", 500, { method: "PUT", headers: { ...headersFor(failureUser), Origin: "https://timeflow.test", "Content-Type": "application/json" }, body: JSON.stringify({ expectedRevision: 0, eventType: "CLOCK_IN" }) });
if (database.current.has(failureUser) || database.journal.some((event) => event.user_id === failureUser)) throw new Error("Journal failure left partial data.");

await expectStatus("/api/work-time/journal", 200, { headers: headersFor(normalUserId) });
await expectStatus(`/api/work-time/journal?userId=${otherUserId}`, 403, { headers: headersFor(normalUserId) });
await expectStatus(`/api/work-time/journal?userId=${otherUserId}`, 200, { headers: headersFor(adminUserId) });
await expectStatus("/api/work-time/journal", 405, { method: "DELETE", headers: headersFor(normalUserId) });

console.log("Work-time API: authenticated current state, transitions, own/admin corrections, 401/403, conflicts, actor/time manipulation and isolated journal rollback verified.");

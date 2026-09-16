import { readFile } from "node:fs/promises";
import worker from "../dist/server/index.js";

const assert = (value, message) => { if (!value) throw new Error(message); };
const userId = "work-time-sync-test";

function database() {
  const rows = new Map();
  return {
    rows,
    prepare(sql) {
      let values = [];
      const statement = {
        bind(...bound) { values = bound; return statement; },
        async run() {
          if (sql.startsWith("CREATE TABLE") || sql.startsWith("CREATE INDEX")) return { meta: { changes: 0 } };
          if (sql.startsWith("INSERT INTO timeflow_user_sync")) {
            if (rows.has(values[0])) return { meta: { changes: 0 } };
            rows.set(values[0], { payload_json: values[1], revision: 1, updated_at: values[2] });
            return { meta: { changes: 1 } };
          }
          if (sql.startsWith("UPDATE timeflow_user_sync")) {
            const row = rows.get(values[2]);
            if (!row || row.revision !== values[3]) return { meta: { changes: 0 } };
            row.payload_json = values[0]; row.revision += 1; row.updated_at = values[1];
            return { meta: { changes: 1 } };
          }
          return { meta: { changes: 0 } };
        },
        async first() {
          if (sql.includes("timeflow_beta_access")) return { user_id: userId };
          return rows.get(values[0]) || null;
        },
        async all() { return { results: [] }; }
      };
      return statement;
    }
  };
}

const headers = { "oai-authenticated-user-id": userId, "oai-authenticated-user-email": "sync@example.test", Origin: "https://timeflow.test", "Content-Type": "application/json" };
const authoritySnapshot = {
  "timeflow-profile-v1": { name: "private" },
  "timeflow-workday-v2": { isWorking: true, workStart: "old-local" },
  "timeflow-private-account-v1": [{ source: "stamp", minutes: 999 }],
  "timeflow-worktime-audit-v1": { events: [{ action: "old" }] },
  "timeflow-work-time-pending-v1": { change: { eventType: "CLOCK_IN" } }
};

async function put(env, snapshot) {
  return worker.fetch(new Request("https://timeflow.test/api/sync", { method: "PUT", headers, body: JSON.stringify({ expectedRevision: 0, snapshot }) }), env);
}
async function get(env) { return worker.fetch(new Request("https://timeflow.test/api/sync", { headers }), env); }

const protectedDb = database();
const protectedEnv = { DB: protectedDb, TIMEFLOW_WORK_TIME_SERVER_ENABLED: "true" };
assert((await put(protectedEnv, authoritySnapshot)).status === 200, "Server mode sync write failed.");
const protectedStored = JSON.parse(protectedDb.rows.get(userId).payload_json);
for (const key of ["timeflow-workday-v2", "timeflow-private-account-v1", "timeflow-worktime-audit-v1", "timeflow-work-time-pending-v1"]) assert(!(key in protectedStored), `Server-authoritative snapshot retained ${key}.`);
const protectedGet = await (await get(protectedEnv)).json();
assert(protectedGet.snapshot["timeflow-profile-v1"]?.name === "private", "General profile data no longer syncs.");
assert(!("timeflow-workday-v2" in protectedGet.snapshot), "Incoming server snapshot still exposes legacy workday data.");

const legacyDb = database();
const legacyEnv = { DB: legacyDb };
assert((await put(legacyEnv, authoritySnapshot)).status === 200, "Legacy sync write failed.");
const legacyStored = JSON.parse(legacyDb.rows.get(userId).payload_json);
assert(legacyStored["timeflow-workday-v2"]?.isWorking, "Explicitly disabled legacy mode lost its workday sync.");

const [syncSource, scriptSource, accountSource, stampSource, homeSource, cleanSource, reminderSource] = await Promise.all([
  readFile(new URL("../js/sprint9.js", import.meta.url), "utf8"),
  readFile(new URL("../js/script.js", import.meta.url), "utf8"),
  readFile(new URL("../js/private-account.js", import.meta.url), "utf8"),
  readFile(new URL("../js/stamp.js", import.meta.url), "utf8"),
  readFile(new URL("../js/private-home.js", import.meta.url), "utf8"),
  readFile(new URL("../js/private-clean.js", import.meta.url), "utf8"),
  readFile(new URL("../js/private-reminders.js", import.meta.url), "utf8")
]);
for (const marker of ["WORK_TIME_SNAPSHOT_KEYS", "function syncKeys()", "serverWorkTimeAuthority()", "if (serverWorkTimeAuthority()) return;"]) assert(syncSource.includes(marker), `Client sync isolation path missing: ${marker}`);
for (const marker of ["TimeFlowWorkTimeSnapshotAuthority", "if (window.TimeFlowWorkTimeSnapshotAuthority()) return;", "if (!window.TimeFlowWorkTimeSnapshotAuthority()) loadWorkday()"] ) assert(scriptSource.includes(marker), `Work-time UI restore guard missing: ${marker}`);
for (const marker of ["const serverMode", "const currentWorkday", "if (serverMode()) return;"]) assert(accountSource.includes(marker), `Private account server authority guard missing: ${marker}`);
for (const [name, source] of [["stamp", stampSource], ["private home", homeSource], ["private clean", cleanSource], ["private reminders", reminderSource]]) assert(source.includes("TimeFlowWorkTimeSnapshotAuthority"), `${name} can still render an old legacy workday while server authority is active.`);

console.log("Work-time sync isolation: outgoing and incoming snapshots exclude server-authoritative work-time data while explicit legacy mode remains compatible.");

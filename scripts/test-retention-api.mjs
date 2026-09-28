import worker from "../dist/server/index.js";

const adminUserId = "retention-admin";
const normalUserId = "retention-user";
const statements = [];
const batches = [];
let pendingDeletion = null;

const fingerprint = async (value) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((entry) => entry.toString(16).padStart(2, "0")).join("");
};

function result(sql, values) {
  return {
    async first() {
      if (sql.includes("FROM timeflow_beta_access")) return values[0] === normalUserId ? { user_id: normalUserId } : null;
      if (sql.includes("sqlite_master") && sql.includes("timeflow_work_time_subjects")) return { name: "timeflow_work_time_subjects" };
      if (sql.includes("SELECT id, delete_after FROM timeflow_work_time_subjects")) return pendingDeletion ? { id: "private-subject", delete_after: pendingDeletion.deleteAfter } : null;
      if (sql.includes("SELECT delete_after FROM timeflow_work_time_subjects")) return pendingDeletion ? { delete_after: pendingDeletion.deleteAfter } : null;
      return null;
    },
    async all() {
      if (sql.includes("SELECT subject.id FROM timeflow_work_time_subjects AS subject")) return { results: [{ id: "due-private" }] };
      if (sql.includes("SELECT id FROM timeflow_support_tickets")) return { results: [] };
      return { results: [] };
    },
    async run() {
      statements.push({ sql, values });
      if (sql.includes("SET private_deletion_requested_at = COALESCE")) {
        if (!pendingDeletion) pendingDeletion = { requestedAt: values[0], deleteAfter: values[1] };
      }
      if (sql.includes("SET private_deletion_requested_at = NULL")) pendingDeletion = null;
      return { meta: { changes: 1 } };
    }
  };
}

const database = {
  prepare(sql) {
    return {
      bind(...values) { return { sql, values, ...result(sql, values) }; },
      sql,
      values: [],
      ...result(sql, [])
    };
  },
  async batch(items) {
    batches.push(items.map((item) => ({ sql: item.sql, values: item.values })));
    return items.map(() => ({ meta: { changes: 1 } }));
  }
};

const env = {
  DB: database,
  TIMEFLOW_BETA_ADMIN_USER_FINGERPRINT: await fingerprint(adminUserId),
  TIMEFLOW_RETENTION_ADMIN_ENABLED: "true"
};
const headersFor = (id) => ({ "oai-authenticated-user-id": id, "oai-authenticated-user-email": `${id}@example.test` });
const call = (path, options = {}, environment = env) => worker.fetch(new Request(`https://timeflow.test${path}`, options), environment);

if ((await call("/api/admin/retention")).status !== 401) throw new Error("Unauthenticated retention access was not rejected.");
if ((await call("/api/admin/retention", { headers: headersFor(normalUserId) })).status !== 403) throw new Error("Non-admin retention access was not rejected.");
if ((await call("/api/admin/retention", { headers: headersFor(adminUserId) }, { ...env, TIMEFLOW_RETENTION_ADMIN_ENABLED: "false" })).status !== 503) throw new Error("Disabled retention gate did not fail closed.");

let response = await call("/api/admin/retention", { headers: headersFor(adminUserId) });
let body = await response.json();
if (response.status !== 200 || body.eligibleCount !== 1 || body.ruleVersion !== "2026-09-v1") throw new Error("Retention dry-run summary is invalid.");
if ((await call("/api/admin/retention", { method: "POST", headers: { ...headersFor(adminUserId), Origin: "https://attacker.test", "Content-Type": "application/json" }, body: JSON.stringify({ action: "run_due_retention" }) })).status !== 403) throw new Error("Cross-origin retention run was not rejected.");

response = await call("/api/admin/retention", { method: "POST", headers: { ...headersFor(adminUserId), Origin: "https://timeflow.test", "Content-Type": "application/json" }, body: JSON.stringify({ action: "run_due_retention" }) });
body = await response.json();
if (response.status !== 200 || !body.completed || body.deletedCount !== 1) throw new Error("Authorized retention run failed.");
if (batches.length !== 1 || batches[0].length !== 4 || !batches[0][0].sql.includes("journal") || !batches[0][3].sql.includes("subjects")) throw new Error("Retention deletion order is incomplete.");
if (!statements.some(({ sql }) => sql.includes("retention_runs") && sql.includes("'running'")) || !statements.some(({ sql }) => sql.includes("retention_runs SET") && sql.includes("'completed'"))) throw new Error("Retention run was not audited.");

const deleteOptions = { method: "DELETE", headers: { ...headersFor(normalUserId), Origin: "https://timeflow.test" } };
response = await call("/api/account-data", deleteOptions);
body = await response.json();
if (response.status !== 200 || !body.deleted || !body.privateWorkTimeDeletion?.scheduled || !body.privateWorkTimeDeletion.deleteAfter) throw new Error("Account deletion did not schedule private work-time deletion.");
const firstDeadline = body.privateWorkTimeDeletion.deleteAfter;
response = await call("/api/account-data", deleteOptions);
body = await response.json();
if (body.privateWorkTimeDeletion.deleteAfter !== firstDeadline) throw new Error("Repeated account deletion extended the recovery window.");

response = await call("/api/account-data", { method: "POST", headers: { ...headersFor(normalUserId), Origin: "https://timeflow.test", "Content-Type": "application/json" }, body: JSON.stringify({ action: "restore_private_work_time" }) });
if (response.status !== 200 || !(await response.json()).restored || pendingDeletion) throw new Error("Private work-time restoration failed inside the recovery window.");
if ((await call("/api/account-data", { method: "POST", headers: { ...headersFor(normalUserId), Origin: "https://timeflow.test", "Content-Type": "application/json" }, body: JSON.stringify({ action: "restore_private_work_time" }) })).status !== 409) throw new Error("Restoration without a pending deletion did not fail safely.");

console.log("Retention API: admin gate, dry run, ordered deletion, audit, 30-day scheduling and restoration verified.");

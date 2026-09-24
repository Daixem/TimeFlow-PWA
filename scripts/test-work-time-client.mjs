import { readFile } from "node:fs/promises";
import vm from "node:vm";

class MemoryStorage {
  constructor(values = {}) { this.values = new Map(Object.entries(values)); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

function response(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

const source = await readFile(new URL("../js/work-time-api.js", import.meta.url), "utf8");
const sandbox = { URL, console, globalThis: null };
sandbox.globalThis = sandbox;
vm.runInNewContext(source, sandbox, { filename: "work-time-api.js" });
const create = sandbox.TimeFlowWorkTimeApi?.create;
if (typeof create !== "function") throw new Error("Work-time API adapter was not exposed.");

const accountStorage = new MemoryStorage({
  "timeflow-work-time-owner-v1": "user-a",
  "timeflow-work-time-current-v1": JSON.stringify({ owner: "a" }),
  "timeflow-work-time-meta-v1": JSON.stringify({ revision: 3 }),
  "timeflow-work-time-pending-v1": JSON.stringify({ change: { eventType: "CLOCK_OUT", expectedRevision: 3 } })
});
if (!sandbox.TimeFlowWorkTimeApi.activateAccount(accountStorage, "user-b")) throw new Error("Account switch was not detected.");
if (accountStorage.getItem("timeflow-work-time-current-v1") !== null || accountStorage.getItem("timeflow-work-time-pending-v1") !== null) throw new Error("Previous account work-time data remained visible after account switch.");
accountStorage.setItem("timeflow-work-time-current-v1", JSON.stringify({ owner: "b" }));
sandbox.TimeFlowWorkTimeApi.activateAccount(accountStorage, "user-a");
if (JSON.parse(accountStorage.getItem("timeflow-work-time-current-v1")).owner !== "a" || !accountStorage.getItem("timeflow-work-time-pending-v1")) throw new Error("Returning account did not recover its isolated current state and pending change.");
sandbox.TimeFlowWorkTimeApi.activateAccount(accountStorage, "user-b");
if (JSON.parse(accountStorage.getItem("timeflow-work-time-current-v1")).owner !== "b" || accountStorage.getItem("timeflow-work-time-pending-v1") !== null) throw new Error("Second account received another account's pending work-time change.");
const legacyStorage = new MemoryStorage({ "timeflow-work-time-current-v1": JSON.stringify({ owner: "unknown" }) });
sandbox.TimeFlowWorkTimeApi.activateAccount(legacyStorage, "user-a");
if (legacyStorage.getItem("timeflow-work-time-current-v1") !== null) throw new Error("Unowned legacy work-time data was assigned to the first authenticated account.");

let calls = [];
const disabledClient = create({
  storage: new MemoryStorage(),
  request: async (path) => { calls.push({ path }); return response(503, { error: "work_time_feature_disabled" }); }
});
if (await disabledClient.isEnabled() !== false || calls.length !== 1) throw new Error("Disabled server feature gate is not respected by the client.");

const storage = new MemoryStorage({ "timeflow-sync-meta-v1": JSON.stringify({ revision: 99 }) });
let revision = 7;
calls = [];
const client = create({
  storage,
  request: async (path, options = {}) => {
    calls.push({ path, options, payload: options.body ? JSON.parse(options.body) : null });
    if (options.method === "GET" && path.includes("/sessions")) return response(200, { sessions: [{ id: "session-a", work_date: "2026-09-16", net_minutes: 450 }] });
    if (options.method === "GET" && path.endsWith("/journal")) return response(200, { events: [] });
    if (options.method === "GET") return response(200, { state: { isWorking: false }, revision, updatedAt: "2026-09-10T12:00:00.000Z" });
    const payload = JSON.parse(options.body);
    revision += 1;
    return response(200, { saved: true, state: { event: payload.eventType }, revision, updatedAt: "2026-09-10T12:01:00.000Z" });
  }
});

if (await client.isEnabled() !== true) throw new Error("Enabled feature gate was not detected.");
await client.writeChange({ eventType: "CLOCK_IN", actor_user_id: "forged", server_timestamp: "2099", revision: 0, admin: true });
const clockIn = calls.at(-1).payload;
if (clockIn.expectedRevision !== 7 || "actor_user_id" in clockIn || "server_timestamp" in clockIn || "admin" in clockIn || "revision" in clockIn) throw new Error("Client sent protected work-time authority fields or used the sync revision.");
await client.writeChange({ eventType: "CLOCK_OUT" });
await client.writeChange({ eventType: "PAUSE_START" });
await client.writeChange({ eventType: "PAUSE_END" });
await client.writeChange({ eventType: "TIME_CORRECTION", correctionId: "client-correction", date: "2026-09-16", adjustmentMinutes: 15, note: "own", state: { isWorking: false }, actor_user_id: "forged" });
const correctionPayload = calls.at(-1).payload;
if (correctionPayload.correctionId !== "client-correction" || correctionPayload.adjustmentMinutes !== 15 || "state" in correctionPayload || "actor_user_id" in correctionPayload) throw new Error("Client correction must send only the narrow command.");
await client.writeChange({ eventType: "MANUAL_ENTRY", entryId: "manual-client-entry", date: "2026-09-16", minutes: 450, note: "manual", state: { isWorking: true } });
const manualPayload = calls.at(-1).payload;
if (manualPayload.entryId !== "manual-client-entry" || manualPayload.minutes !== 450 || "state" in manualPayload || "start" in manualPayload) throw new Error("Client manual entry must send only the narrow command.");
await client.writeChange({ eventType: "ADMIN_CORRECTION", userId: "other-user", correctionId: "admin-client-correction", date: "2026-09-16", adjustmentMinutes: -15, note: "admin", state: { isWorking: false } });
const adminPayload = calls.at(-1).payload;
if (adminPayload.userId !== "other-user" || adminPayload.adjustmentMinutes !== -15 || "state" in adminPayload) throw new Error("Client admin correction must send only the narrow command.");
await client.getJournal();
const sessions = await client.getSessions("2026-09");
if (!Array.isArray(sessions.sessions) || !calls.at(-1).path.endsWith("/sessions?month=2026-09")) throw new Error("Session history API was not requested with a bounded month filter.");
if (client.getMeta().revision !== 14) throw new Error("Server responses did not update the separate work-time revision.");

let conflictWrites = 0;
const conflictStorage = new MemoryStorage({ "timeflow-work-time-meta-v1": JSON.stringify({ revision: 3, updatedAt: "old" }) });
const conflictClient = create({
  storage: conflictStorage,
  request: async (_path, options = {}) => {
    if (options.method === "GET") return response(200, { state: { isWorking: false }, revision: 3, updatedAt: "old" });
    conflictWrites += 1;
    return response(409, { error: "work_time_conflict", state: { isWorking: true }, revision: 4, updatedAt: "remote" });
  }
});
try { await conflictClient.writeChange({ eventType: "CLOCK_IN" }); throw new Error("Expected work-time conflict."); } catch (error) { if (error.status !== 409) throw error; }
if (conflictWrites !== 1 || conflictClient.getConflict()?.serverRevision !== 4) throw new Error("409 conflict did not persist or retried automatically.");
let applied = null;
await conflictClient.loadServerConflictVersion(async (state) => { applied = state; });
if (!applied?.isWorking || conflictWrites !== 1 || conflictClient.getConflict() !== null) throw new Error("Loading the server version wrote data or retained a resolved conflict.");

const reapplyStorage = new MemoryStorage({ "timeflow-work-time-conflict-v1": JSON.stringify({ active: true, localChange: { eventType: "CLOCK_IN" }, serverState: { isWorking: false }, serverRevision: 4, updatedAt: "remote" }) });
let reapplyWrites = 0;
const reapplyClient = create({
  storage: reapplyStorage,
  request: async (_path, options = {}) => {
    reapplyWrites += 1;
    const payload = JSON.parse(options.body);
    if (payload.expectedRevision !== 4) throw new Error("Reapply did not use the server work-time revision.");
    return response(200, { saved: true, state: { isWorking: true }, revision: 5, updatedAt: "confirmed" });
  }
});
await reapplyClient.reapplyLocalConflictVersion();
if (reapplyWrites !== 1 || reapplyClient.getConflict() !== null || reapplyClient.getMeta().revision !== 5) throw new Error("Conscious reapply did not complete correctly.");

let offline = true;
const pendingStorage = new MemoryStorage({ "timeflow-work-time-meta-v1": JSON.stringify({ revision: 8 }) });
const pendingWrites = [];
const pendingClient = create({
  storage: pendingStorage,
  request: async (_path, options = {}) => {
    pendingWrites.push(options.body ? JSON.parse(options.body) : null);
    if (offline) throw new TypeError("offline");
    return response(200, { saved: true, state: { isWorking: true }, revision: 9, updatedAt: "reconnected" });
  }
});
const pending = await pendingClient.writeChange({ eventType: "CLOCK_IN" });
if (!pending.pending || pendingClient.getPending()?.change.expectedRevision !== 8) throw new Error("Offline work-time change was not preserved as pending.");
offline = false;
await pendingClient.reconnectPending();
if (pendingWrites.length !== 2 || pendingWrites[1].expectedRevision !== 8 || pendingClient.getPending() !== null) throw new Error("Reconnect did not perform exactly one controlled pending write.");

for (const status of [401, 403]) {
  const rejected = create({ storage: new MemoryStorage(), request: async () => response(status, { error: "rejected" }) });
  try { await rejected.isEnabled(); throw new Error(`Expected ${status}.`); } catch (error) { if (error.status !== status) throw error; }
}

for (const status of [500, 409]) {
  let writes = 0;
  const rejected = create({ storage: new MemoryStorage(), request: async (_path, options = {}) => {
    if (options.method === "GET") return response(200, { state: { isWorking: false }, revision: 1 });
    writes += 1;
    return response(status, { error: status === 409 ? "work_time_conflict" : "storage_unavailable", state: { isWorking: false }, revision: 1 });
  } });
  await rejected.isEnabled();
  try { await rejected.writeChange({ eventType: "CLOCK_IN" }); throw new Error(`Expected ${status}.`); } catch (error) { if (error.status !== status) throw error; }
  if (writes !== 1 || rejected.getPending()) throw new Error(`${status} must not create a local fallback or pending replacement write.`);
}

let networkWrites = 0;
const unavailable = create({ storage: new MemoryStorage(), request: async () => { networkWrites += 1; throw new TypeError("network unavailable"); } });
try { await unavailable.isEnabled(); throw new Error("Expected network availability error."); } catch (error) { if (!error.network) throw error; }
if (networkWrites !== 1 || unavailable.getPending()) throw new Error("An unavailable initial server must not create a local replacement booking.");

let simultaneousWrites = 0;
const reconnectStorage = new MemoryStorage({ "timeflow-work-time-meta-v1": JSON.stringify({ revision: 1 }) });
const reconnectClient = create({ storage: reconnectStorage, request: async (_path, options = {}) => {
  if (options.method === "GET") return response(200, { state: { isWorking: false }, revision: 1 });
  simultaneousWrites += 1;
  await new Promise((resolve) => setTimeout(resolve, 5));
  return response(200, { state: { isWorking: true }, revision: 2 });
} });
reconnectStorage.setItem("timeflow-work-time-pending-v1", JSON.stringify({ change: { eventType: "CLOCK_IN", expectedRevision: 1 } }));
await Promise.all([reconnectClient.reconnectPending(), reconnectClient.reconnectPending()]);
if (simultaneousWrites !== 1) throw new Error("Reconnect must perform one controlled write, not a double-write.");

// A reload shares the same persistent store. Its pending command must retain
// its original revision, become a conflict if another device wrote first, and
// never retry by itself.
const restartStorage = new MemoryStorage({ "timeflow-work-time-meta-v1": JSON.stringify({ revision: 12 }), "timeflow-work-time-pending-v1": JSON.stringify({ change: { eventType: "CLOCK_OUT", expectedRevision: 11 }, queuedAt: "offline" }) });
let restartWrites = 0;
const reloadedClient = create({ storage: restartStorage, request: async (_path, options = {}) => { restartWrites += 1; const payload = JSON.parse(options.body); if (payload.expectedRevision !== 11) throw new Error("Reload changed the original pending revision."); return response(409, { error: "work_time_conflict", state: { isWorking: true }, revision: 12, updatedAt: "remote" }); } });
try { await reloadedClient.reconnectPending(); throw new Error("Expected reconnect conflict."); } catch (error) { if (error.status !== 409) throw error; }
if (restartWrites !== 1 || !reloadedClient.getPending()?.change || !reloadedClient.getConflict()?.active) throw new Error("Reload conflict lost pending data or retried automatically.");

console.log("Work-time client: account isolation, feature gate, dedicated revision, API actions, 401/403/409, offline pending, reconnect and no automatic conflict retry verified.");

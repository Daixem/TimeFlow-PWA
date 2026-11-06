import { readFile } from "node:fs/promises";
import vm from "node:vm";
function assert(condition, message) { if (!condition) throw new Error(message); }
function memoryStorage() { const data = new Map(); return { get: (key) => data.get(key) ?? null, set: (key, value) => data.set(key, String(value)), remove: (key) => data.delete(key) }; }
const source = await readFile(new URL("../js/sync-conflict.js", import.meta.url), "utf8");
const sandbox = { globalThis: {}, Date, JSON };
vm.runInNewContext(source, sandbox, { filename: "sync-conflict.js" });
const { handleSyncConflict, loadServerConflictVersion, reapplyLocalConflictVersion, restorePersistedSyncConflict, refreshPersistedSyncConflict } = sandbox.globalThis.TimeFlowSyncConflict;
const storage = memoryStorage(); let writes = 0; let local = null; let baseline = null;
const apply = async (snapshot) => { local = snapshot; };
const saveRevision = async (revision, updatedAt) => storage.set("meta", JSON.stringify({ revision, updatedAt }));
const saveBaseSnapshot = async (snapshot) => { baseline = snapshot; };
handleSyncConflict({ storage, localSnapshot: { profile: { name: "Local" }, theme: { color: "blue" } }, baseSnapshot: { profile: { name: "Old" }, theme: { color: "dark" } }, response: { revision: 21, data: { profile: { name: "Server" }, theme: { color: "dark" }, schedule: [1] }, updatedAt: "t21" } });
assert(restorePersistedSyncConflict(storage)?.active && writes === 0, "offline conflict persistence / no auto retry");
const restarted = restorePersistedSyncConflict(storage);
assert(restarted.localSnapshot.profile.name === "Local" && restarted.serverSnapshot.profile.name === "Server" && restarted.serverRevision === 21, "restart conflict persistence");
const refreshedStorage = memoryStorage();
handleSyncConflict({ storage: refreshedStorage, localSnapshot: { profile: { name: "Local" } }, baseSnapshot: { profile: { name: "Old" } }, response: { revision: 21, data: { profile: { name: "Old server" } }, updatedAt: "t21" } });
const oldConflict = restorePersistedSyncConflict(refreshedStorage);
const refreshed = refreshPersistedSyncConflict(refreshedStorage, { revision: 25, data: { profile: { name: "Current server" }, schedule: [2] }, updatedAt: "t25" });
assert(refreshed.serverRevision === 25 && refreshed.updatedAt === "t25" && refreshed.serverSnapshot.profile.name === "Current server" && refreshed.serverSnapshot.schedule[0] === 2, "persisted conflict refreshed from current cloud version");
assert(refreshed.detectedAt === oldConflict.detectedAt && refreshed.localSnapshot.profile.name === "Local" && refreshed.baseSnapshot.profile.name === "Old", "refresh preserves original local and base snapshots");
await loadServerConflictVersion({ storage, applyLocalSnapshot: apply, saveRevision, saveBaseSnapshot });
assert(local.profile.name === "Server" && baseline.schedule[0] === 1 && JSON.parse(storage.get("meta")).revision === 21 && !restorePersistedSyncConflict(storage) && writes === 0, "load server version");
handleSyncConflict({ storage, localSnapshot: { profile: { name: "Local" }, theme: { color: "blue" } }, baseSnapshot: { profile: { name: "Old" }, theme: { color: "dark" } }, response: { revision: 21, data: { profile: { name: "Server" }, theme: { color: "dark" }, schedule: [1] } } });
let failed = false; try { await loadServerConflictVersion({ storage, applyLocalSnapshot: async () => { throw new Error("local failure"); }, saveRevision }); } catch { failed = true; }
assert(failed && restorePersistedSyncConflict(storage)?.localSnapshot.profile.name === "Local", "load failure preserves conflict");
const saved = await reapplyLocalConflictVersion({ storage, requestSync: async (payload) => { writes += 1; assert(payload.expectedRevision === 21 && payload.snapshot.profile.name === "Local" && payload.snapshot.theme.color === "blue" && payload.snapshot.schedule[0] === 1, "merge preserves remote-only values and applies the user's local choice"); return { revision: 22, updatedAt: "t22" }; }, applyLocalSnapshot: apply, saveRevision, saveBaseSnapshot });
assert(saved.state === "saved" && writes === 1 && !restorePersistedSyncConflict(storage) && JSON.parse(storage.get("meta")).revision === 22 && baseline.schedule[0] === 1, "reapply success");
handleSyncConflict({ storage, localSnapshot: { profile: { name: "Local" }, theme: { color: "blue" } }, baseSnapshot: { profile: { name: "Old" }, theme: { color: "dark" } }, response: { revision: 22, data: { profile: { name: "Remote new" }, theme: { color: "dark" } } } });
const repeated = await reapplyLocalConflictVersion({ storage, requestSync: async () => { writes += 1; const error = new Error("sync_conflict"); error.status = 409; error.result = { revision: 23, data: { profile: { name: "Remote newer" }, theme: { color: "dark" }, schedule: [2] } }; throw error; }, applyLocalSnapshot: apply, saveRevision });
const pending = restorePersistedSyncConflict(storage);
assert(repeated.state === "conflict" && pending.localSnapshot.profile.name === "Local" && pending.serverSnapshot.profile.name === "Remote newer" && pending.serverSnapshot.schedule[0] === 2 && pending.serverRevision === 23 && writes === 2, "repeated conflict");
handleSyncConflict({ storage, localSnapshot: { profile: { email: "old@example.test" } }, response: { revision: 0 } });
await loadServerConflictVersion({ storage, applyLocalSnapshot: apply, saveRevision });
assert(Object.keys(local).length === 0, "choosing an empty server account clears old local sync data");
const sprint = await readFile(new URL("../js/sprint9.js", import.meta.url), "utf8");
assert(sprint.includes("Serverstand laden") && sprint.includes("Meine Änderungen übernehmen") && sprint.includes("hasDifferentLocalAccount") && sprint.includes("saved?.account === accountScope()") && sprint.includes("baseSnapshot") && !/force\s*[=:]|overwrite\s*[=:]|ignoreRevision\s*[=:]|skipRevision\s*[=:]|skipConflict\s*[=:]/.test(sprint), "conflict UI, account isolation and no force bypass");
assert(sprint.indexOf('const cloud = await requestSync("GET")') < sprint.indexOf("const persistedConflict = conflictLogic.restorePersistedSyncConflict") && sprint.includes("refreshPersistedSyncConflict"), "initial sync refreshes cloud data and catches local edits before offering resolution");
assert(sprint.includes('staleConflictBox.querySelectorAll("button").forEach((button) => { button.disabled = true; })') && sprint.includes("bevor du eine Version auswählst"), "offline startup disables stale conflict choices until the current cloud version can be checked");
console.log("Sync client conflicts: offline, restart, server load, failed load, reapply, repeated 409 and write counts verified.");

// Run the complete sync client against one shared account and isolated device
// storage. No production API, account data or browser storage is involved.
const clientSource = sprint;
const personalKey = "timeflow-private-schedule-v1";
const colleaguePrefix = "timeflow-private-colleague-schedule-v1:";
const accountId = "sync-test-account";
const email = "sync-test@example.invalid";
const colleagueKey = colleaguePrefix + email;
const clone = (value) => JSON.parse(JSON.stringify(value));
function sharedAccount(snapshot) {
  return { snapshot: clone(snapshot), revision: 1, puts: 0 };
}
function device(server, initial = {}) {
  const values = new Map(Object.entries(initial).map(([key, value]) => [key, JSON.stringify(value)]));
  values.set("timeflow-platform-session-cache-v1", JSON.stringify({ session: { user: { id: accountId, email } } }));
  const events = new Map(), clicks = new Map(), timers = new Map();
  const button = { disabled: false, addEventListener: (name, fn) => clicks.set(name, fn) };
  const node = { classList: { add() {}, remove() {} }, insertAdjacentHTML() {}, textContent: "", querySelector(selector) {
    if (selector === '[data-sync-now]') return button;
    if (selector === '[data-sync-conflict]') return null;
    return node;
  } };
  let timerId = 0;
  const store = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: (key) => values.delete(key), keys: () => [...values.keys()] };
  const ctx = {
    window: { TimeFlowPlatform: { storage: store }, TimeFlowWorkTimeSnapshotAuthority: () => true,
      addEventListener() {}, setInterval() {}, setTimeout(fn) { timers.set(++timerId, fn); return timerId; }, clearTimeout(id) { timers.delete(id); } },
    document: { baseURI: "https://sync-test.example.invalid/", visibilityState: "visible", querySelector: () => node, getElementById: () => node,
      addEventListener(name, fn) { events.set(name, [...(events.get(name) || []), fn]); },
      dispatchEvent(event) { for (const fn of events.get(event.type) || []) fn(event); } },
    navigator: { onLine: true }, CustomEvent: class { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } },
    URL, Date, Intl, console,
    fetch: async (_url, options) => {
      if (options.method === "GET") return { ok: true, json: async () => clone({ snapshot: server.snapshot, revision: server.revision }) };
      if (server.failWrites) throw new Error("simulated connection loss");
      const body = JSON.parse(options.body);
      if (body.expectedRevision !== server.revision) return { ok: false, status: 409, json: async () => clone({ data: server.snapshot, revision: server.revision }) };
      server.snapshot = clone(body.snapshot); server.revision++; server.puts++;
      return { ok: true, json: async () => ({ revision: server.revision }) };
    }
  };
  vm.runInNewContext(source, ctx);
  ctx.window.TimeFlowSyncConflict = ctx.TimeFlowSyncConflict;
  vm.runInNewContext(clientSource.replace("  watchAccountStorage();", "  window.__syncTest = { initialSync };\n  watchAccountStorage();"), ctx);
  for (const fn of events.get("DOMContentLoaded") || []) fn();
  const settle = async () => { for (let i = 0; i < 40; i++) await Promise.resolve(); };
  return {
    get: (key) => JSON.parse(values.get(key) || "null"),
    async start() { for (const fn of events.get("timeflow:session-ready") || []) fn({ detail: { source: "platform", user: { id: accountId, email } } }); await settle(); },
    async poll() { await ctx.window.__syncTest.initialSync(); await settle(); },
    async manualSync() { clicks.get("click")(); await settle(); },
    async importSchedule(own, colleagues) {
      store.setItem(personalKey, JSON.stringify(own)); store.setItem(colleagueKey, JSON.stringify(colleagues));
      ctx.document.dispatchEvent({ type: "timeflow:private-schedule-updated" });
      const pending = [...timers.values()]; timers.clear(); for (const fn of pending) fn(); await settle();
    }
  };
}
const oldShift = [{ date: "2026-11-02", title: "Old", start: "08:00", end: "16:00" }];
const newShift = [{ date: "2026-11-02", title: "New", start: "13:30", end: "22:00" }];
const coworkers = [{ date: "2026-11-02", personName: "Synthetic colleague", start: "13:30", end: "22:00" }];
const server = sharedAccount({ [personalKey]: oldShift });
const mac = device(server), iphone = device(server);
await mac.start(); await iphone.start();
await mac.importSchedule(newShift, coworkers);
assert(server.snapshot[personalKey][0].title === "New" && server.snapshot[colleagueKey].length === 1, "Mac import reaches the account API");
await iphone.poll();
assert(iphone.get(personalKey)[0].title === "New" && iphone.get(colleagueKey).length === 1, "iPhone receives personal and colleague shifts together");
const putsAfterImport = server.puts;
await iphone.poll(); await mac.poll();
assert(server.puts === putsAfterImport, "unchanged devices do not upload old schedules on subsequent polls");

const legacyServer = sharedAccount({ [personalKey]: newShift, [colleaguePrefix + accountId]: coworkers });
const fresh = device(legacyServer);
await fresh.start();
assert(fresh.get(personalKey)?.[0].title === "New" && fresh.get(colleagueKey)?.length === 1, "first login applies complete cloud snapshot after legacy colleague normalization");
assert(legacyServer.puts === 0, "reading legacy cloud keys does not write or advance the cloud revision");

const deviceBaseline = { [personalKey]: oldShift, [colleaguePrefix + accountId]: coworkers };
const returningServer = sharedAccount({ [personalKey]: newShift, [colleaguePrefix + accountId]: coworkers });
returningServer.revision = 2;
const returning = device(returningServer, { ...deviceBaseline,
  "timeflow-sync-meta-v1": { account: accountId, revision: 1 },
  "timeflow-sync-base-v1": { account: accountId, snapshot: deviceBaseline },
  [colleaguePrefix + "different-user@example.invalid"]: [{ ...coworkers[0], personName: "Other account" }]
});
await returning.start(); await returning.poll();
assert(returning.get(personalKey)[0].title === "New" && returningServer.puts === 0, "returning iPhone keeps baseline and cannot re-upload stale personal shifts during migration");
assert(returning.get(colleagueKey).length === 1 && returning.get(colleaguePrefix + "different-user@example.invalid").length === 1, "local data from another account is neither migrated nor deleted");

const reconnectServer = sharedAccount({ [personalKey]: oldShift });
const reconnect = device(reconnectServer); await reconnect.start();
reconnectServer.snapshot = { [personalKey]: newShift, [colleagueKey]: coworkers }; reconnectServer.revision++;
await reconnect.manualSync();
assert(reconnect.get(personalKey)[0].title === "New" && reconnect.get(colleagueKey).length === 1 && reconnectServer.puts === 0, "manual sync pulls the current account before attempting any upload");
console.log("Two-device schedule sync: Mac import, iPhone refresh, legacy keys, account isolation and read-before-write manual sync verified.");

const retryServer = sharedAccount({ [personalKey]: oldShift });
const offlineMac = device(retryServer); await offlineMac.start();
retryServer.failWrites = true;
await offlineMac.importSchedule(newShift, coworkers);
assert(offlineMac.get(personalKey)[0].title === "New" && retryServer.snapshot[personalKey][0].title === "Old", "failed upload keeps the local import without claiming a server write");
retryServer.failWrites = false;
await offlineMac.poll();
const retryPhone = device(retryServer); await retryPhone.start();
assert(retryPhone.get(personalKey)[0].title === "New" && retryPhone.get(colleagueKey).length === 1, "import survives a failed upload and reaches another device after reconnection");
console.log("Schedule reconnect: failed upload preserves local data and retries successfully.");

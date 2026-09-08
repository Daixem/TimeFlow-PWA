import { readFile } from "node:fs/promises";
import vm from "node:vm";
function assert(condition, message) { if (!condition) throw new Error(message); }
function memoryStorage() { const data = new Map(); return { get: (key) => data.get(key) ?? null, set: (key, value) => data.set(key, String(value)), remove: (key) => data.delete(key) }; }
const source = await readFile(new URL("../js/sync-conflict.js", import.meta.url), "utf8");
const sandbox = { globalThis: {}, Date, JSON };
vm.runInNewContext(source, sandbox, { filename: "sync-conflict.js" });
const { handleSyncConflict, loadServerConflictVersion, reapplyLocalConflictVersion, restorePersistedSyncConflict } = sandbox.globalThis.TimeFlowSyncConflict;
const storage = memoryStorage(); let writes = 0; let local = null;
const apply = async (snapshot) => { local = snapshot; };
const saveRevision = async (revision, updatedAt) => storage.set("meta", JSON.stringify({ revision, updatedAt }));
handleSyncConflict({ storage, localSnapshot: "LOCAL", response: { revision: 21, data: "REMOTE", updatedAt: "t21" } });
assert(restorePersistedSyncConflict(storage)?.active && writes === 0, "offline conflict persistence / no auto retry");
const restarted = restorePersistedSyncConflict(storage);
assert(restarted.localSnapshot === "LOCAL" && restarted.serverSnapshot === "REMOTE" && restarted.serverRevision === 21, "restart conflict persistence");
await loadServerConflictVersion({ storage, applyLocalSnapshot: apply, saveRevision });
assert(local === "REMOTE" && JSON.parse(storage.get("meta")).revision === 21 && !restorePersistedSyncConflict(storage) && writes === 0, "load server version");
handleSyncConflict({ storage, localSnapshot: "LOCAL", response: { revision: 21, data: "REMOTE" } });
let failed = false; try { await loadServerConflictVersion({ storage, applyLocalSnapshot: async () => { throw new Error("local failure"); }, saveRevision }); } catch { failed = true; }
assert(failed && restorePersistedSyncConflict(storage)?.localSnapshot === "LOCAL", "load failure preserves conflict");
const saved = await reapplyLocalConflictVersion({ storage, requestSync: async (payload) => { writes += 1; assert(payload.expectedRevision === 21 && payload.snapshot === "LOCAL", "reapply payload"); return { revision: 22, updatedAt: "t22" }; }, applyLocalSnapshot: apply, saveRevision });
assert(saved.state === "saved" && writes === 1 && !restorePersistedSyncConflict(storage) && JSON.parse(storage.get("meta")).revision === 22, "reapply success");
handleSyncConflict({ storage, localSnapshot: "LOCAL", response: { revision: 22, data: "REMOTE-NEW" } });
const repeated = await reapplyLocalConflictVersion({ storage, requestSync: async () => { writes += 1; const error = new Error("sync_conflict"); error.status = 409; error.result = { revision: 23, data: "REMOTE-NEWER" }; throw error; }, applyLocalSnapshot: apply, saveRevision });
const pending = restorePersistedSyncConflict(storage);
assert(repeated.state === "conflict" && pending.localSnapshot === "LOCAL" && pending.serverSnapshot === "REMOTE-NEWER" && pending.serverRevision === 23 && writes === 2, "repeated conflict");
const sprint = await readFile(new URL("../js/sprint9.js", import.meta.url), "utf8");
assert(sprint.includes("Serverstand laden") && sprint.includes("Lokale Änderungen erneut verwenden") && !/force\s*[=:]|overwrite\s*[=:]|ignoreRevision\s*[=:]|skipRevision\s*[=:]|skipConflict\s*[=:]/.test(sprint), "conflict UI and no force bypass");
console.log("Sync client conflicts: offline, restart, server load, failed load, reapply, repeated 409 and write counts verified.");

(function (root) {
  "use strict";
  const CONFLICT_KEY = "timeflow-sync-conflict-v1";

  function get(storage, key) { return typeof storage.get === "function" ? storage.get(key) : storage.getItem(key); }
  function set(storage, key, value) { return typeof storage.set === "function" ? storage.set(key, value) : storage.setItem(key, value); }
  function remove(storage, key) { return typeof storage.remove === "function" ? storage.remove(key) : storage.removeItem(key); }
  function parse(value) { try { return JSON.parse(value); } catch { return null; } }

  function restorePersistedSyncConflict(storage) {
    const conflict = parse(get(storage, CONFLICT_KEY));
    return conflict?.active && conflict.localSnapshot ? conflict : null;
  }
  function clearSyncConflict(storage) { remove(storage, CONFLICT_KEY); }
  function persistSyncConflict(storage, conflict) {
    const persisted = { active: true, localSnapshot: conflict.localSnapshot, serverSnapshot: conflict.serverSnapshot ?? null, serverRevision: Number(conflict.serverRevision || 0), updatedAt: conflict.updatedAt || null, detectedAt: conflict.detectedAt || new Date().toISOString() };
    set(storage, CONFLICT_KEY, JSON.stringify(persisted));
    return persisted;
  }
  function handleSyncConflict({ storage, localSnapshot, response }) {
    return persistSyncConflict(storage, { localSnapshot, serverSnapshot: response?.data || null, serverRevision: response?.revision, updatedAt: response?.updatedAt });
  }
  async function loadServerConflictVersion({ storage, applyLocalSnapshot, saveRevision }) {
    const conflict = restorePersistedSyncConflict(storage);
    if (!conflict) return null;
    await applyLocalSnapshot(conflict.serverSnapshot);
    await saveRevision(conflict.serverRevision, conflict.updatedAt);
    clearSyncConflict(storage);
    return conflict;
  }
  async function reapplyLocalConflictVersion({ storage, requestSync, applyLocalSnapshot, saveRevision }) {
    const conflict = restorePersistedSyncConflict(storage);
    if (!conflict) return { state: "missing" };
    try {
      const result = await requestSync({ snapshot: conflict.localSnapshot, expectedRevision: conflict.serverRevision });
      await applyLocalSnapshot(conflict.localSnapshot);
      await saveRevision(result.revision, result.updatedAt);
      clearSyncConflict(storage);
      return { state: "saved", result };
    } catch (error) {
      if (error?.status !== 409) throw error;
      return { state: "conflict", conflict: handleSyncConflict({ storage, localSnapshot: conflict.localSnapshot, response: error.result || {} }) };
    }
  }
  root.TimeFlowSyncConflict = { restorePersistedSyncConflict, clearSyncConflict, persistSyncConflict, handleSyncConflict, loadServerConflictVersion, reapplyLocalConflictVersion };
}(globalThis));

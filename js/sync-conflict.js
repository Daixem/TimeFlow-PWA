(function (root) {
  "use strict";
  const CONFLICT_KEY = "timeflow-sync-conflict-v1";

  function get(storage, key) { return typeof storage.get === "function" ? storage.get(key) : storage.getItem(key); }
  function set(storage, key, value) { return typeof storage.set === "function" ? storage.set(key, value) : storage.setItem(key, value); }
  function remove(storage, key) { return typeof storage.remove === "function" ? storage.remove(key) : storage.removeItem(key); }
  function parse(value) { try { return JSON.parse(value); } catch { return null; } }
  function stable(value) {
    if (Array.isArray(value)) return value.map(stable);
    if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
    return value;
  }
  function equal(left, right) { return JSON.stringify(stable(left)) === JSON.stringify(stable(right)); }
  function mergeChangedKeys(serverSnapshot, localSnapshot, baseSnapshot) {
    const server = serverSnapshot && typeof serverSnapshot === "object" && !Array.isArray(serverSnapshot) ? serverSnapshot : {};
    const local = localSnapshot && typeof localSnapshot === "object" && !Array.isArray(localSnapshot) ? localSnapshot : {};
    const base = baseSnapshot && typeof baseSnapshot === "object" && !Array.isArray(baseSnapshot) ? baseSnapshot : null;
    const merged = { ...server };
    for (const key of new Set([...Object.keys(local), ...Object.keys(base || {})])) {
      const hasLocal = Object.prototype.hasOwnProperty.call(local, key);
      const hasBase = Boolean(base && Object.prototype.hasOwnProperty.call(base, key));
      const localChanged = base ? (hasLocal !== hasBase || !equal(local[key], base[key])) : (hasLocal !== Object.prototype.hasOwnProperty.call(server, key) || !equal(local[key], server[key]));
      if (!localChanged) continue;
      if (hasLocal) merged[key] = local[key];
      else delete merged[key];
    }
    return merged;
  }

  function restorePersistedSyncConflict(storage) {
    const conflict = parse(get(storage, CONFLICT_KEY));
    return conflict?.active && conflict.localSnapshot ? conflict : null;
  }
  function refreshPersistedSyncConflict(storage, response) {
    const existing = restorePersistedSyncConflict(storage);
    if (!existing) return null;
    const serverSnapshot = response?.data && typeof response.data === "object" && !Array.isArray(response.data) ? response.data : {};
    return persistSyncConflict(storage, {
      ...existing,
      serverSnapshot,
      serverRevision: response?.revision,
      updatedAt: response?.updatedAt,
      detectedAt: existing.detectedAt
    });
  }
  function clearSyncConflict(storage) { remove(storage, CONFLICT_KEY); }
  function persistSyncConflict(storage, conflict) {
    const persisted = { active: true, localSnapshot: conflict.localSnapshot, baseSnapshot: conflict.baseSnapshot ?? null, serverSnapshot: conflict.serverSnapshot ?? null, serverRevision: Number(conflict.serverRevision || 0), updatedAt: conflict.updatedAt || null, detectedAt: conflict.detectedAt || new Date().toISOString() };
    set(storage, CONFLICT_KEY, JSON.stringify(persisted));
    return persisted;
  }
  function handleSyncConflict({ storage, localSnapshot, baseSnapshot, response }) {
    const serverSnapshot = response?.data && typeof response.data === "object" && !Array.isArray(response.data) ? response.data : {};
    return persistSyncConflict(storage, { localSnapshot, baseSnapshot: baseSnapshot || null, serverSnapshot, serverRevision: response?.revision, updatedAt: response?.updatedAt });
  }
  async function loadServerConflictVersion({ storage, applyLocalSnapshot, saveRevision, saveBaseSnapshot }) {
    const conflict = restorePersistedSyncConflict(storage);
    if (!conflict) return null;
    await applyLocalSnapshot(conflict.serverSnapshot || {});
    await saveRevision(conflict.serverRevision, conflict.updatedAt);
    if (conflict.serverSnapshot && saveBaseSnapshot) await saveBaseSnapshot(conflict.serverSnapshot);
    clearSyncConflict(storage);
    return conflict;
  }
  async function reapplyLocalConflictVersion({ storage, requestSync, applyLocalSnapshot, saveRevision, saveBaseSnapshot }) {
    const conflict = restorePersistedSyncConflict(storage);
    if (!conflict) return { state: "missing" };
    try {
      const mergedSnapshot = mergeChangedKeys(conflict.serverSnapshot, conflict.localSnapshot, conflict.baseSnapshot);
      const result = await requestSync({ snapshot: mergedSnapshot, expectedRevision: conflict.serverRevision });
      await applyLocalSnapshot(mergedSnapshot);
      await saveRevision(result.revision, result.updatedAt);
      if (saveBaseSnapshot) await saveBaseSnapshot(mergedSnapshot);
      clearSyncConflict(storage);
      return { state: "saved", result };
    } catch (error) {
      if (error?.status !== 409) throw error;
      return { state: "conflict", conflict: handleSyncConflict({ storage, localSnapshot: conflict.localSnapshot, baseSnapshot: conflict.baseSnapshot, response: error.result || {} }) };
    }
  }
  root.TimeFlowSyncConflict = { restorePersistedSyncConflict, refreshPersistedSyncConflict, clearSyncConflict, persistSyncConflict, handleSyncConflict, loadServerConflictVersion, reapplyLocalConflictVersion, mergeChangedKeys };
}(globalThis));

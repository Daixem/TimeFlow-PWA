(function (root) {
  "use strict";
  var META_KEY = "timeflow-work-time-meta-v1", PENDING_KEY = "timeflow-work-time-pending-v1", CONFLICT_KEY = "timeflow-work-time-conflict-v1", CACHE_KEY = "timeflow-work-time-current-v1";
  var ACCOUNT_OWNER_KEY = "timeflow-work-time-owner-v1";
  var ACCOUNT_KEYS = [CACHE_KEY, META_KEY, PENDING_KEY, CONFLICT_KEY, "timeflow-work-time-correction-pending-v1", "timeflow-work-time-sessions-v1"];
  function accountKey(userId, key) { return "timeflow-work-time-account-v1:" + encodeURIComponent(userId) + ":" + key; }
  function activateAccount(storage, userId) {
    var nextOwner = String(userId || "").trim();
    if (!storage || !nextOwner) return false;
    var previousOwner = storage.getItem(ACCOUNT_OWNER_KEY);
    if (previousOwner === nextOwner) return false;
    ACCOUNT_KEYS.forEach(function (key) {
      var value = storage.getItem(key);
      if (previousOwner) {
        var previousKey = accountKey(previousOwner, key);
        if (value === null) storage.removeItem(previousKey); else storage.setItem(previousKey, value);
      }
      var nextValue = storage.getItem(accountKey(nextOwner, key));
      if (nextValue === null) storage.removeItem(key); else storage.setItem(key, nextValue);
    });
    storage.setItem(ACCOUNT_OWNER_KEY, nextOwner);
    return true;
  }
  function parse(value, fallback) { try { return JSON.parse(value) ?? fallback; } catch (_error) { return fallback; } }
  function errorFromResponse(status, result) { var error = new Error(result && result.error ? result.error : "work_time_" + status); error.status = status; error.result = result || {}; return error; }
  function create(options) {
    var storage = options.storage, request = options.request || root.fetch.bind(root), baseUrl = options.baseUrl || new URL("api/work-time", root.document ? root.document.baseURI : "https://timeflow.invalid/").toString();
    var reconnectInFlight = null;
    function read(key, fallback) { return parse(storage.getItem(key), fallback); }
    function write(key, value) { storage.setItem(key, JSON.stringify(value)); }
    function clear(key) { storage.removeItem(key); }
    function meta() { return read(META_KEY, { revision: 0, updatedAt: null }); }
    function saveCurrent(result) {
      if (!result || !result.state || typeof result.state !== "object" || !Number.isInteger(Number(result.revision)) || Number(result.revision) < 1) {
        var invalid = new Error("work_time_invalid_response"); invalid.uncertain = true; throw invalid;
      }
      write(CACHE_KEY, result.state); write(META_KEY, { revision: Number(result.revision), updatedAt: result.updatedAt || null }); return result;
    }
    async function api(path, method, body) {
      var response;
      try { response = await request(path, { method: method, cache: "no-store", headers: body ? { "Content-Type": "application/json", Accept: "application/json" } : { Accept: "application/json" }, body: body ? JSON.stringify(body) : undefined }); }
      catch (_error) { var networkError = new Error("work_time_network_error"); networkError.network = true; throw networkError; }
      var result = await response.json().catch(function () { return {}; });
      if (!response.ok) throw errorFromResponse(response.status, result);
      return result;
    }
    function safeChange(change, revision) {
      var result = { eventType: change && change.eventType, expectedRevision: revision };
      var eventType = result.eventType;
      if (change && (eventType === "TIME_CORRECTION" || eventType === "ADMIN_CORRECTION" || eventType === "CORRECTION_UPDATED")) {
        result.correctionId = change.correctionId;
        result.date = change.date;
        result.adjustmentMinutes = change.adjustmentMinutes;
        result.note = change.note;
      }
      if (change && eventType === "CORRECTION_REVOKED") { result.correctionId = change.correctionId; result.note = change.note; }
      if (change && eventType === "ADMIN_CORRECTION") result.userId = change.userId;
      if (change && eventType === "MANUAL_ENTRY") {
        result.entryId = change.entryId;
        result.date = change.date;
        result.minutes = change.minutes;
        result.note = change.note;
      }
      return result;
    }
    async function getCurrent() { var result = await api(baseUrl, "GET"); if (result.state) saveCurrent(result); return result; }
    async function getJournal() { return api(baseUrl + "/journal", "GET"); }
    async function getSessions(month) { var suffix = typeof month === "string" && month ? "?month=" + encodeURIComponent(month) : ""; return api(baseUrl + "/sessions" + suffix, "GET"); }
    async function isEnabled() { try { await getCurrent(); return true; } catch (error) { if (error.status === 503 && error.result && error.result.error === "work_time_feature_disabled") return false; throw error; } }
    function preserveConflict(change, response) { var conflict = { active: true, localChange: change, serverState: response.state || null, serverRevision: Number(response.revision || 0), updatedAt: response.updatedAt || null }; write(CONFLICT_KEY, conflict); return conflict; }
    async function send(change, revision) { var result = await api(baseUrl, "PUT", safeChange(change, revision)); saveCurrent(result); clear(PENDING_KEY); clear(CONFLICT_KEY); return result; }
    async function writeChange(change) {
      var existing = read(PENDING_KEY, null);
      if (existing && existing.change) return { pending: true, ...existing };
      var revision = Number(meta().revision || 0);
      try { return await send(change, revision); } catch (error) {
        if (error.status === 409) { error.conflict = preserveConflict(change, error.result || {}); throw error; }
        if (error.network || error.uncertain) { var pending = { change: safeChange(change, revision), queuedAt: new Date().toISOString() }; write(PENDING_KEY, pending); return { pending: true, ...pending }; }
        throw error;
      }
    }
    async function reconnectPending() {
      if (reconnectInFlight) return reconnectInFlight;
      var pending = read(PENDING_KEY, null);
      if (!pending || !pending.change) return { pending: false };
      // Keep the original resource revision. Re-reading meta here could turn a
      // stale offline command into a different command after another device won.
      reconnectInFlight = (async function () {
        try { return await send(pending.change, Number(pending.change.expectedRevision)); }
        catch (error) {
          if (error.status === 409) error.conflict = preserveConflict(pending.change, error.result || {});
          throw error;
        }
      }());
      try { return await reconnectInFlight; } finally { reconnectInFlight = null; }
    }
    async function loadServerConflictVersion(applyLocalState) { var conflict = read(CONFLICT_KEY, null); if (!conflict || !conflict.active) return null; if (typeof applyLocalState === "function") await applyLocalState(conflict.serverState); saveCurrent({ state: conflict.serverState, revision: conflict.serverRevision, updatedAt: conflict.updatedAt }); clear(CONFLICT_KEY); return conflict.serverState; }
    async function reapplyLocalConflictVersion() { var conflict = read(CONFLICT_KEY, null); if (!conflict || !conflict.active) return null; try { return await send(conflict.localChange, conflict.serverRevision); } catch (error) { if (error.status === 409) error.conflict = preserveConflict(conflict.localChange, error.result || {}); throw error; } }
    return { getCurrent: getCurrent, getJournal: getJournal, getSessions: getSessions, isEnabled: isEnabled, writeChange: writeChange, reconnectPending: reconnectPending, loadServerConflictVersion: loadServerConflictVersion, reapplyLocalConflictVersion: reapplyLocalConflictVersion, getMeta: meta, getPending: function () { return read(PENDING_KEY, null); }, getConflict: function () { return read(CONFLICT_KEY, null); } };
  }
  root.TimeFlowWorkTimeApi = { create: create, activateAccount: activateAccount };
}(globalThis));

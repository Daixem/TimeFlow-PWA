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
  function validOrganizationId(value) { return typeof value === "string" && /^[A-Za-z0-9_-]{1,160}$/.test(value); }
  function organizationStorageKey(storage, organizationId, key) {
    if (!organizationId) return key;
    var owner = String(storage.getItem(ACCOUNT_OWNER_KEY) || "anonymous");
    return "timeflow-work-time-context-v1:" + encodeURIComponent(owner) + ":" + encodeURIComponent(organizationId) + ":" + key;
  }
  function errorFromResponse(status, result) { var error = new Error(result && result.error ? result.error : "work_time_" + status); error.status = status; error.result = result || {}; return error; }
  function create(options) {
    var storage = options.storage, request = options.request || root.fetch.bind(root), baseUrl = options.baseUrl || new URL("api/work-time", root.document ? root.document.baseURI : "https://timeflow.invalid/").toString();
    var requestedOrganizationId = options.organizationId === undefined ? root.TimeFlowWorkTimeContext?.organizationId : options.organizationId;
    var organizationId = requestedOrganizationId === null || requestedOrganizationId === undefined || requestedOrganizationId === "" ? null : String(requestedOrganizationId).trim();
    if (organizationId && !validOrganizationId(organizationId)) throw new Error("work_time_invalid_organization_context");
    var reconnectInFlight = null;
    function storageKey(key) { return organizationStorageKey(storage, organizationId, key); }
    function read(key, fallback) { return parse(storage.getItem(storageKey(key)), fallback); }
    function write(key, value) { storage.setItem(storageKey(key), JSON.stringify(value)); }
    function clear(key) { storage.removeItem(storageKey(key)); }
    function meta() { return read(META_KEY, { revision: 0, updatedAt: null }); }
    function pendingChanges() {
      var pending = read(PENDING_KEY, null);
      if (Array.isArray(pending?.changes)) return pending.changes.filter(function (item) { return item && item.change; });
      return pending && pending.change ? [{ change: pending.change, queuedAt: pending.queuedAt || pending.change.occurredAt || new Date().toISOString() }] : [];
    }
    function savePending(changes) {
      if (!changes.length) { clear(PENDING_KEY); return null; }
      var normalized = changes.map(function (item) { return { change: item.change, queuedAt: item.queuedAt }; });
      var snapshot = { change: normalized[normalized.length - 1].change, queuedAt: normalized[0].queuedAt, changes: normalized };
      write(PENDING_KEY, snapshot);
      return snapshot;
    }
    function saveCurrent(result) {
      if (!result || !result.state || typeof result.state !== "object" || !Number.isInteger(Number(result.revision)) || Number(result.revision) < 1) {
        var invalid = new Error("work_time_invalid_response"); invalid.uncertain = true; throw invalid;
      }
      write(CACHE_KEY, result.state); write(META_KEY, { revision: Number(result.revision), updatedAt: result.updatedAt || null }); return result;
    }
    async function api(path, method, body) {
      var response;
      var headers = body ? { "Content-Type": "application/json", Accept: "application/json" } : { Accept: "application/json" };
      if (organizationId) headers["X-TimeFlow-Organization-Id"] = organizationId;
      try { response = await request(path, { method: method, cache: "no-store", headers: headers, body: body ? JSON.stringify(body) : undefined }); }
      catch (_error) { var networkError = new Error("work_time_network_error"); networkError.network = true; throw networkError; }
      var result = await response.json().catch(function () { return {}; });
      if (!response.ok) {
        var responseError = errorFromResponse(response.status, result);
        if (response.status >= 500 && !(response.status === 503 && result.error === "work_time_feature_disabled")) responseError.uncertain = true;
        throw responseError;
      }
      if (result && result.context) {
        var responseOrganizationId = result.context.organizationId || null;
        if (responseOrganizationId !== organizationId) throw new Error("work_time_context_mismatch");
      }
      return result;
    }
    function safeChange(change, revision) {
      var result = { eventType: change && change.eventType, expectedRevision: revision };
      var eventType = result.eventType;
      if (change && ["CLOCK_IN", "CLOCK_OUT", "PAUSE_START", "PAUSE_END"].includes(eventType) && typeof change.occurredAt === "string") result.occurredAt = change.occurredAt;
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
    async function getCurrent() { var result = await api(baseUrl, "GET"); if (result.state) saveCurrent(result); else if (Number(result.revision) === 0) { write(CACHE_KEY, { isWorking: false, workStart: null, workEnd: null, isPaused: false, pauseStartedAt: null, pauseAccumulatedMs: 0, hasManualPause: false }); write(META_KEY, { revision: 0, updatedAt: null }); } return result; }
    async function getJournal() { return api(baseUrl + "/journal", "GET"); }
    async function getSessions(month) { var suffix = typeof month === "string" && month ? "?month=" + encodeURIComponent(month) : ""; return api(baseUrl + "/sessions" + suffix, "GET"); }
    async function isEnabled() { try { await getCurrent(); return true; } catch (error) { if (error.status === 503 && error.result && error.result.error === "work_time_feature_disabled") return false; throw error; } }
    function preserveConflict(change, response) { var conflict = { active: true, localChange: change, serverState: response.state || null, serverRevision: Number(response.revision || 0), updatedAt: response.updatedAt || null }; write(CONFLICT_KEY, conflict); return conflict; }
    async function send(change, revision, keepPending) { var result = await api(baseUrl, "PUT", safeChange(change, revision)); saveCurrent(result); if (!keepPending) clear(PENDING_KEY); clear(CONFLICT_KEY); return result; }
    function queueConflictError(conflict) { var error = new Error("work_time_conflict_pending"); error.status = 409; error.result = { state: conflict.serverState, revision: conflict.serverRevision, updatedAt: conflict.updatedAt }; error.conflict = conflict; return error; }
    async function writeChange(change) {
      var conflict = read(CONFLICT_KEY, null);
      if (conflict && conflict.active) throw queueConflictError(conflict);
      var existing = pendingChanges();
      var lastQueuedAt = existing.reduce(function (latest, item) { return Math.max(latest, Date.parse(item.change.occurredAt || item.queuedAt || "") || 0); }, 0);
      var attemptedAt = new Date(Math.max(Date.now(), lastQueuedAt + (existing.length ? 1 : 0))).toISOString();
      if (existing.length) {
        var last = existing[existing.length - 1];
        var revision = Number(last.change.expectedRevision || 0) + 1;
        var queued = { change: safeChange({ ...change, occurredAt: change.occurredAt || attemptedAt }, revision), queuedAt: attemptedAt };
        existing.push(queued);
        var savedQueue = savePending(existing);
        if (root.navigator && root.navigator.onLine) {
          try {
            var flushed = await reconnectPending();
            while (pendingChanges().length && !(read(CONFLICT_KEY, null) || {}).active) flushed = await reconnectPending();
            return flushed;
          }
          catch (error) {
            if (!error.network && !error.uncertain) throw error;
          }
        }
        return { pending: true, change: queued.change, queuedAt: queued.queuedAt, queueLength: savedQueue.changes.length };
      }
      var revision = Number(meta().revision || 0);
      try { return await send(change, revision, false); } catch (error) {
        if (error.status === 409) { error.conflict = preserveConflict(change, error.result || {}); throw error; }
        if (error.network || error.uncertain) {
          var queued = { change: safeChange({ ...change, occurredAt: change.occurredAt || attemptedAt }, revision), queuedAt: attemptedAt };
          savePending([queued]);
          return { pending: true, ...queued, queueLength: 1 };
        }
        throw error;
      }
    }
    async function reconnectPending() {
      if (reconnectInFlight) return reconnectInFlight;
      var conflict = read(CONFLICT_KEY, null);
      if (conflict && conflict.active) throw queueConflictError(conflict);
      var queue = pendingChanges();
      if (!queue.length) return { pending: false };
      reconnectInFlight = (async function () {
        var result = null;
        while (queue.length) {
          var current = queue[0];
          var revision = Number(current.change.expectedRevision || 0);
          try {
            result = await send(current.change, revision, true);
          } catch (error) {
            if (error.status === 409) error.conflict = preserveConflict(current.change, error.result || {});
            throw error;
          }
          queue.shift();
          if (queue.length) queue[0].change.expectedRevision = Number(result.revision);
          savePending(queue);
        }
        return result;
      }());
      try { return await reconnectInFlight; } finally { reconnectInFlight = null; }
    }
    async function loadServerConflictVersion(applyLocalState) {
      var conflict = read(CONFLICT_KEY, null);
      if (!conflict || !conflict.active) return null;
      if (typeof applyLocalState === "function") await applyLocalState(conflict.serverState);
      if (conflict.serverState && typeof conflict.serverState === "object") saveCurrent({ state: conflict.serverState, revision: conflict.serverRevision, updatedAt: conflict.updatedAt });
      else { clear(CACHE_KEY); write(META_KEY, { revision: Number(conflict.serverRevision || 0), updatedAt: conflict.updatedAt || null }); }
      clear(PENDING_KEY); clear(CONFLICT_KEY);
      return conflict.serverState;
    }
    async function discardPending() { var result = await getCurrent(); clear(PENDING_KEY); clear(CONFLICT_KEY); return result; }
    async function reapplyLocalConflictVersion() {
      var conflict = read(CONFLICT_KEY, null);
      if (!conflict || !conflict.active) return null;
      var queue = pendingChanges();
      if (!queue.length) queue = [{ change: conflict.localChange, queuedAt: conflict.localChange?.occurredAt || new Date().toISOString() }];
      queue.forEach(function (item, index) { item.change.expectedRevision = Number(conflict.serverRevision) + index; });
      savePending(queue); clear(CONFLICT_KEY);
      return reconnectPending();
    }
    return { organizationId: organizationId, getCurrent: getCurrent, getJournal: getJournal, getSessions: getSessions, isEnabled: isEnabled, writeChange: writeChange, reconnectPending: reconnectPending, loadServerConflictVersion: loadServerConflictVersion, reapplyLocalConflictVersion: reapplyLocalConflictVersion, discardPending: discardPending, getMeta: meta, getCachedCurrent: function () { return read(CACHE_KEY, null); }, getPending: function () { return savePending(pendingChanges()); }, getConflict: function () { return read(CONFLICT_KEY, null); } };
  }
  root.TimeFlowWorkTimeApi = { create: create, activateAccount: activateAccount };
}(globalThis));

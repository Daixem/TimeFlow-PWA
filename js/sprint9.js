"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const SYNC_KEYS = ["timeflow-profile-v1", "timeflow-settings-v1", "timeflow-profile-preferences-v1", "timeflow-custom-background-v1", "timeflow-private-schedule-v1", "timeflow-private-schedule-learning-v1", "timeflow-private-account-v1", "timeflow-worktime-audit-v1", "timeflow-monthly-targets-v1", "timeflow-private-setup-v1", "timeflow-beta-consent-v1", "timeflow-workday-v2", "timeflow-notifications-v1", "timeflow-notification-read-v1", "timeflow-quick-actions-v1"];
  const LEARNING_KEY_PREFIX = "timeflow-private-schedule-learning-v1:";
  const COLLEAGUE_KEY_PREFIX = "timeflow-private-colleague-schedule-v1:";
  const WORK_TIME_SNAPSHOT_KEYS = new Set(["timeflow-workday-v2", "timeflow-workday-history-v1", "timeflow-private-account-v1", "timeflow-worktime-audit-v1", "timeflow-work-time-current-v1", "timeflow-work-time-meta-v1", "timeflow-work-time-pending-v1", "timeflow-work-time-conflict-v1", "timeflow-work-time-correction-pending-v1", "timeflow-work-time-sessions-v1"]);
  const META_KEY = "timeflow-sync-meta-v1";
  const BASE_KEY = "timeflow-sync-base-v1";
  const BACKUP_RESTORE_KEY = "timeflow-backup-restore-pending-v1";
  const settingsLayout = document.querySelector("#settingsPage .settings-layout");
  if (!settingsLayout) return;

  settingsLayout.insertAdjacentHTML("beforeend", `
    <section class="cloud-sync-card" aria-labelledby="cloudSyncTitle">
      <span class="cloud-sync-icon"><i class="fa-solid fa-cloud-arrow-up"></i></span>
      <div class="cloud-sync-copy"><small>Datensynchronisierung</small><strong id="cloudSyncTitle">Synchronisierung wird vorbereitet</strong><p id="cloudSyncDescription">Profildaten und Einstellungen werden geprüft.</p></div>
      <span class="cloud-sync-state" id="cloudSyncState"><i></i><b>Prüfung</b></span>
      <button type="button" data-sync-now disabled><i class="fa-solid fa-arrows-rotate"></i><span><strong>Jetzt synchronisieren</strong><small id="cloudSyncTimestamp">Noch nicht synchronisiert</small></span></button>
    </section>
  `);

  const card = document.querySelector(".cloud-sync-card");
  const title = document.getElementById("cloudSyncTitle");
  const description = document.getElementById("cloudSyncDescription");
  const state = document.getElementById("cloudSyncState");
  const timestamp = document.getElementById("cloudSyncTimestamp");
  const syncButton = card.querySelector("[data-sync-now]");
  let platformSession = false;
  let platformAccountId = "";
  let platformAccountEmail = "";
  let ready = false;
  let syncing = false;
  let queuedUpload = false;
  let queuedWorkdaySnapshot = window.TimeFlowPlatform.storage.getItem("timeflow-workday-v2") || "";

  function parseJson(value, fallback = null) {
    try { return JSON.parse(value) ?? fallback; } catch { return fallback; }
  }

  function serverWorkTimeAuthority() {
    // Unknown is deliberately treated as protected until the server feature
    // explicitly reports that legacy mode is disabled.
    return window.TimeFlowWorkTimeSnapshotAuthority?.() !== false;
  }

  function accountLearningKey() {
    const cachedSession = parseJson(window.TimeFlowPlatform.storage.getItem("timeflow-platform-session-cache-v1"), {});
    const profile = parseJson(window.TimeFlowPlatform.storage.getItem("timeflow-profile-v1"), {});
    const email = String(platformAccountEmail || cachedSession?.session?.user?.email || profile?.email || "").trim().toLowerCase();
    const suffix = email || String(platformAccountId || cachedSession?.session?.user?.id || "").trim();
    return suffix ? `${LEARNING_KEY_PREFIX}${suffix}` : "";
  }

  function accountColleagueKey() {
    const cachedSession = parseJson(window.TimeFlowPlatform.storage.getItem("timeflow-platform-session-cache-v1"), {});
    const legacySession = parseJson(window.TimeFlowPlatform.storage.getItem("timeflow-session-v1"), {});
    const profile = parseJson(window.TimeFlowPlatform.storage.getItem("timeflow-profile-v1"), {});
    const email = String(cachedSession?.session?.user?.email || legacySession?.user?.email || profile?.email || platformAccountEmail || "").trim().toLowerCase();
    const suffix = email || String(legacySession?.userId || platformAccountId || cachedSession?.session?.user?.id || "").trim();
    return suffix ? `${COLLEAGUE_KEY_PREFIX}${suffix}` : "";
  }

  function syncKeys() {
    const keys = [...SYNC_KEYS, accountLearningKey(), accountColleagueKey()].filter(Boolean);
    return serverWorkTimeAuthority() ? keys.filter((key) => !WORK_TIME_SNAPSHOT_KEYS.has(key)) : keys;
  }

  function mergeColleagueRows(remoteRows, localRows) {
    const merged = new Map();
    const keyOf = (entry) => `${entry.date}|${String(entry.personName || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim()}`;
    (Array.isArray(remoteRows) ? remoteRows : []).filter((entry) => entry && typeof entry.date === "string" && typeof entry.personName === "string").forEach((entry) => merged.set(keyOf(entry), entry));
    (Array.isArray(localRows) ? localRows : []).filter((entry) => entry && typeof entry.date === "string" && typeof entry.personName === "string").forEach((entry) => merged.set(keyOf(entry), entry));
    return [...merged.values()].sort((a, b) => `${a.date}${a.start || ""}${a.personName}`.localeCompare(`${b.date}${b.start || ""}${b.personName}`));
  }

  async function migrateColleagueSchedule(cloud) {
    const key = accountColleagueKey();
    if (!key) return false;
    const base = baseSnapshot();
    if (base && Object.prototype.hasOwnProperty.call(base, key)) return false;
    const storage = window.TimeFlowPlatform.storage;
    const localRows = parseJson(storage.getItem(key), []);
    const remoteRows = Array.isArray(cloud.snapshot?.[key]) ? cloud.snapshot[key] : [];
    if (!localRows.length && !remoteRows.length) return false;
    const mergedRows = mergeColleagueRows(remoteRows, localRows);
    const localChanged = JSON.stringify(localRows) !== JSON.stringify(mergedRows);
    storage.setItem(key, JSON.stringify(mergedRows));
    if (localChanged) document.dispatchEvent(new CustomEvent("timeflow:sync-restored", { detail: { revision: cloud.revision, updatedAt: cloud.updatedAt } }));
    const nextSnapshot = { ...(cloud.snapshot || {}), [key]: mergedRows };
    if (JSON.stringify(mergedRows) !== JSON.stringify(remoteRows)) {
      try {
        const result = await requestSync("PUT", { snapshot: nextSnapshot, expectedRevision: Number(cloud.revision || 0) });
        saveMeta(result.revision, result.updatedAt);
        saveBaseSnapshot(nextSnapshot);
        document.dispatchEvent(new CustomEvent("timeflow:sync-restored", { detail: { revision: result.revision, updatedAt: result.updatedAt } }));
        renderStatus("synced", "Cloud-Sicherung ist aktuell", "Kollegenschichten wurden mit deinem privaten Konto verbunden.", "Synchron");
        markReady();
        return true;
      } catch (error) {
        if (error.status === 409) {
          const conflict = conflictLogic.handleSyncConflict({ storage, localSnapshot: collectSnapshot(), baseSnapshot: baseSnapshot(), response: error.result || {} });
          showConflict({ data: conflict.serverSnapshot, revision: conflict.serverRevision, updatedAt: conflict.updatedAt });
          renderStatus("error", "Änderungskonflikt erkannt", "Die Kollegenschichten wurden auf einem anderen Gerät geändert. Bitte gleiche die Stände ab.", "Konflikt");
          markReady();
          return true;
        }
        throw error;
      }
    }
    saveBaseSnapshot(nextSnapshot);
    return false;
  }

  function collectSnapshot() {
    const snapshot = {};
    syncKeys().forEach((key) => {
      const value = parseJson(window.TimeFlowPlatform.storage.getItem(key));
      if (value && typeof value === "object") snapshot[key] = value;
    });
    return snapshot;
  }

  function applySnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object") return;
    syncKeys().forEach((key) => {
      const value = snapshot[key];
      if (value && typeof value === "object") window.TimeFlowPlatform.storage.setItem(key, JSON.stringify(value));
      else window.TimeFlowPlatform.storage.removeItem(key);
    });
  }

  function stableSnapshotValue(value) {
    if (Array.isArray(value)) return value.map(stableSnapshotValue);
    if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableSnapshotValue(value[key])]));
    return value;
  }
  function sameSnapshotValue(left, right) { return JSON.stringify(stableSnapshotValue(left)) === JSON.stringify(stableSnapshotValue(right)); }
  function mergePersonalScheduleByDate(remoteRows, localRows, baseRows) {
    if (![remoteRows, localRows, baseRows].every(Array.isArray)) return localRows;
    const byDate = (rows) => new Map(rows.filter((entry) => entry && typeof entry.date === "string" && !entry.isColleague).map((entry) => [entry.date, entry]));
    const remote = byDate(remoteRows), local = byDate(localRows), base = byDate(baseRows);
    const merged = new Map(remoteRows.filter((entry) => entry && (entry.isColleague || typeof entry.date !== "string")).map((entry, index) => [`remote-extra-${index}`, entry]));
    for (const date of new Set([...remote.keys(), ...local.keys(), ...base.keys()])) {
      const localEntry = local.get(date), baseEntry = base.get(date);
      const localChanged = !sameSnapshotValue(localEntry, baseEntry);
      const selected = localChanged ? localEntry : remote.get(date);
      if (selected) merged.set(date, selected);
    }
    return [...merged.values()].sort((a, b) => `${a.date || ""}${a.start || ""}`.localeCompare(`${b.date || ""}${b.start || ""}`));
  }
  async function uploadUnsyncedLocalChanges(cloud) {
    const base = baseSnapshot();
    if (!base) return false;
    const local = collectSnapshot();
    if (sameSnapshotValue(local, base)) return false;
    const remote = cloud.snapshot || {};
    const merged = conflictLogic.mergeChangedKeys(remote, local, base);
    const scheduleKey = "timeflow-private-schedule-v1";
    const localScheduleChanged = !sameSnapshotValue(local[scheduleKey], base[scheduleKey]);
    if (localScheduleChanged) merged[scheduleKey] = mergePersonalScheduleByDate(remote[scheduleKey] || [], local[scheduleKey] || [], base[scheduleKey] || []);
    if (sameSnapshotValue(merged, remote)) return false;
    try {
      const result = await requestSync("PUT", { snapshot: merged, expectedRevision: Number(cloud.revision || 0) });
      applySnapshot(merged);
      saveMeta(result.revision, result.updatedAt);
      saveBaseSnapshot(merged);
      document.dispatchEvent(new CustomEvent("timeflow:sync-restored", { detail: { revision: result.revision, updatedAt: result.updatedAt } }));
      renderStatus("synced", "Cloud-Sicherung ist aktuell", "Deine Dienstplanänderungen wurden sicher mit deinen Geräten abgeglichen.", "Synchron");
      markReady();
      return true;
    } catch (error) {
      if (error.status === 409) {
        const conflict = conflictLogic.handleSyncConflict({ storage: window.TimeFlowPlatform.storage, localSnapshot: local, baseSnapshot: base, response: error.result || {} });
        showConflict({ data: conflict.serverSnapshot, revision: conflict.serverRevision, updatedAt: conflict.updatedAt });
        renderStatus("error", "Änderungskonflikt erkannt", "Der Dienstplan wurde auf einem anderen Gerät geändert. Deine lokale Änderung bleibt erhalten.", "Abgleich nötig");
        markReady();
        return true;
      }
      throw error;
    }
  }

  function accountScope() { return platformAccountId || platformAccountEmail || "unresolved"; }
  function storedMeta() { return parseJson(window.TimeFlowPlatform.storage.getItem(META_KEY), {}); }
  function meta() {
    const saved = storedMeta();
    return saved?.account === accountScope() ? saved : {};
  }

  function hasDifferentLocalAccount() {
    const saved = storedMeta();
    if (saved?.account && saved.account !== accountScope()) return true;
    const profile = parseJson(window.TimeFlowPlatform.storage.getItem("timeflow-profile-v1"), {});
    const profileEmail = String(profile?.email || "").trim().toLowerCase();
    return Boolean(platformAccountEmail && profileEmail && profileEmail !== platformAccountEmail);
  }

  function saveMeta(revision, updatedAt) {
    window.TimeFlowPlatform.storage.setItem(META_KEY, JSON.stringify({ account: accountScope(), revision, updatedAt, syncedAt: new Date().toISOString() }));
  }

  function baseSnapshot() {
    const saved = parseJson(window.TimeFlowPlatform.storage.getItem(BASE_KEY), {});
    return saved?.account === accountScope() && saved.snapshot && typeof saved.snapshot === "object" ? saved.snapshot : null;
  }
  function saveBaseSnapshot(snapshot) {
    window.TimeFlowPlatform.storage.setItem(BASE_KEY, JSON.stringify({ account: accountScope(), snapshot }));
  }

  function formatTimestamp(value) {
    if (!value) return "Noch nicht synchronisiert";
    return `Zuletzt ${new Date(value).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} Uhr`;
  }

  function renderStatus(kind, heading, copy, label) {
    card.classList.remove("is-synced", "is-syncing", "is-local", "is-error");
    card.classList.add(`is-${kind}`);
    title.textContent = heading;
    description.textContent = copy;
    state.querySelector("b").textContent = label;
    const currentMeta = meta();
    timestamp.textContent = formatTimestamp(currentMeta.syncedAt);
    syncButton.disabled = !platformSession || syncing || !navigator.onLine;
  }

  function notify(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 3300);
  }
  const conflictLogic = window.TimeFlowSyncConflict;
  function clearConflict() { conflictLogic.clearSyncConflict(window.TimeFlowPlatform.storage); card.querySelector("[data-sync-conflict]")?.remove(); }
  function showConflict(conflict) {
    card.querySelector("[data-sync-conflict]")?.remove();
    card.insertAdjacentHTML("beforeend", `<div data-sync-conflict><p>Deine Daten wurden auf einem anderen Gerät geändert. Beim Zusammenführen bleiben Änderungen an anderen Daten erhalten.</p><button type="button" data-sync-server>Serverstand laden</button><button type="button" data-sync-local>Meine Änderungen übernehmen</button></div>`);
    const box = card.querySelector("[data-sync-conflict]");
    box.querySelector("[data-sync-server]").addEventListener("click", async () => { try { await conflictLogic.loadServerConflictVersion({ storage: window.TimeFlowPlatform.storage, applyLocalSnapshot: applySnapshot, saveRevision: saveMeta, saveBaseSnapshot }); card.querySelector("[data-sync-conflict]")?.remove(); document.dispatchEvent(new CustomEvent("timeflow:sync-restored")); renderStatus("synced", "Cloud-Sicherung ist aktuell", "Der aktuelle Serverstand wurde geladen.", "Synchron"); } catch { notify("Der Serverstand konnte lokal nicht übernommen werden."); } });
    box.querySelector("[data-sync-local]").addEventListener("click", async () => { try { const outcome = await conflictLogic.reapplyLocalConflictVersion({ storage: window.TimeFlowPlatform.storage, requestSync: (payload) => requestSync("PUT", payload), applyLocalSnapshot: applySnapshot, saveRevision: saveMeta, saveBaseSnapshot }); if (outcome.state === "saved") { card.querySelector("[data-sync-conflict]")?.remove(); document.dispatchEvent(new CustomEvent("timeflow:sync-restored")); renderStatus("synced", "Cloud-Sicherung ist aktuell", "Deine Änderungen wurden mit dem Serverstand zusammengeführt.", "Synchron"); } else if (outcome.state === "conflict") showConflict({ data: outcome.conflict.serverSnapshot, revision: outcome.conflict.serverRevision, updatedAt: outcome.conflict.updatedAt }); } catch { notify("Die lokale Änderung konnte nicht erneut gespeichert werden."); } });
  }

  async function requestSync(method, body) {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const response = await fetch(new URL("api/sync", document.baseURI), {
      method,
      cache: "no-store",
      headers: body ? { "Content-Type": "application/json", Accept: "application/json", "X-TimeFlow-Time-Zone": timeZone } : { Accept: "application/json", "X-TimeFlow-Time-Zone": timeZone },
      body: body ? JSON.stringify({ ...body, timeZone }) : undefined
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { const error = new Error(result.error || `sync_${response.status}`); error.status = response.status; error.result = result; throw error; }
    return result;
  }

  async function upload(showConfirmation = false) {
    if (!platformSession || syncing) return;
    syncing = true;
    renderStatus("syncing", "Daten werden synchronisiert", "Dein Profil und deine Einstellungen werden sicher gespeichert.", "Läuft");
    try {
      const snapshot = collectSnapshot();
      const result = await requestSync("PUT", { snapshot, expectedRevision: Number(meta().revision || 0) });
      saveMeta(result.revision, result.updatedAt);
      saveBaseSnapshot(snapshot);
      window.TimeFlowPlatform.storage.removeItem(BACKUP_RESTORE_KEY);
      renderStatus("synced", "Cloud-Sicherung ist aktuell", "Profil und Einstellungen sind mit deinem privaten Konto verbunden.", "Synchron");
      if (showConfirmation) notify("Deine TimeFlow-Daten wurden synchronisiert.");
    } catch (error) {
      if (error.status === 409) {
        const conflict = conflictLogic.handleSyncConflict({ storage: window.TimeFlowPlatform.storage, localSnapshot: collectSnapshot(), baseSnapshot: baseSnapshot(), response: error.result || {} });
        showConflict({ data: conflict.serverSnapshot, revision: conflict.serverRevision, updatedAt: conflict.updatedAt });
        renderStatus("error", "Änderungskonflikt erkannt", "Deine Daten wurden auf einem anderen Gerät geändert. Deine lokale Änderung bleibt erhalten.", "Konflikt");
        notify("Deine Daten wurden auf einem anderen Gerät geändert.");
        return;
      }
      renderStatus("error", "Synchronisierung pausiert", "Deine lokalen Daten bleiben erhalten. Versuche es erneut, sobald die Verbindung steht.", "Lokal sicher");
      if (showConfirmation) notify("Die Cloud-Synchronisierung ist derzeit nicht erreichbar.");
    } finally {
      syncing = false;
      syncButton.disabled = !platformSession || !navigator.onLine;
      if (queuedUpload && platformSession && navigator.onLine && ready) window.setTimeout(flushQueuedUpload, 0);
    }
  }

  async function initialSync() {
    if (!platformSession || syncing) return;
    syncing = true;
    renderStatus("syncing", "Cloud-Daten werden abgeglichen", "TimeFlow vergleicht diesen Browser mit deinem privaten Konto.", "Abgleich");
    try {
      const cloud = await requestSync("GET");
      const persistedConflict = conflictLogic.restorePersistedSyncConflict(window.TimeFlowPlatform.storage);
      const refreshedConflict = persistedConflict ? conflictLogic.refreshPersistedSyncConflict(window.TimeFlowPlatform.storage, {
        data: cloud.snapshot || {}, revision: cloud.revision, updatedAt: cloud.updatedAt
      }) : null;
      const localMeta = meta();
      if (hasDifferentLocalAccount()) {
        const conflict = refreshedConflict || conflictLogic.handleSyncConflict({ storage: window.TimeFlowPlatform.storage, localSnapshot: collectSnapshot(), baseSnapshot: null, response: { data: cloud.snapshot || {}, revision: cloud.revision, updatedAt: cloud.updatedAt } });
        showConflict({ data: conflict.serverSnapshot, revision: conflict.serverRevision, updatedAt: conflict.updatedAt });
        renderStatus("error", "Konto-Wechsel prüfen", "Die lokalen Daten gehören möglicherweise zu einem anderen Konto. Wähle, welche Daten für dieses Konto gelten sollen.", "Auswahl nötig");
        markReady();
        return;
      }
      if (persistedConflict) {
        showConflict({ data: refreshedConflict.serverSnapshot, revision: refreshedConflict.serverRevision, updatedAt: refreshedConflict.updatedAt });
        renderStatus("error", "Änderungskonflikt erkannt", "Deine Daten wurden auf einem anderen Gerät geändert. Deine lokale Änderung bleibt erhalten.", "Konflikt");
        markReady();
        return;
      }
      if (!cloud.snapshot) {
        syncing = false;
        await upload(false);
        markReady();
        return;
      }
      if (window.TimeFlowPlatform.storage.getItem(BACKUP_RESTORE_KEY)) {
        const conflict = conflictLogic.handleSyncConflict({ storage: window.TimeFlowPlatform.storage, localSnapshot: collectSnapshot(), baseSnapshot: baseSnapshot(), response: { data: cloud.snapshot, revision: cloud.revision, updatedAt: cloud.updatedAt } });
        window.TimeFlowPlatform.storage.removeItem(BACKUP_RESTORE_KEY);
        showConflict({ data: conflict.serverSnapshot, revision: conflict.serverRevision, updatedAt: conflict.updatedAt });
        renderStatus("error", "Datensicherung abgleichen", "Wähle, ob die Sicherung oder der aktuelle Cloud-Stand gelten soll.", "Abgleich nötig");
        markReady();
        return;
      }
      if (await migrateColleagueSchedule(cloud)) return;
      if (await uploadUnsyncedLocalChanges(cloud)) return;
      if (!localMeta.revision || Number(cloud.revision) > Number(localMeta.revision)) {
        applySnapshot(cloud.snapshot);
        saveMeta(cloud.revision, cloud.updatedAt);
        saveBaseSnapshot(cloud.snapshot);
        // Refresh the mounted interface in place. A full reload made a normal
        // PWA start look like a second launch after the cloud check.
        document.dispatchEvent(new CustomEvent("timeflow:sync-restored", { detail: { revision: cloud.revision, updatedAt: cloud.updatedAt } }));
        renderStatus("synced", "Cloud-Sicherung ist aktuell", "Profil und Einstellungen sind mit deinem privaten Konto verbunden.", "Synchron");
        notify("Deine Cloud-Daten wurden auf diesem Gerät wiederhergestellt.");
        markReady();
        return;
      }
      saveMeta(cloud.revision, cloud.updatedAt);
      if (Number(cloud.revision) === Number(localMeta.revision)) {
        const base = baseSnapshot();
        if (base && sameSnapshotValue(collectSnapshot(), base) && !sameSnapshotValue(base, cloud.snapshot)) {
          applySnapshot(cloud.snapshot);
          document.dispatchEvent(new CustomEvent("timeflow:sync-restored", { detail: { revision: cloud.revision, updatedAt: cloud.updatedAt } }));
        }
        saveBaseSnapshot(cloud.snapshot);
      }
      renderStatus("synced", "Cloud-Sicherung ist aktuell", "Profil und Einstellungen sind mit deinem privaten Konto verbunden.", "Synchron");
      markReady();
    } catch {
      const staleConflictBox = card.querySelector("[data-sync-conflict]");
      if (staleConflictBox) {
        staleConflictBox.querySelectorAll("button").forEach((button) => { button.disabled = true; });
        const explanation = staleConflictBox.querySelector("p");
        if (explanation) explanation.textContent = "Der aktuelle Cloud-Stand konnte nicht geladen werden. Verbinde dich erneut, bevor du eine Version auswählst.";
      }
      renderStatus("error", "Nur lokal verfügbar", "Die Cloud ist gerade nicht erreichbar; deine Daten bleiben auf diesem Gerät erhalten.", "Offline");
      markReady();
    } finally {
      syncing = false;
      syncButton.disabled = !platformSession || !navigator.onLine;
      if (queuedUpload && platformSession && navigator.onLine && ready) window.setTimeout(flushQueuedUpload, 0);
    }
  }

  function scheduleUpload() {
    if (!platformSession) return;
    queuedUpload = true;
    window.clearTimeout(scheduleUpload.timer);
    scheduleUpload.timer = window.setTimeout(flushQueuedUpload, 900);
  }
  function flushQueuedUpload() {
    if (!queuedUpload || !platformSession || !navigator.onLine || !ready || syncing) return;
    queuedUpload = false;
    void upload(false);
  }

  function scheduleWorkdayUpload() {
    if (serverWorkTimeAuthority()) return;
    const current = window.TimeFlowPlatform.storage.getItem("timeflow-workday-v2") || "";
    // The running clock emits a UI update every second. Only persist when the
    // stored workday itself changed (clock-in/out or pause), never on timer ticks.
    if (current === queuedWorkdaySnapshot) return;
    queuedWorkdaySnapshot = current;
    scheduleUpload();
  }

  function markReady() {
    ready = true;
    document.dispatchEvent(new CustomEvent("timeflow:sync-ready", { detail: { platformSession } }));
  }

  document.addEventListener("timeflow:session-ready", (event) => {
    platformSession = event.detail?.source === "platform";
    if (platformSession) {
      platformAccountId = String(event.detail?.user?.id || "").trim();
      platformAccountEmail = String(event.detail?.user?.email || "").trim().toLowerCase();
      syncButton.disabled = false;
      initialSync();
    } else {
      markReady();
      renderStatus("local", "Demo-Daten bleiben lokal", "Cloud-Synchronisierung ist ausschließlich in der geschützten privaten Site aktiv.", "Lokal");
    }
  });
  document.addEventListener("timeflow:settings-updated", scheduleUpload);
  document.addEventListener("timeflow:profile-updated", scheduleUpload);
  document.addEventListener("timeflow:private-account-updated", scheduleUpload);
  document.addEventListener("timeflow:private-schedule-updated", scheduleUpload);
  document.addEventListener("timeflow:workday-updated", scheduleWorkdayUpload);
  document.addEventListener("timeflow:work-time-mode", (event) => {
    if (event.detail?.mode === "disabled" && platformSession) initialSync();
  });
  syncButton.addEventListener("click", () => upload(true));
  window.addEventListener("online", () => platformSession ? initialSync() : undefined);
  window.addEventListener("offline", () => renderStatus("error", "Offline – lokale Daten aktiv", "Änderungen bleiben auf diesem Gerät und können später synchronisiert werden.", "Offline"));

});

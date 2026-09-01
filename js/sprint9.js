"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const SYNC_KEYS = ["timeflow-profile-v1", "timeflow-settings-v1", "timeflow-profile-preferences-v1", "timeflow-private-schedule-v1", "timeflow-private-schedule-learning-v1", "timeflow-private-account-v1", "timeflow-workday-v2", "timeflow-notifications-v1", "timeflow-quick-actions-v1"];
  const META_KEY = "timeflow-sync-meta-v1";
  const settingsLayout = document.querySelector("#settingsPage .settings-layout");
  if (!settingsLayout) return;

  settingsLayout.insertAdjacentHTML("beforeend", `
    <section class="cloud-sync-card" aria-labelledby="cloudSyncTitle">
      <span class="cloud-sync-icon"><i class="fa-solid fa-cloud-arrow-up"></i></span>
      <div class="cloud-sync-copy"><small>Sprint 9 · Datensynchronisierung</small><strong id="cloudSyncTitle">Synchronisierung wird vorbereitet</strong><p id="cloudSyncDescription">Profildaten und Einstellungen werden geprüft.</p></div>
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
  let ready = false;
  let syncing = false;

  function parseJson(value, fallback = null) {
    try { return JSON.parse(value) ?? fallback; } catch { return fallback; }
  }

  function collectSnapshot() {
    const snapshot = {};
    SYNC_KEYS.forEach((key) => {
      const value = parseJson(window.TimeFlowPlatform.storage.getItem(key));
      if (value && typeof value === "object") snapshot[key] = value;
    });
    return snapshot;
  }

  function applySnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object") return;
    SYNC_KEYS.forEach((key) => {
      const value = snapshot[key];
      if (value && typeof value === "object") window.TimeFlowPlatform.storage.setItem(key, JSON.stringify(value));
      else window.TimeFlowPlatform.storage.removeItem(key);
    });
  }

  function meta() {
    return parseJson(window.TimeFlowPlatform.storage.getItem(META_KEY), {});
  }

  function saveMeta(revision, updatedAt) {
    window.TimeFlowPlatform.storage.setItem(META_KEY, JSON.stringify({ revision, updatedAt, syncedAt: new Date().toISOString() }));
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

  async function requestSync(method, body) {
    const response = await fetch(new URL("api/sync", document.baseURI), {
      method,
      cache: "no-store",
      headers: body ? { "Content-Type": "application/json", Accept: "application/json" } : { Accept: "application/json" },
      body: body ? JSON.stringify(body) : undefined
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `sync_${response.status}`);
    return result;
  }

  async function upload(showConfirmation = false) {
    if (!platformSession || syncing) return;
    syncing = true;
    renderStatus("syncing", "Daten werden synchronisiert", "Dein Profil und deine Einstellungen werden sicher gespeichert.", "Läuft");
    try {
      const result = await requestSync("PUT", { snapshot: collectSnapshot() });
      saveMeta(result.revision, result.updatedAt);
      renderStatus("synced", "Cloud-Sicherung ist aktuell", "Profil und Einstellungen sind mit deinem privaten Konto verbunden.", "Synchron");
      if (showConfirmation) notify("Deine TimeFlow-Daten wurden synchronisiert.");
    } catch {
      renderStatus("error", "Synchronisierung pausiert", "Deine lokalen Daten bleiben erhalten. Versuche es erneut, sobald die Verbindung steht.", "Lokal sicher");
      if (showConfirmation) notify("Die Cloud-Synchronisierung ist derzeit nicht erreichbar.");
    } finally {
      syncing = false;
      syncButton.disabled = !platformSession || !navigator.onLine;
    }
  }

  async function initialSync() {
    if (!platformSession || syncing) return;
    syncing = true;
    renderStatus("syncing", "Cloud-Daten werden abgeglichen", "TimeFlow vergleicht diesen Browser mit deinem privaten Konto.", "Abgleich");
    try {
      const cloud = await requestSync("GET");
      const localMeta = meta();
      if (!cloud.snapshot) {
        syncing = false;
        await upload(false);
        markReady();
        return;
      }
      if (!localMeta.revision || Number(cloud.revision) > Number(localMeta.revision)) {
        applySnapshot(cloud.snapshot);
        saveMeta(cloud.revision, cloud.updatedAt);
        window.TimeFlowPlatform.session.setItem("timeflow-sync-restored", "1");
        window.location.reload();
        return;
      }
      saveMeta(cloud.revision, cloud.updatedAt);
      renderStatus("synced", "Cloud-Sicherung ist aktuell", "Profil und Einstellungen sind mit deinem privaten Konto verbunden.", "Synchron");
      markReady();
    } catch {
      renderStatus("error", "Nur lokal verfügbar", "Die Cloud ist gerade nicht erreichbar; deine Daten bleiben auf diesem Gerät erhalten.", "Offline");
      markReady();
    } finally {
      syncing = false;
      syncButton.disabled = !platformSession || !navigator.onLine;
    }
  }

  function scheduleUpload() {
    if (!platformSession || !ready) return;
    window.clearTimeout(scheduleUpload.timer);
    scheduleUpload.timer = window.setTimeout(() => upload(false), 900);
  }

  function markReady() {
    ready = true;
    document.dispatchEvent(new CustomEvent("timeflow:sync-ready", { detail: { platformSession } }));
  }

  document.addEventListener("timeflow:session-ready", (event) => {
    platformSession = event.detail?.source === "platform";
    if (platformSession) {
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
  document.addEventListener("timeflow:workday-updated", scheduleUpload);
  syncButton.addEventListener("click", () => upload(true));
  window.addEventListener("online", () => platformSession ? initialSync() : undefined);
  window.addEventListener("offline", () => renderStatus("error", "Offline – lokale Daten aktiv", "Änderungen bleiben auf diesem Gerät und können später synchronisiert werden.", "Offline"));

  if (window.TimeFlowPlatform.session.getItem("timeflow-sync-restored") === "1") {
    window.TimeFlowPlatform.session.removeItem("timeflow-sync-restored");
    notify("Deine Cloud-Daten wurden auf diesem Gerät wiederhergestellt.");
  }
});

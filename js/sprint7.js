"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "timeflow-notifications-v1";
  const READ_KEY = "timeflow-notification-read-v1";
  const SETTINGS_KEY = "timeflow-settings-v1";
  const notificationButton = document.querySelector('[data-action="notifications"]');
  const notificationBadge = notificationButton?.querySelector(".notification-badge");
  if (!notificationButton || !notificationBadge) return;
  notificationBadge.hidden = true;
  notificationBadge.textContent = "0";
  notificationButton.setAttribute("aria-label", "Keine ungelesenen Benachrichtigungen");

  document.body.insertAdjacentHTML("beforeend", `
    <dialog class="notification-center" id="notificationCenter" aria-labelledby="notificationCenterTitle">
      <section>
        <header class="notification-center-header">
          <span class="notification-center-icon"><i class="fa-regular fa-bell"></i></span>
          <div><small><i class="fa-solid fa-sparkles"></i> Übersicht</small><h2 id="notificationCenterTitle">Benachrichtigungen</h2><p>Alles Wichtige aus deinem Arbeitstag an einem Ort.</p></div>
          <button type="button" data-close-notifications aria-label="Benachrichtigungen schließen"><i class="fa-solid fa-xmark"></i></button>
        </header>
        <div class="notification-permission" id="notificationPermissionCard">
          <span><i class="fa-solid fa-mobile-screen-button"></i></span>
          <div><strong>Benachrichtigungen auf diesem Gerät</strong><small id="notificationPermissionText">Status wird geprüft …</small></div>
          <button type="button" data-enable-notifications>Aktivieren</button>
        </div>
        <div class="notification-toolbar">
          <strong id="notificationUnreadLabel">Aktuell</strong>
          <div class="notification-toolbar-actions">
            <button type="button" data-test-notification><i class="fa-solid fa-paper-plane"></i> Testbenachrichtigung</button>
            <button type="button" data-mark-notifications-read><i class="fa-regular fa-circle-check"></i> Alle gelesen</button>
          </div>
        </div>
        <div class="notification-filters" role="group" aria-label="Mitteilungen filtern"><button type="button" data-notification-filter="all" aria-pressed="true">Alle</button><button type="button" data-notification-filter="worktime" aria-pressed="false">Arbeitszeit</button><button type="button" data-notification-filter="schedule" aria-pressed="false">Dienstplan</button><button type="button" data-notification-filter="system" aria-pressed="false">System</button></div>
        <div class="notification-list" id="notificationList"></div>
      </section>
    </dialog>
    <dialog class="notification-detail" id="notificationDetail" aria-labelledby="notificationDetailTitle">
      <section>
        <header><span class="notification-center-icon"><i class="fa-regular fa-bell"></i></span><div><small id="notificationDetailKind">Mitteilung</small><h2 id="notificationDetailTitle"></h2><p id="notificationDetailTime"></p></div><button type="button" data-close-notification-detail aria-label="Mitteilung schließen"><i class="fa-solid fa-xmark"></i></button></header>
        <div class="notification-detail-content"><p id="notificationDetailBody"></p><div id="notificationDetailList" hidden></div></div>
        <footer><button type="button" data-open-notification-action hidden></button></footer>
      </section>
    </dialog>
  `);

  const center = document.getElementById("notificationCenter");
  const list = document.getElementById("notificationList");
  const unreadLabel = document.getElementById("notificationUnreadLabel");
  const permissionText = document.getElementById("notificationPermissionText");
  const permissionCard = document.getElementById("notificationPermissionCard");
  const detailDialog = document.getElementById("notificationDetail");
  const detailAction = detailDialog.querySelector("[data-open-notification-action]");
  let activeFilter = "all";
  let entries = loadEntries();
  let serverPushReady = false;

  function loadReadReceipts() {
    try { return JSON.parse(window.TimeFlowPlatform.storage.getItem(READ_KEY)) || {}; } catch { return {}; }
  }

  function rememberRead(ids) {
    const receipts = loadReadReceipts();
    ids.forEach((id) => { if (id) receipts[id] = new Date().toISOString(); });
    const recent = Object.entries(receipts).sort((a, b) => String(b[1]).localeCompare(String(a[1]))).slice(0, 500);
    window.TimeFlowPlatform.storage.setItem(READ_KEY, JSON.stringify(Object.fromEntries(recent)));
  }

  function seedEntries() {
    return [];
  }

  function loadEntries() {
    try {
      const stored = JSON.parse(window.TimeFlowPlatform.storage.getItem(STORAGE_KEY));
      return Array.isArray(stored) ? stored : seedEntries();
    } catch {
      return seedEntries();
    }
  }

  function saveEntries() {
    window.TimeFlowPlatform.storage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 50)));
  }

  function notificationPreferences() {
    try {
      const stored = JSON.parse(window.TimeFlowPlatform.storage.getItem(SETTINGS_KEY));
      return { deviceNotifications: true, shiftReminders: true, forgottenClockOut: true, chatAlerts: true, approvalAlerts: true, systemAlerts: true, ...(stored && typeof stored === "object" ? stored : {}) };
    } catch {
      return { deviceNotifications: true, shiftReminders: true, forgottenClockOut: true, chatAlerts: true, approvalAlerts: true, systemAlerts: true };
    }
  }

  let pushPreferenceSyncRunning = false;
  async function syncPushPreferences() {
    if (pushPreferenceSyncRunning || !navigator.onLine) return;
    pushPreferenceSyncRunning = true;
    try {
      await fetch(new URL("api/notifications/push-preferences", document.baseURI), {
        method: "PUT", cache: "no-store", headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: notificationPreferences() })
      });
    } catch (_error) { /* lokale Einstellungen bleiben erhalten und werden beim nächsten Start erneut gesendet */ }
    finally { pushPreferenceSyncRunning = false; }
  }

  async function loadServerPushPreferences() {
    try {
      const response = await fetch(new URL("api/notifications/push-preferences", document.baseURI), { cache: "no-store", headers: { Accept: "application/json" } });
      if (!response.ok) return syncPushPreferences();
      const { preferences: remote } = await response.json();
      if (!remote || !Object.keys(remote).length) return syncPushPreferences();
      const local = notificationPreferences();
      const merged = { ...local, ...remote };
      window.TimeFlowPlatform.storage.setItem(SETTINGS_KEY, JSON.stringify(merged));
      document.querySelectorAll('#settingsPage [data-setting][type="checkbox"]').forEach((control) => {
        if (typeof merged[control.dataset.setting] === "boolean") control.checked = merged[control.dataset.setting];
      });
    } catch (_error) { /* bei Verbindungsproblemen bleiben die Geräteeinstellungen maßgeblich */ }
  }

  function preferenceKey(category) {
    return ({ schedule: "shiftReminders", worktime: "forgottenClockOut", chat: "chatAlerts", approval: "approvalAlerts", system: "systemAlerts", success: "systemAlerts" })[category] || "systemAlerts";
  }

  function deviceNotificationAllowed(category) {
    const preferences = notificationPreferences();
    return preferences.deviceNotifications !== false && preferences[preferenceKey(category)] !== false;
  }

  function relativeTime(value) {
    const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
    if (minutes < 1) return "Gerade eben";
    if (minutes < 60) return `Vor ${minutes} Min.`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `Vor ${hours} Std.`;
    return new Date(value).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  }

  function iconFor(type) {
    return ({ approval: "fa-clipboard-check", schedule: "fa-calendar-check", chat: "fa-comments", success: "fa-circle-check", system: "fa-bell" })[type] || "fa-bell";
  }

  function unreadCount() {
    return entries.filter((entry) => !entry.read).length;
  }

  function updateBadge() {
    const count = unreadCount();
    notificationBadge.textContent = String(count);
    notificationBadge.hidden = count === 0;
    notificationButton.setAttribute("aria-label", count ? `${count} ungelesene Benachrichtigungen` : "Keine ungelesenen Benachrichtigungen");
    unreadLabel.textContent = count ? `${count} ungelesen` : "Alles gelesen";
  }

  function renderEntries() {
    list.replaceChildren();
    const visibleEntries = activeFilter === "all" ? entries : entries.filter((entry) => (entry.category || entry.type) === activeFilter);
    if (!visibleEntries.length) {
      const empty = document.createElement("div");
      empty.className = "notification-empty";
      empty.innerHTML = '<i class="fa-regular fa-bell-slash"></i><strong>Hier ist alles ruhig</strong><p>Neue Hinweise erscheinen automatisch an dieser Stelle.</p>';
      list.append(empty);
    } else {
      visibleEntries.forEach((entry) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = `notification-item ${entry.type}${entry.read ? " is-read" : ""}`;
        item.dataset.notificationId = entry.id;
        const icon = document.createElement("span");
        icon.className = "notification-item-icon";
        icon.innerHTML = `<i class="fa-solid ${iconFor(entry.type)}"></i>`;
        const content = document.createElement("span");
        content.className = "notification-item-copy";
        const title = document.createElement("strong");
        title.textContent = entry.title;
        const body = document.createElement("small");
        body.textContent = entry.body;
        const time = document.createElement("em");
        time.textContent = relativeTime(entry.createdAt);
        content.append(title, body, time);
        const state = document.createElement("i");
        state.className = entry.read ? "fa-solid fa-chevron-right" : "notification-unread-dot";
        item.append(icon, content, state);
        list.append(item);
      });
    }
    updateBadge();
  }

  function notificationSupport() {
    return "Notification" in window && "serviceWorker" in navigator;
  }

  function pushSupport() {
    return notificationSupport() && "PushManager" in window;
  }

  function decodeVapidKey(value) {
    const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(padded); const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

  async function registerPushDevice() {
    if (!pushSupport() || Notification.permission !== "granted") return false;
    try {
      const configResponse = await fetch(new URL("api/notifications/push-config", document.baseURI), { cache: "no-store", headers: { Accept: "application/json" } });
      if (!configResponse.ok) return false;
      const config = await configResponse.json();
      if (!config.publicKey) return false;
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeVapidKey(config.publicKey) });
      const response = await fetch(new URL("api/notifications/push-subscription", document.baseURI), { method: "POST", cache: "no-store", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify(subscription.toJSON()) });
      serverPushReady = response.ok;
      renderPermission();
      return serverPushReady;
    } catch (_error) {
      return false;
    }
  }

  function renderPermission() {
    permissionCard.classList.remove("is-granted", "is-denied", "is-unsupported");
    const button = permissionCard.querySelector("[data-enable-notifications]");
    if (!notificationSupport()) {
      permissionCard.classList.add("is-unsupported");
      permissionText.textContent = "Dieser Browser unterstützt keine PWA-Benachrichtigungen.";
      button.textContent = "Nicht verfügbar";
      button.disabled = true;
      return;
    }
    button.disabled = false;
    if (Notification.permission === "granted") {
      permissionCard.classList.add("is-granted");
      permissionText.textContent = serverPushReady ? "Gerät beim Push-Dienst angemeldet. Eine Zustellung ist damit noch nicht bestätigt." : "Gerätefreigabe aktiv. Serververbindung wird geprüft.";
      button.textContent = serverPushReady ? "Aktiv" : "Verbinden";
      button.disabled = serverPushReady;
    } else if (Notification.permission === "denied") {
      permissionCard.classList.add("is-denied");
      permissionText.textContent = "Blockiert – bitte in den Browser-Einstellungen freigeben.";
      button.textContent = "Blockiert";
      button.disabled = true;
    } else {
      permissionText.textContent = "Noch nicht aktiviert. Du entscheidest mit einem Klick.";
      button.textContent = "Aktivieren";
    }
    document.dispatchEvent(new CustomEvent("timeflow:notification-permission", { detail: { permission: Notification.permission } }));
  }

  function toast(message) {
    const toastElement = document.getElementById("toast");
    if (!toastElement) return;
    toastElement.textContent = message;
    toastElement.classList.add("is-visible");
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => toastElement.classList.remove("is-visible"), 3300);
  }

  async function requestPermission() {
    if (!notificationSupport()) {
      toast("PWA-Benachrichtigungen werden in diesem Browser nicht unterstützt.");
      return false;
    }
    const permission = await Notification.requestPermission();
    renderPermission();
    if (permission === "granted") {
      const registered = await registerPushDevice();
      toast(registered ? "Benachrichtigungen wurden aktiviert." : "Gerätefreigabe ist aktiv. Der Push-Dienst ist noch nicht erreichbar.");
      return registered;
    }
    toast(permission === "denied" ? "Benachrichtigungen sind im Browser blockiert." : "Benachrichtigungen wurden noch nicht aktiviert.");
    return false;
  }

  async function showDeviceNotification(title, body, data = {}) {
    if (!deviceNotificationAllowed(data.category || "system")) return false;
    if (!notificationSupport() || Notification.permission !== "granted") return false;
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        icon: "assets/icons/timeflow-phoenix-icon-192.png",
        badge: "assets/icons/timeflow-phoenix-icon-192.png",
        tag: data.tag || `timeflow-${Date.now()}`,
        renotify: true,
        data: { url: "./", ...data }
      });
      return true;
    } catch {
      return false;
    }
  }

  function addEntry(detail = {}) {
    const existing = detail.id ? entries.find((item) => item.id === detail.id) : null;
    if (existing) {
      existing.type = detail.type || existing.type; existing.category = detail.category || existing.category; existing.title = detail.title || existing.title; existing.body = detail.body || existing.body; existing.action = detail.action || existing.action; existing.details = normalizeDetails(detail.details ?? detail.changes ?? existing.details);
      saveEntries(); renderEntries(); return;
    }
    const entry = {
      id: detail.id || window.crypto?.randomUUID?.() || `notification-${Date.now()}`,
      type: detail.type || "system",
      category: detail.category || detail.type || "system",
      title: detail.title || "TimeFlow",
      body: detail.body || "Es gibt eine neue Information für dich.",
      createdAt: new Date().toISOString(),
      read: false,
      action: detail.action || "",
      details: normalizeDetails(detail.details ?? detail.changes)
    };
    entries.unshift(entry);
    saveEntries();
    renderEntries();
    if (detail.device !== false) showDeviceNotification(entry.title, entry.body, { id: entry.id, action: entry.action, category: entry.category || entry.type, details: entry.details });
  }

  function normalizeDetails(value) {
    if (!Array.isArray(value)) return [];
    return value.map((item) => typeof item === "string" ? item : String(item?.text || item?.label || "").trim()).filter(Boolean).slice(0, 40);
  }

  function openEntry(id) {
    const entry = entries.find((item) => item.id === id);
    if (!entry) return;
    entry.read = true;
    rememberRead([entry.id]);
    saveEntries();
    renderEntries();
    window.TimeFlowPlatform.dialog.close(center);
    document.getElementById("notificationDetailTitle").textContent = entry.title || "Mitteilung";
    document.getElementById("notificationDetailKind").textContent = ({ schedule: "Dienstplan", system: "Update und System", chat: "Teamnachricht", worktime: "Arbeitszeit", approval: "Antrag" })[entry.category || entry.type] || "Mitteilung";
    document.getElementById("notificationDetailTime").textContent = new Date(entry.createdAt || Date.now()).toLocaleString("de-DE", { dateStyle: "full", timeStyle: "short" });
    document.getElementById("notificationDetailBody").textContent = entry.body || "Es gibt eine neue Information für dich.";
    const details = document.getElementById("notificationDetailList");
    details.replaceChildren();
    const detailItems = normalizeDetails(entry.details);
    if (detailItems.length) {
      const heading = document.createElement("strong");
      heading.textContent = entry.category === "system" ? "Das ist im Update enthalten" : "Änderungen im Überblick";
      const listElement = document.createElement("ul");
      detailItems.forEach((text) => { const item = document.createElement("li"); item.textContent = text; listElement.append(item); });
      details.append(heading, listElement);
      details.hidden = false;
    } else details.hidden = true;
    detailAction.hidden = !["chat", "schedule", "history"].includes(entry.action);
    detailAction.textContent = ({ chat: "Teamchat öffnen", schedule: "Dienstplan öffnen", history: "Verlauf öffnen" })[entry.action] || "";
    detailAction.dataset.action = entry.action || "";
    window.TimeFlowPlatform.dialog.open(detailDialog);
  }

  async function sendTestNotification() {
    if (!notificationSupport()) {
      toast("PWA-Benachrichtigungen werden in diesem Browser nicht unterstützt.");
      return;
    }
    if (Notification.permission !== "granted" && !(await requestPermission())) return;
    if (Notification.permission === "granted" && !serverPushReady) await registerPushDevice();
    let result = {};
    let responseOk = false;
    let responseStatus = 0;
    try {
      const response = await fetch(new URL("api/notifications/push-test", document.baseURI), { method: "POST", cache: "no-store", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: "{}" });
      result = await response.json().catch(() => ({}));
      responseOk = response.ok;
      responseStatus = response.status;
    } catch (_error) { /* local preview remains available when the server is offline */ }
    const accepted = responseOk && Number(result.sent || 0) > 0;
    if (accepted) {
      const count = Number(result.sent) || 1;
      addEntry({ type: "success", title: "Push-Test angenommen", body: `Der Push-Dienst hat ${count} Testnachricht${count === 1 ? "" : "en"} angenommen. Bitte prüfe, ob sie auf diesem Gerät erscheint.`, device: false });
      toast("Der Push-Dienst hat den Test angenommen. Die tatsächliche Anzeige auf dem Gerät ist damit noch nicht bestätigt.");
      return;
    }
    const localShown = await showDeviceNotification("TimeFlow – lokaler Test", "Dieser Hinweis wurde nur auf diesem geöffneten Gerät angezeigt.", { tag: "timeflow-local-test" });
    let detail;
    if (!responseOk) {
      if (responseStatus === 401) detail = "Deine Anmeldung ist abgelaufen. Bitte melde dich erneut an.";
      else if (responseStatus === 403) detail = "Der Server hat den Test für dieses Konto abgelehnt.";
      else if (responseStatus === 503) detail = "Der Push-Dienst ist derzeit nicht verfügbar.";
      else detail = "Der Server konnte den Test nicht verarbeiten.";
    } else if (result.registered > 0) detail = "Der Server hat keine Testnachricht angenommen.";
    else detail = "Für dieses Konto wurde kein Push-Gerät gefunden.";
    addEntry({ type: "warning", title: "Push-Test nicht bestätigt", body: `${detail}${localShown ? " Ein lokaler Hinweis wurde zusätzlich angezeigt." : ""}`, device: false });
    toast(localShown ? `${detail} Es wurde nur ein lokaler Hinweis angezeigt.` : detail);
  }

  function openCenter() {
    renderEntries();
    renderPermission();
    window.TimeFlowPlatform.dialog.open(center);
  }

  center.querySelector("[data-enable-notifications]").addEventListener("click", requestPermission);
  center.querySelector("[data-test-notification]").addEventListener("click", sendTestNotification);
  center.querySelector("[data-mark-notifications-read]").addEventListener("click", () => {
    entries.forEach((entry) => { entry.read = true; });
    rememberRead(entries.map((entry) => entry.id));
    saveEntries();
    renderEntries();
    toast("Alle Benachrichtigungen wurden als gelesen markiert.");
  });
  center.querySelectorAll("[data-notification-filter]").forEach((button) => button.addEventListener("click", () => {
    activeFilter = button.dataset.notificationFilter;
    center.querySelectorAll("[data-notification-filter]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    renderEntries();
  }));
  center.querySelector("[data-close-notifications]").addEventListener("click", () => window.TimeFlowPlatform.dialog.close(center));
  detailDialog.querySelector("[data-close-notification-detail]").addEventListener("click", () => window.TimeFlowPlatform.dialog.close(detailDialog));
  detailAction.addEventListener("click", () => {
    const action = detailAction.dataset.action;
    window.TimeFlowPlatform.dialog.close(detailDialog);
    if (action === "chat") document.dispatchEvent(new CustomEvent("timeflow:open-chat"));
    else if (action === "schedule") document.querySelector('[data-target="schedule"]')?.click();
    else if (action === "history") document.dispatchEvent(new CustomEvent("timeflow:open-quick-actions", { detail: { action: "history" } }));
  });
  detailDialog.addEventListener("click", (event) => { if (event.target === detailDialog) window.TimeFlowPlatform.dialog.close(detailDialog); });
  center.addEventListener("click", (event) => {
    if (event.target === center) window.TimeFlowPlatform.dialog.close(center);
    const item = event.target.closest("[data-notification-id]");
    if (item) openEntry(item.dataset.notificationId);
  });
  navigator.serviceWorker?.addEventListener("message", (event) => {
    if (event.data?.type === "TIMEFLOW_NOTIFICATION_OPEN") openEntry(event.data.id);
  });
  document.addEventListener("timeflow:open-notifications", openCenter);
  document.addEventListener("timeflow:create-notification", (event) => addEntry(event.detail));
  document.addEventListener("timeflow:replace-notifications", (event) => {
    const previous = new Map(entries.map((entry) => [entry.id, Boolean(entry.read)]));
    const receipts = loadReadReceipts();
    entries = (Array.isArray(event.detail) ? event.detail : []).map((entry) => ({
      ...entry,
      read: Boolean(entry.read || previous.get(entry.id) || receipts[entry.id])
    }));
    saveEntries(); renderEntries();
  });
  document.addEventListener("timeflow:clear-notifications", () => {
    entries = [];
    saveEntries();
    renderEntries();
  });

  if ("Notification" in window && Notification.permission === "granted") void registerPushDevice();

  const notificationIdFromUrl = new URL(window.location.href).searchParams.get("notificationId");
  if (notificationIdFromUrl) {
    window.history.replaceState({}, "", `${window.location.pathname}${window.location.hash}`);
    window.setTimeout(() => openEntry(notificationIdFromUrl), 0);
  }

  const settingsList = document.querySelector('[aria-labelledby="notificationSettingsTitle"] .settings-list');
  if (settingsList) {
    settingsList.insertAdjacentHTML("afterend", `
      <div class="settings-notification-device">
        <span><i class="fa-solid fa-mobile-screen-button"></i></span>
        <div><strong>Geräte-Berechtigung</strong><small data-settings-notification-status>Status wird geprüft …</small></div>
        <button type="button" data-settings-enable-notifications>Aktivieren</button>
        <button type="button" data-settings-test-notification aria-label="Testbenachrichtigung senden"><i class="fa-solid fa-paper-plane"></i></button>
      </div>
    `);
    const status = settingsList.parentElement.querySelector("[data-settings-notification-status]");
    const enableButton = settingsList.parentElement.querySelector("[data-settings-enable-notifications]");
    function updateSettingsPermission(event) {
      const permission = event?.detail?.permission || ("Notification" in window ? Notification.permission : "unsupported");
      status.textContent = ({ granted: "Aktiviert", denied: "Im Browser blockiert", default: "Noch nicht aktiviert", unsupported: "Nicht unterstützt" })[permission] || "Nicht unterstützt";
      enableButton.textContent = permission === "granted" ? "Aktiv" : permission === "denied" ? "Blockiert" : "Aktivieren";
      enableButton.disabled = permission === "granted" || permission === "denied" || permission === "unsupported";
    }
    enableButton.addEventListener("click", requestPermission);
    settingsList.parentElement.querySelector("[data-settings-test-notification]").addEventListener("click", sendTestNotification);
    document.addEventListener("timeflow:notification-permission", updateSettingsPermission);
    updateSettingsPermission();
  }

  saveEntries();
  renderEntries();
  renderPermission();
  document.addEventListener("timeflow:session-ready", (event) => { if (event.detail?.source === "platform") loadServerPushPreferences(); });
  document.addEventListener("timeflow:settings-updated", () => syncPushPreferences());
  window.addEventListener("online", () => syncPushPreferences());
});

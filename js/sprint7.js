"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "timeflow-notifications-v1";
  const notificationButton = document.querySelector('[data-action="notifications"]');
  const notificationBadge = notificationButton?.querySelector(".notification-badge");
  if (!notificationButton || !notificationBadge) return;

  document.body.insertAdjacentHTML("beforeend", `
    <dialog class="notification-center" id="notificationCenter" aria-labelledby="notificationCenterTitle">
      <section>
        <header class="notification-center-header">
          <span class="notification-center-icon"><i class="fa-regular fa-bell"></i></span>
          <div><small><i class="fa-solid fa-sparkles"></i> Sprint 7</small><h2 id="notificationCenterTitle">Benachrichtigungen</h2><p>Alles Wichtige aus deinem Arbeitstag an einem Ort.</p></div>
          <button type="button" data-close-notifications aria-label="Benachrichtigungen schließen"><i class="fa-solid fa-xmark"></i></button>
        </header>
        <div class="notification-permission" id="notificationPermissionCard">
          <span><i class="fa-solid fa-mobile-screen-button"></i></span>
          <div><strong>Benachrichtigungen auf diesem Gerät</strong><small id="notificationPermissionText">Status wird geprüft …</small></div>
          <button type="button" data-enable-notifications>Aktivieren</button>
        </div>
        <div class="notification-toolbar">
          <strong id="notificationUnreadLabel">Aktuell</strong>
          <button type="button" data-mark-notifications-read><i class="fa-regular fa-circle-check"></i> Alle gelesen</button>
        </div>
        <div class="notification-list" id="notificationList"></div>
        <footer><button type="button" data-test-notification><i class="fa-solid fa-paper-plane"></i> Testbenachrichtigung</button><small>Lokale Vorschau · Serverseitige Pushs folgen mit dem Backend</small></footer>
      </section>
    </dialog>
  `);

  const center = document.getElementById("notificationCenter");
  const list = document.getElementById("notificationList");
  const unreadLabel = document.getElementById("notificationUnreadLabel");
  const permissionText = document.getElementById("notificationPermissionText");
  const permissionCard = document.getElementById("notificationPermissionCard");
  let entries = loadEntries();

  function seedEntries() {
    const now = Date.now();
    return [
      { id: "approval-1", type: "approval", title: "3 offene Freigaben", body: "Deine Anträge und Vorgänge warten auf eine Rückmeldung.", createdAt: new Date(now - 8 * 60000).toISOString(), read: false, action: "history" },
      { id: "schedule-1", type: "schedule", title: "Nächste Schicht bestätigt", body: "Frühschicht morgen von 07:30 bis 15:00 Uhr.", createdAt: new Date(now - 42 * 60000).toISOString(), read: false, action: "schedule" },
      { id: "chat-1", type: "chat", title: "Team Restaurant", body: "Anna hat eine neue Nachricht im Teamchat gesendet.", createdAt: new Date(now - 95 * 60000).toISOString(), read: false, action: "chat" }
    ];
  }

  function loadEntries() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(stored) && stored.length ? stored : seedEntries();
    } catch {
      return seedEntries();
    }
  }

  function saveEntries() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 50)));
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
    if (!entries.length) {
      const empty = document.createElement("div");
      empty.className = "notification-empty";
      empty.innerHTML = '<i class="fa-regular fa-bell-slash"></i><strong>Hier ist alles ruhig</strong><p>Neue Hinweise erscheinen automatisch an dieser Stelle.</p>';
      list.append(empty);
    } else {
      entries.forEach((entry) => {
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
      permissionText.textContent = "Aktiv – Hinweise dürfen auf dem Gerät erscheinen.";
      button.textContent = "Aktiv";
      button.disabled = true;
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
      toast("Benachrichtigungen wurden aktiviert.");
      return true;
    }
    toast(permission === "denied" ? "Benachrichtigungen sind im Browser blockiert." : "Benachrichtigungen wurden noch nicht aktiviert.");
    return false;
  }

  async function showDeviceNotification(title, body, data = {}) {
    if (!notificationSupport() || Notification.permission !== "granted") return false;
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        icon: "assets/icons/timeflow-icon-192.png",
        badge: "assets/icons/timeflow-icon-192.png",
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
    const entry = {
      id: window.crypto?.randomUUID?.() || `notification-${Date.now()}`,
      type: detail.type || "system",
      title: detail.title || "TimeFlow",
      body: detail.body || "Es gibt eine neue Information für dich.",
      createdAt: new Date().toISOString(),
      read: false,
      action: detail.action || ""
    };
    entries.unshift(entry);
    saveEntries();
    renderEntries();
    if (detail.device !== false) showDeviceNotification(entry.title, entry.body, { action: entry.action });
  }

  async function sendTestNotification() {
    if (!notificationSupport()) {
      toast("PWA-Benachrichtigungen werden in diesem Browser nicht unterstützt.");
      return;
    }
    if (Notification.permission !== "granted" && !(await requestPermission())) return;
    const sent = await showDeviceNotification("TimeFlow ist bereit", "Benachrichtigungen funktionieren auf diesem Gerät.", { tag: "timeflow-test" });
    addEntry({ type: "success", title: "Test erfolgreich", body: "Deine lokalen PWA-Benachrichtigungen sind einsatzbereit.", device: false });
    toast(sent ? "Testbenachrichtigung wurde gesendet." : "Der Test wurde im Notification Center gespeichert.");
  }

  function openEntry(id) {
    const entry = entries.find((item) => item.id === id);
    if (!entry) return;
    entry.read = true;
    saveEntries();
    renderEntries();
    center.close();
    if (entry.action === "chat") document.dispatchEvent(new CustomEvent("timeflow:open-chat"));
    else if (entry.action === "schedule") document.querySelector('[data-target="schedule"]')?.click();
    else if (entry.action === "history") document.dispatchEvent(new CustomEvent("timeflow:open-quick-actions", { detail: { action: "history" } }));
  }

  function openCenter() {
    renderEntries();
    renderPermission();
    center.showModal();
  }

  center.querySelector("[data-enable-notifications]").addEventListener("click", requestPermission);
  center.querySelector("[data-test-notification]").addEventListener("click", sendTestNotification);
  center.querySelector("[data-mark-notifications-read]").addEventListener("click", () => {
    entries.forEach((entry) => { entry.read = true; });
    saveEntries();
    renderEntries();
    toast("Alle Benachrichtigungen wurden als gelesen markiert.");
  });
  center.querySelector("[data-close-notifications]").addEventListener("click", () => center.close());
  center.addEventListener("click", (event) => {
    if (event.target === center) center.close();
    const item = event.target.closest("[data-notification-id]");
    if (item) openEntry(item.dataset.notificationId);
  });
  document.addEventListener("timeflow:open-notifications", openCenter);
  document.addEventListener("timeflow:create-notification", (event) => addEntry(event.detail));

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
});

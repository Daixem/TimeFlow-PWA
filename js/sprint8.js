"use strict";

document.documentElement.classList.add("timeflow-auth-pending");

// Ein langsamer oder blockierter Sitzungs-Endpunkt darf die Oberfläche nicht
// dauerhaft unsichtbar lassen (besonders in iPad-WebViews).
const authVisibilityFallback = window.setTimeout(() => {
  document.documentElement.classList.remove("timeflow-auth-pending");
}, 4000);

document.addEventListener("DOMContentLoaded", () => {
  const SESSION_KEY = "timeflow-session-v1";
  const USERS_KEY = "timeflow-users-v1";
  const defaultUsers = [
    { id: "tf-2048", name: "Max Mustermann", email: "max.mustermann@timeflow.de", role: "Mitarbeiter", department: "Restaurant", active: true, initials: "MM" },
    { id: "tf-1056", name: "Anna Müller", email: "anna.mueller@timeflow.de", role: "Teamleitung", department: "Restaurant", active: true, initials: "AM" },
    { id: "tf-1001", name: "Thomas Becker", email: "thomas.becker@timeflow.de", role: "Administrator", department: "Betriebsleitung", active: true, initials: "TB" }
  ];
  let users = loadUsers();
  let session = null;
  let authMode = "demo";

  document.body.insertAdjacentHTML("beforeend", `
    <section class="auth-gate" id="authGate" aria-labelledby="authGateTitle" hidden>
      <div class="auth-gate-card">
        <header><span class="auth-brand"><i class="fa-solid fa-stopwatch"></i></span><div><small>TimeFlow · Sprint 8</small><strong>Arbeitszeit, die verbindet.</strong></div></header>
        <div class="auth-intro"><span><i class="fa-solid fa-shield-halved"></i></span><h1 id="authGateTitle">Willkommen zurück</h1><p>Wähle für die öffentliche Vorschau ein Demo-Konto. Es werden keine Passwörter oder echten Zugangsdaten gespeichert.</p></div>
        <div class="auth-demo-users" id="authDemoUsers" aria-label="Demo-Konten"></div>
        <p class="auth-security-note"><i class="fa-solid fa-lock"></i><span><strong>Sicher getrennt</strong><small>Die private TimeFlow-Site verwendet deine bestehende ChatGPT-Anmeldung. Diese Auswahl gilt nur lokal für die öffentliche Demo.</small></span></p>
      </div>
    </section>

    <dialog class="user-management-dialog" id="userManagementDialog" aria-labelledby="userManagementTitle">
      <section>
        <header>
          <span><i class="fa-solid fa-users-gear"></i></span>
          <div><small>Sprint 8 · Lokal</small><h2 id="userManagementTitle">Benutzer & Rollen</h2><p>Verwalte die Demo-Belegschaft auf diesem Gerät.</p></div>
          <button type="button" data-close-users aria-label="Benutzerverwaltung schließen"><i class="fa-solid fa-xmark"></i></button>
        </header>
        <div class="user-management-summary"><span><strong id="activeUserCount">3</strong><small>Aktive Benutzer</small></span><span><strong>3</strong><small>Rollen</small></span><span><strong>Nur lokal</strong><small>Alpha-Modus</small></span></div>
        <div class="user-management-list" id="userManagementList"></div>
        <footer><p><i class="fa-solid fa-circle-info"></i> Änderungen bleiben bis zur Backend-Anbindung nur in diesem Browser.</p><button type="button" data-reset-users>Demo zurücksetzen</button></footer>
      </section>
    </dialog>
  `);

  const profileHero = document.querySelector(".profile-hero");
  if (profileHero) {
    const editProfileButton = profileHero.querySelector(".edit-profile-button");
    const actions = document.createElement("div");
    actions.className = "profile-hero-actions";
    actions.innerHTML = `
      <button class="profile-permission-button" type="button" data-manage-users aria-label="Benutzer und Rollen verwalten">
        <span class="profile-permission-icon" id="sessionSecurityState"><i class="fa-solid fa-shield-halved"></i></span>
        <span><small>Berechtigung</small><strong id="sessionPermissionRole">Wird geprüft …</strong><em id="sessionAccountMeta">Angemeldetes Konto</em></span>
      </button>
      <button class="profile-signout-button" type="button" data-sign-out><i class="fa-solid fa-arrow-right-from-bracket"></i><span>Abmelden</span></button>
    `;
    profileHero.append(actions);
    if (editProfileButton) actions.append(editProfileButton);
  }

  const gate = document.getElementById("authGate");
  const demoUsers = document.getElementById("authDemoUsers");
  const managementDialog = document.getElementById("userManagementDialog");
  const managementList = document.getElementById("userManagementList");

  function parseJson(value, fallback) {
    try {
      const parsed = JSON.parse(value);
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }

  function storageGet(key) {
    try { return window.TimeFlowPlatform.storage.getItem(key); } catch { return null; }
  }

  function storageSet(key, value) {
    try { window.TimeFlowPlatform.storage.setItem(key, value); } catch { /* Sitzung bleibt temporär nutzbar. */ }
  }

  function storageRemove(key) {
    try { window.TimeFlowPlatform.storage.removeItem(key); } catch { /* Kein persistenter Speicher verfügbar. */ }
  }

  function loadUsers() {
    const stored = parseJson(storageGet(USERS_KEY), null);
    return Array.isArray(stored) && stored.length ? stored : defaultUsers.map((user) => ({ ...user }));
  }

  function saveUsers() {
    storageSet(USERS_KEY, JSON.stringify(users));
  }

  function loadDemoSession() {
    const stored = parseJson(storageGet(SESSION_KEY), null);
    if (!stored?.userId) return null;
    const user = users.find((entry) => entry.id === stored.userId && entry.active);
    return user ? { source: "demo", user } : null;
  }

  function escapeText(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  }

  function renderDemoUsers() {
    demoUsers.replaceChildren();
    users.filter((user) => user.active).forEach((user) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.demoLogin = user.id;
      const avatar = document.createElement("span");
      avatar.textContent = user.initials;
      const identity = document.createElement("span");
      const name = document.createElement("strong");
      name.textContent = user.name;
      const meta = document.createElement("small");
      meta.textContent = `${user.role} · ${user.department}`;
      identity.append(name, meta);
      const arrow = document.createElement("i");
      arrow.className = "fa-solid fa-arrow-right";
      button.append(avatar, identity, arrow);
      demoUsers.append(button);
    });
  }

  function showGate() {
    window.clearTimeout(authVisibilityFallback);
    renderDemoUsers();
    gate.hidden = false;
    document.documentElement.classList.add("timeflow-auth-locked");
    document.documentElement.classList.remove("timeflow-auth-pending");
    gate.querySelector("[data-demo-login]")?.focus();
  }

  function showApp() {
    window.clearTimeout(authVisibilityFallback);
    gate.hidden = true;
    document.documentElement.classList.remove("timeflow-auth-pending", "timeflow-auth-locked");
    renderSessionCard();
    document.dispatchEvent(new CustomEvent("timeflow:session-ready", { detail: session }));
  }

  function renderSessionCard() {
    const role = document.getElementById("sessionPermissionRole");
    const meta = document.getElementById("sessionAccountMeta");
    const security = document.getElementById("sessionSecurityState");
    if (!role || !session) return;
    role.textContent = session.user.role || (session.source === "platform" ? "Kontoinhaber" : "Mitarbeiter");
    meta.textContent = session.source === "platform"
      ? `${session.user.email || "Verifiziertes Konto"} · Site-verifiziert`
      : `${session.user.email || session.user.name || "Demo-Konto"} · Demo`;
    security.innerHTML = session.source === "platform"
      ? '<i class="fa-solid fa-shield-halved"></i>'
      : '<i class="fa-solid fa-flask"></i>';
    security.classList.toggle("is-demo", session.source !== "platform");
  }

  function signInDemo(userId) {
    const user = users.find((entry) => entry.id === userId && entry.active);
    if (!user) return;
    authMode = "demo";
    session = { source: "demo", user };
    storageSet(SESSION_KEY, JSON.stringify({ userId: user.id, signedInAt: new Date().toISOString() }));
    showApp();
    notify(`Willkommen, ${user.name.split(" ")[0]}.`);
  }

  function notify(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 3200);
  }

  function roleOptions(selected) {
    return ["Mitarbeiter", "Teamleitung", "Administrator"].map((role) => `<option${role === selected ? " selected" : ""}>${role}</option>`).join("");
  }

  function renderManagement() {
    managementList.replaceChildren();
    users.forEach((user) => {
      const article = document.createElement("article");
      article.className = user.active ? "" : "is-inactive";
      article.dataset.userId = user.id;
      article.innerHTML = `
        <span class="managed-user-avatar">${escapeText(user.initials)}</span>
        <div class="managed-user-copy"><strong>${escapeText(user.name)}</strong><small>${escapeText(user.email)}</small><em>${escapeText(user.department)} · ${escapeText(user.id.toUpperCase())}</em></div>
        <label><span>Rolle</span><select data-user-role>${roleOptions(user.role)}</select></label>
        <label class="managed-user-toggle"><span>${user.active ? "Aktiv" : "Inaktiv"}</span><input type="checkbox" data-user-active${user.active ? " checked" : ""}><i></i></label>`;
      managementList.append(article);
    });
    document.getElementById("activeUserCount").textContent = String(users.filter((user) => user.active).length);
  }

  function openManagement() {
    renderManagement();
    window.TimeFlowPlatform.dialog.open(managementDialog);
  }

  async function resolveSession() {
    // GitHub Pages besitzt keinen Identitäts-Endpunkt. Der frühere Request auf
    // /api/session konnte dort in eingebetteten iPad-Browsern hängen bleiben.
    const isStaticPreview = window.location.hostname.endsWith(".github.io");
    if (!isStaticPreview) {
      const controller = typeof AbortController === "function" ? new AbortController() : null;
      const requestTimeout = window.setTimeout(() => controller?.abort(), 3000);
      try {
        const response = await fetch(new URL("api/session", document.baseURI), {
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal: controller?.signal
        });
        if (response.ok) {
          const data = await response.json();
          if (data.authenticated && data.user) {
            authMode = "platform";
            session = { source: "platform", user: { ...data.user, role: window.TimeFlowBetaAccess?.admin ? "Administrator" : data.user.role } };
            showApp();
            return;
          }
        }
      } catch {
        // Ohne erreichbaren Identitätsdienst wird lokal weitergearbeitet.
      } finally {
        window.clearTimeout(requestTimeout);
      }
    }
    const demoSession = loadDemoSession();
    if (demoSession) {
      session = demoSession;
      showApp();
    } else {
      showGate();
    }
  }

  demoUsers.addEventListener("click", (event) => {
    const button = event.target.closest("[data-demo-login]");
    if (button) signInDemo(button.dataset.demoLogin);
  });
  document.querySelector("[data-manage-users]")?.addEventListener("click", openManagement);
  document.addEventListener("timeflow:beta-access-ready", (event) => {
    if (!event.detail?.admin || !session?.user) return;
    session.user.role = "Administrator";
    renderSessionCard();
    document.dispatchEvent(new CustomEvent("timeflow:session-ready", { detail: session }));
  });
  document.querySelector("[data-sign-out]")?.addEventListener("click", () => {
    if (authMode === "platform") {
      window.location.assign("/signout-with-chatgpt?return_to=/");
      return;
    }
    storageRemove(SESSION_KEY);
    session = null;
    showGate();
  });
  managementDialog.querySelector("[data-close-users]").addEventListener("click", () => window.TimeFlowPlatform.dialog.close(managementDialog));
  managementDialog.querySelector("[data-reset-users]").addEventListener("click", () => {
    users = defaultUsers.map((user) => ({ ...user }));
    saveUsers();
    renderManagement();
    notify("Die Demo-Benutzer wurden zurückgesetzt.");
  });
  managementList.addEventListener("change", (event) => {
    const article = event.target.closest("[data-user-id]");
    const user = users.find((entry) => entry.id === article?.dataset.userId);
    if (!user) return;
    if (event.target.matches("[data-user-role]")) user.role = event.target.value;
    if (event.target.matches("[data-user-active]")) user.active = event.target.checked;
    saveUsers();
    renderManagement();
    notify("Benutzerverwaltung wurde lokal aktualisiert.");
  });
  document.addEventListener("timeflow:account-name-change", (event) => {
    if (session?.user?.role !== "Administrator") return;
    const name = String(event.detail?.name || "").trim();
    if (!name) return;
    const user = users.find((entry) => entry.id === session.user.id);
    if (user) {
      user.name = name;
      user.initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("");
      session.user = user;
      saveUsers();
      storageSet(SESSION_KEY, JSON.stringify({ userId: user.id, signedInAt: new Date().toISOString() }));
    }
  });
  managementDialog.addEventListener("click", (event) => { if (event.target === managementDialog) window.TimeFlowPlatform.dialog.close(managementDialog); });

  resolveSession();
});

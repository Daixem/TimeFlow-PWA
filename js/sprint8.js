"use strict";

document.documentElement.classList.add("timeflow-auth-pending");

// Ein langsamer oder blockierter Sitzungs-Endpunkt darf die Oberfläche nicht
// dauerhaft unsichtbar lassen (besonders in iPad-WebViews).
const authVisibilityFallback = window.setTimeout(() => {
  document.documentElement.classList.add("timeflow-auth-locked");
  document.documentElement.classList.remove("timeflow-auth-pending");
  const gate = document.getElementById("authGate");
  if (gate) gate.hidden = false;
}, 4000);

document.addEventListener("DOMContentLoaded", () => {
  const SESSION_KEY = "timeflow-session-v1";
  const PLATFORM_SESSION_CACHE_KEY = "timeflow-platform-session-cache-v1";
  let session = null;
  let authMode = null;

  document.body.insertAdjacentHTML("beforeend", `
    <section class="auth-gate" id="authGate" aria-labelledby="authGateTitle" hidden>
      <div class="auth-gate-card">
        <header><span class="auth-brand"><i class="fa-solid fa-stopwatch"></i></span><div><small>TimeFlow</small><strong>Arbeitszeit, die verbindet.</strong></div></header>
        <div class="auth-intro"><span><i class="fa-solid fa-shield-halved"></i></span><h1 id="authGateTitle">Anmeldung erforderlich</h1><p>Für diese Vorschau gibt es keine Testkonten. Öffne TimeFlow Connect und melde dich mit deinem freigegebenen Konto an.</p></div>
        <div class="auth-demo-users" id="authDemoUsers" aria-label="Anmeldung"><a href="https://timeflow-connect.daixem.chatgpt.site/">TimeFlow Connect öffnen <i class="fa-solid fa-arrow-up-right-from-square"></i></a></div>
        <p class="auth-security-note"><i class="fa-solid fa-lock"></i><span><strong>Keine Demokonten</strong><small>Demo-Nutzer und alte Testanmeldungen werden auf diesem Gerät nicht mehr verwendet.</small></span></p>
      </div>
    </section>

  `);

  const profileHero = document.querySelector(".profile-hero");
  if (profileHero) {
    const editProfileButton = profileHero.querySelector(".edit-profile-button");
    const actions = document.createElement("div");
    actions.className = "profile-hero-actions";
    actions.innerHTML = `
      <div class="profile-permission-button" aria-label="Angemeldete Rolle">
        <span class="profile-permission-icon" id="sessionSecurityState"><i class="fa-solid fa-shield-halved"></i></span>
        <span><small>Berechtigung</small><strong id="sessionPermissionRole">Wird geprüft …</strong><em id="sessionAccountMeta">Angemeldetes Konto</em></span>
      </div>
      <button class="profile-signout-button" type="button" data-sign-out><i class="fa-solid fa-arrow-right-from-bracket"></i><span>Abmelden</span></button>
    `;
    profileHero.append(actions);
    if (editProfileButton) actions.append(editProfileButton);
  }

  const gate = document.getElementById("authGate");
  const authLinkContainer = document.getElementById("authDemoUsers");

  function parseJson(value, fallback) {
    try {
      const parsed = JSON.parse(value);
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }

  function storageSet(key, value) {
    try { window.TimeFlowPlatform.storage.setItem(key, value); } catch { /* Sitzung bleibt temporär nutzbar. */ }
  }

  function storageGet(key) {
    try { return window.TimeFlowPlatform.storage.getItem(key); } catch { return null; }
  }

  function storageRemove(key) {
    try { window.TimeFlowPlatform.storage.removeItem(key); } catch { /* Kein persistenter Speicher verfügbar. */ }
  }

  storageRemove("timeflow-users-v1");

  function cachePlatformSession(value) {
    storageSet(PLATFORM_SESSION_CACHE_KEY, JSON.stringify({ session: value, verifiedAt: new Date().toISOString() }));
  }

  function loadOfflinePlatformSession() {
    const cached = parseJson(storageGet(PLATFORM_SESSION_CACHE_KEY), null);
    const verifiedAt = Date.parse(cached?.verifiedAt || "");
    if (!cached?.session?.user?.id || !Number.isFinite(verifiedAt) || Date.now() - verifiedAt > 24 * 60 * 60 * 1000) return null;
    return { ...cached.session, offline: true };
  }

  function renderAuthLink() {
    authLinkContainer.replaceChildren();
    const link = document.createElement("a");
    link.href = "https://timeflow-connect.daixem.chatgpt.site/";
    link.textContent = "TimeFlow Connect öffnen";
    const arrow = document.createElement("i");
    arrow.className = "fa-solid fa-arrow-up-right-from-square";
    link.append(" ", arrow);
    authLinkContainer.append(link);
  }

  function showGate() {
    window.clearTimeout(authVisibilityFallback);
    renderAuthLink();
    gate.hidden = false;
    document.documentElement.classList.add("timeflow-auth-locked");
    document.documentElement.classList.remove("timeflow-auth-pending");
    gate.querySelector("a")?.focus();
  }

  function showApp() {
    window.clearTimeout(authVisibilityFallback);
    if (session?.source === "platform") window.TimeFlowWorkTimeApi?.activateAccount(window.TimeFlowPlatform.storage, session.user?.id);
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
    role.textContent = session.user.role || "Kontoinhaber";
    meta.textContent = `${session.user.email || "Verifiziertes Konto"} · Site-verifiziert`;
    security.innerHTML = '<i class="fa-solid fa-shield-halved"></i>';
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
            cachePlatformSession(session);
            showApp();
            return;
          }
          storageRemove(PLATFORM_SESSION_CACHE_KEY);
        } else if (response.status === 401 || response.status === 403) {
          storageRemove(PLATFORM_SESSION_CACHE_KEY);
        }
      } catch {
        // Ohne erreichbaren Identitätsdienst gibt es keine lokale Ersatzanmeldung.
      } finally {
        window.clearTimeout(requestTimeout);
      }
    }
    if (navigator.onLine === false) {
      const offlineSession = loadOfflinePlatformSession();
      if (offlineSession) {
        authMode = "platform";
        session = offlineSession;
        showApp();
        return;
      }
    }
    storageRemove(SESSION_KEY);
    showGate();
  }

  document.addEventListener("timeflow:beta-access-ready", (event) => {
    if (!event.detail?.admin || !session?.user) return;
    session.user.role = "Administrator";
    renderSessionCard();
    document.dispatchEvent(new CustomEvent("timeflow:session-ready", { detail: session }));
  });
  document.querySelector("[data-sign-out]")?.addEventListener("click", () => {
    if (authMode === "platform") {
      storageRemove(PLATFORM_SESSION_CACHE_KEY);
      window.location.assign("/signout-with-chatgpt?return_to=/");
      return;
    }
    storageRemove(SESSION_KEY);
    session = null;
    showGate();
  });
  resolveSession();
});

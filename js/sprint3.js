"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const dashboard = document.getElementById("dashboard");
  const app = document.querySelector(".app");
  if (!dashboard || !app) return;

  dashboard.insertAdjacentHTML("beforeend", `
    <section id="chatPage" class="chat-page app-page hidden" aria-labelledby="chatTitle">
      <header class="chat-page-header">
        <div>
          <span class="eyebrow"><i class="fa-solid fa-bolt"></i> TimeFlow Connect</span>
          <h1 id="chatTitle">Chats</h1>
          <p>Absprachen, Schichten und dein Team an einem Ort.</p>
        </div>
        <button class="new-chat-button" type="button" data-new-chat aria-label="Neue Unterhaltung">
          <i class="fa-solid fa-pen-to-square"></i>
        </button>
      </header>

      <div class="chat-toolbar">
        <div class="chat-filter-tabs" role="group" aria-label="Chatfilter">
          <button type="button" data-chat-filter="all" aria-pressed="true">Alle</button>
          <button type="button" data-chat-filter="unread">Ungelesen <span id="unreadCount">0</span></button>
          <button type="button" data-chat-filter="groups">Teams</button>
        </div>
        <label class="chat-search">
          <i class="fa-solid fa-magnifying-glass"></i>
          <span class="sr-only">Unterhaltungen durchsuchen</span>
          <input id="chatSearch" type="search" placeholder="Chats durchsuchen">
        </label>
      </div>

      <div class="chat-layout">
        <aside class="inbox-panel" aria-label="Unterhaltungen">
          <div class="conversation-list" id="conversationList">
          </div>
          <p class="empty-conversations" id="emptyConversations" hidden>
            <i class="fa-regular fa-message"></i>
            Keine passenden Chats gefunden.
          </p>
        </aside>

        <article class="chat-thread" aria-label="Aktive Unterhaltung">
          <header class="thread-header">
            <button type="button" class="thread-back" data-close-thread aria-label="Zurück zur Chatliste">
              <i class="fa-solid fa-arrow-left"></i>
            </button>
            <span class="conversation-avatar team-avatar" id="threadAvatar"><i class="fa-solid fa-users"></i></span>
            <div class="thread-heading">
              <strong id="threadName">Teamchat</strong>
              <small id="threadStatus">Wird verbunden …</small>
            </div>
            <button type="button" class="thread-action" data-thread-search aria-label="Im Chat suchen">
              <i class="fa-solid fa-magnifying-glass"></i>
            </button>
            <button type="button" class="thread-action" data-thread-info aria-label="Chatinformationen">
              <i class="fa-solid fa-circle-info"></i>
            </button>
          </header>

          <div class="work-context" hidden>
            <span><i class="fa-solid fa-wand-magic-sparkles"></i></span>
            <div><small>TimeFlow erkennt den Arbeitskontext</small><strong>Frühschicht am Freitag · 07:30 Uhr</strong></div>
            <button type="button" data-shift-details>Öffnen</button>
          </div>

          <div class="message-list" id="messageList"></div>

          <div class="smart-replies" aria-label="Schnellaktionen" hidden>
            <button type="button" data-smart-reply="confirm"><i class="fa-solid fa-circle-check"></i> Schicht bestätigen</button>
            <button type="button" data-smart-reply="swap"><i class="fa-solid fa-arrow-right-arrow-left"></i> Tausch anfragen</button>
            <button type="button" data-smart-reply="late"><i class="fa-regular fa-clock"></i> 10 Min. später</button>
          </div>

          <form class="message-form" id="messageForm">
            <button type="button" class="composer-action" data-attachment aria-label="Anhang hinzufügen">
              <i class="fa-solid fa-plus"></i>
            </button>
            <label>
              <span class="sr-only">Nachricht schreiben</span>
              <input id="messageInput" type="text" maxlength="300" autocomplete="off" placeholder="Nachricht schreiben">
              <button type="button" data-emoji aria-label="Emoji einfügen"><i class="fa-regular fa-face-smile"></i></button>
            </label>
            <button type="submit" class="send-button" aria-label="Nachricht senden">
              <i class="fa-solid fa-paper-plane"></i>
            </button>
          </form>
        </article>
      </div>

      <p class="chat-demo-note">
        <i class="fa-solid fa-shield-halved"></i>
        Nachrichten werden nur für angemeldete Mitglieder deines Teams angezeigt.
      </p>

      <dialog class="new-chat-dialog" id="newChatDialog" aria-labelledby="newChatTitle">
        <header><div><small>Neue Unterhaltung</small><h2 id="newChatTitle">Wen möchtest du erreichen?</h2></div><button type="button" data-close-dialog aria-label="Schließen"><i class="fa-solid fa-xmark"></i></button></header>
        <div>
          <p>Der Teamchat ist für alle bestätigten Mitglieder deines Teams gemeinsam.</p>
        </div>
      </dialog>
    </section>
  `);

  const CHAT_STORAGE_KEY = "timeflow-chat-demo-v2";
  const schedulePage = document.getElementById("schedulePage");
  const chatPage = document.getElementById("chatPage");
  const homeNav = document.querySelector('[data-target="home"]');
  const scheduleNav = document.querySelector('[data-target="schedule"]');
  const clockNav = document.querySelector('[data-target="clock"]');
  const chatNav = document.querySelector('[data-target="chat"]');
  const profileNav = document.querySelector('[data-target="profile"]');
  const messageList = document.getElementById("messageList");
  const chatDialog = document.getElementById("newChatDialog");

  let platformSession = false;
  let platformUserId = "";
  let teamRefreshTimer = 0;
  let teamRefreshGeneration = 0;
  let activeTeamId = "";
  let teamMessages = [];
  function clearPlatformDemoChat(message = "Melde dich an und tritt einem Team bei, um den gemeinsamen Chat zu nutzen.") {
    teamRefreshGeneration += 1;
    try { window.TimeFlowPlatform.storage.removeItem(CHAT_STORAGE_KEY); } catch (_error) { /* storage can be unavailable in restricted WebViews */ }
    chatPage.querySelector(".inbox-highlight")?.remove();
    chatPage.querySelector(".conversation-list")?.replaceChildren();
    messageList.replaceChildren();
    chatPage.querySelector(".chat-thread")?.removeAttribute("hidden");
    chatPage.querySelector("[data-new-chat]")?.setAttribute("hidden", "");
    chatPage.querySelector(".chat-toolbar")?.removeAttribute("hidden");
    chatPage.querySelectorAll("[data-chat-filter]").forEach((button) => { button.disabled = false; });
    const empty = document.getElementById("emptyConversations");
    if (empty) empty.textContent = message;
    chatPage.classList.toggle("chat-backend-unavailable", Boolean(message));
    document.getElementById("threadName").textContent = "Teamchat";
    document.getElementById("threadStatus").textContent = message;
    const messageInput = document.getElementById("messageInput");
    if (messageInput) messageInput.disabled = true;
    const sendButton = chatPage.querySelector(".send-button"); if (sendButton) sendButton.disabled = true;
    activeTeamId = "";
    teamMessages = [];
    window.clearInterval(teamRefreshTimer);
    teamRefreshTimer = 0;
    const note = chatPage.querySelector(".chat-demo-note");
    if (note) {
      note.replaceChildren();
      const icon = document.createElement("i");
      icon.className = "fa-solid fa-circle-info";
      note.append(icon, document.createTextNode(message));
    }
    updateUnreadCount();
    applyConversationFilter();
  }

  const conversations = {};
  let activeChat = "team";
  let activeFilter = "all";

  const navBadge = document.createElement("span");
  navBadge.className = "nav-unread-badge";
  navBadge.setAttribute("aria-label", "Ungelesene Chats");
  chatNav?.append(navBadge);

  function setNavActive(target) {
    document.querySelectorAll(".nav-item").forEach((item) => {
      const active = item.dataset.target === target;
      item.classList.toggle("active", active);
      item.toggleAttribute("aria-current", active);
    });
  }

  function showPage(name) {
    dashboard.classList.toggle("schedule-mode", name === "schedule");
    dashboard.classList.toggle("chat-mode", name === "chat");
    dashboard.classList.toggle("profile-mode", name === "profile");
    dashboard.classList.toggle("clock-mode", name === "clock");
    dashboard.classList.toggle("settings-mode", name === "settings");
    schedulePage?.classList.toggle("hidden", name !== "schedule");
    chatPage.classList.toggle("hidden", name !== "chat");
    document.getElementById("profilePage")?.classList.toggle("hidden", name !== "profile");
    document.getElementById("clockPage")?.classList.toggle("hidden", name !== "clock");
    document.getElementById("settingsPage")?.classList.toggle("hidden", name !== "settings");
    app.classList.toggle("subpage-mode", name !== "home");
    if (name === "chat") chatPage.classList.remove("thread-open");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  homeNav?.addEventListener("click", () => showPage("home"));
  scheduleNav?.addEventListener("click", () => showPage("schedule"));
  chatNav?.addEventListener("click", () => showPage("chat"));
  profileNav?.addEventListener("click", () => showPage("profile"));
  clockNav?.addEventListener("click", () => showPage("clock"));
  document.addEventListener("timeflow:open-chat", () => {
    showPage("chat");
    setNavActive("chat");
  });
  document.addEventListener("timeflow:open-profile", () => {
    showPage("profile");
    setNavActive("profile");
  });
  document.addEventListener("timeflow:open-clock", () => {
    showPage("clock");
    setNavActive("clock");
  });
  document.addEventListener("timeflow:open-settings", () => {
    showPage("settings");
    setNavActive("profile");
  });

  function renderConversation(id, markRead = true) {
    activeChat = id;
    const conversation = conversations[id];
    if (!conversation) return;

    document.getElementById("threadName").textContent = conversation.name;
    const status = document.getElementById("threadStatus");
    status.replaceChildren();
    status.append(document.createTextNode(conversation.status));

    const avatar = document.getElementById("threadAvatar");
    avatar.className = "conversation-avatar team-avatar";
    avatar.replaceChildren();
    const icon = document.createElement("i"); icon.className = "fa-solid fa-users"; avatar.append(icon);
    chatPage.querySelector(".work-context").hidden = true;
    chatPage.querySelector(".smart-replies").hidden = true;

    messageList.replaceChildren();
    conversation.messages.forEach((message) => renderMessage(message));

    document.querySelectorAll("[data-chat-id]").forEach((button) => {
      const selected = button.dataset.chatId === id;
      button.setAttribute("aria-pressed", String(selected));
      if (selected && markRead) button.dataset.unread = "0";
    });

    updateUnreadCount();
    applyConversationFilter();
    messageList.scrollTop = messageList.scrollHeight;
  }

  function renderMessage(message) {
    const bubble = document.createElement("div");
    bubble.className = `message-bubble${message.own ? " own" : ""}`;
    const sender = document.createElement("strong");
    sender.textContent = message.sender;
    const text = document.createElement("p");
    text.textContent = message.text;
    const meta = document.createElement("span");
    meta.className = "message-meta";
    const time = document.createElement("time");
    time.textContent = message.time;
    meta.append(time);
    if (message.own) {
      const receipt = document.createElement("i");
      receipt.className = `fa-solid ${message.read ? "fa-check-double" : "fa-check"} message-receipt`;
      meta.append(receipt);
    }
    bubble.append(sender, text, meta);
    messageList.append(bubble);
  }

  function updateUnreadCount() {
    const total = [...document.querySelectorAll("[data-chat-id]")].reduce((sum, item) => sum + Number(item.dataset.unread || 0), 0);
    document.getElementById("unreadCount").textContent = String(total);
    navBadge.textContent = total ? String(total) : "";
    navBadge.hidden = total === 0;
  }

  function applyConversationFilter() {
    const query = document.getElementById("chatSearch").value.trim().toLocaleLowerCase("de");
    let visible = 0;
    document.querySelectorAll("[data-chat-id]").forEach((button) => {
      const matchesText = !query || button.dataset.search.includes(query);
      const matchesFilter = activeFilter === "all"
        || (activeFilter === "unread" && Number(button.dataset.unread) > 0)
        || (activeFilter === "groups" && button.dataset.chatType === "groups");
      button.hidden = !(matchesText && matchesFilter);
      if (!button.hidden) visible += 1;
    });
    document.getElementById("emptyConversations").hidden = visible !== 0;
  }

  async function refreshTeamChat(markRead = false) {
    const requestGeneration = ++teamRefreshGeneration;
    const access = window.TimeFlowTeamAccess;
    const organizationId = String(access?.membership?.organization_id || "");
    if (!platformSession || document.body.dataset.appMode !== "team" || !access?.allowed || !organizationId) {
      clearPlatformDemoChat(platformSession ? "Der Chat ist nur im Teammodus mit bestätigter Teammitgliedschaft verfügbar." : "Melde dich an und tritt einem Team bei, um den gemeinsamen Chat zu nutzen.");
      return false;
    }
    try {
      const response = await fetch(new URL("api/team-chat", document.baseURI), { cache: "no-store", headers: { Accept: "application/json" } });
      if (response.status === 403) { clearPlatformDemoChat("Der Teamzugang konnte nicht bestätigt werden. Prüfe deine Teameinladung."); return false; }
      if (!response.ok) throw new Error("chat_unavailable");
      const data = await response.json();
      if (requestGeneration !== teamRefreshGeneration || document.body.dataset.appMode !== "team") return false;
      if (!data.team?.id || data.team.id !== organizationId) throw new Error("chat_team_mismatch");
      activeTeamId = data.team.id;
      document.getElementById("messageInput").disabled = false;
      chatPage.querySelector(".send-button").disabled = false;
      teamMessages = Array.isArray(data.messages) ? data.messages : [];
      const list = document.getElementById("conversationList");
      list.replaceChildren();
      const item = document.createElement("button"); item.type = "button"; item.dataset.chatId = "team"; item.dataset.chatType = "groups"; item.dataset.unread = String(markRead ? 0 : Number(data.unread || 0)); item.dataset.search = String(data.team.name || "Team").toLocaleLowerCase("de"); item.setAttribute("aria-pressed", "true");
      item.innerHTML = '<span class="conversation-avatar team-avatar"><i class="fa-solid fa-users"></i></span><span class="conversation-copy"><span><strong></strong><time></time></span><small></small></span>';
      item.querySelector("strong").textContent = data.team.name;
      const lastMessage = teamMessages.at(-1);
      item.querySelector("time").textContent = lastMessage ? new Date(lastMessage.created_at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "";
      item.querySelector("small").textContent = lastMessage ? `${lastMessage.sender_name}: ${lastMessage.message}` : "Noch keine Nachrichten";
      if (Number(item.dataset.unread)) { const badge = document.createElement("em"); badge.className = "conversation-badge"; badge.textContent = item.dataset.unread; item.append(badge); }
      list.append(item);
      const unread = markRead ? 0 : Number(data.unread || 0);
      conversations.team = { name: data.team.name, status: unread ? `${unread} ungelesene Nachrichten` : "Gemeinsamer Teamchat", messages: teamMessages.map((message) => ({ sender: message.sender_name, text: message.message, own: message.sender_id === platformUserId, time: new Date(message.created_at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) })) };
      renderConversation("team", false);
      chatPage.classList.remove("chat-backend-unavailable");
      const note = chatPage.querySelector(".chat-demo-note"); if (note) note.textContent = "Nachrichten werden für alle bestätigten Mitglieder dieses Teams gemeinsam gespeichert.";
      if (markRead && unread) await fetch(new URL("api/team-chat", document.baseURI), { method: "PUT", headers: { Accept: "application/json" } });
      if (!teamRefreshTimer) teamRefreshTimer = window.setInterval(() => { if (document.visibilityState === "visible" && navigator.onLine) refreshTeamChat(!chatPage.classList.contains("hidden")); }, 8000);
      return true;
    } catch (_error) {
      clearPlatformDemoChat(navigator.onLine ? "Der Teamchat ist gerade nicht erreichbar. Bitte versuche es erneut." : "Für den gemeinsamen Chat brauchst du eine Internetverbindung.");
      return false;
    }
  }

  async function sendMessage(text) {
    const message = String(text || "").trim();
    if (!message) return;
    if (!activeTeamId || !navigator.onLine) { notify("Nachrichten können nur mit Internetverbindung gesendet werden."); return; }
    const input = document.getElementById("messageInput");
    const button = chatPage.querySelector(".send-button"); button.disabled = true;
    try {
      const response = await fetch(new URL("api/team-chat", document.baseURI), { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ message }) });
      if (response.status === 429) throw new Error("Du hast gerade viele Nachrichten gesendet. Bitte warte kurz.");
      if (!response.ok) throw new Error("Die Nachricht konnte nicht gesendet werden.");
      input.value = "";
      await refreshTeamChat(false);
    } catch (error) { notify(error instanceof Error ? error.message : "Die Nachricht konnte nicht gesendet werden."); }
    finally { button.disabled = false; input.focus(); }
  }

  document.addEventListener("timeflow:send-team-message", (event) => {
    const text = String(event.detail?.text || "").trim();
    if (!text) return;
    sendMessage(text);
  });
  document.getElementById("conversationList").addEventListener("click", (event) => { if (event.target.closest("[data-chat-id]")) { refreshTeamChat(true); chatPage.classList.add("thread-open"); } });

  document.getElementById("chatSearch")?.addEventListener("input", applyConversationFilter);
  document.querySelectorAll("[data-chat-filter]").forEach((button) => button.addEventListener("click", () => {
    activeFilter = button.dataset.chatFilter;
    document.querySelectorAll("[data-chat-filter]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    applyConversationFilter();
  }));

  document.getElementById("messageForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    sendMessage(document.getElementById("messageInput").value);
  });

  document.querySelectorAll("[data-smart-reply]").forEach((button) => button.addEventListener("click", () => {
    const reply = button.dataset.smartReply;
    if (reply === "swap") sendMessage("Ich möchte eine Schicht tauschen.");
    if (reply === "late") sendMessage("Ich komme voraussichtlich 10 Minuten später.");
  }));

  chatPage.querySelector("[data-close-thread]")?.addEventListener("click", () => chatPage.classList.remove("thread-open"));
  chatPage.querySelector("[data-emoji]")?.addEventListener("click", () => {
    const input = document.getElementById("messageInput");
    input.value += " 😊";
    input.focus();
  });
  chatPage.querySelector("[data-attachment]")?.addEventListener("click", () => notify("Anhänge folgen mit der Server-Anbindung."));
  chatPage.querySelector("[data-thread-search]")?.addEventListener("click", () => {
    chatPage.classList.remove("thread-open");
    document.getElementById("chatSearch").focus();
  });
  chatPage.querySelector("[data-thread-info]")?.addEventListener("click", () => notify(conversations.team?.name || "Teamchat"));
  document.addEventListener("timeflow:session-ready", (event) => {
    platformSession = event.detail?.source === "platform";
    if (platformSession) refreshTeamChat(false); else clearPlatformDemoChat();
    if (new URL(location.href).searchParams.get("open") === "chat") {
      showPage("chat"); setNavActive("chat");
      history.replaceState({}, "", location.pathname + location.hash);
    }
  });
  navigator.serviceWorker?.addEventListener("message", (event) => {
    if (event.data?.type === "TIMEFLOW_NOTIFICATION_OPEN" && event.data.action === "chat") document.dispatchEvent(new CustomEvent("timeflow:open-chat"));
  });
  document.addEventListener("timeflow:team-access", () => refreshTeamChat(false));
  document.addEventListener("timeflow:mode-changed", (event) => {
    if (event.detail?.mode === "team") refreshTeamChat(false); else clearPlatformDemoChat("Der Chat ist nur im Teammodus verfügbar.");
  });
  chatPage.querySelector("[data-shift-details]")?.addEventListener("click", () => notify("Schichtinformationen werden hier angezeigt, sobald ein gemeinsamer Dienstplan verbunden ist."));

  document.addEventListener("timeflow:session-ready", (event) => { platformUserId = String(event.detail?.user?.id || ""); });
  renderConversation("team", window.matchMedia("(min-width: 621px)").matches);
  updateUnreadCount();

  function notify(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 3200);
  }
});

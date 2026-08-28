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
          <button type="button" data-chat-filter="unread">Ungelesen <span id="unreadCount">3</span></button>
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
          <div class="inbox-highlight">
            <span class="highlight-icon"><i class="fa-solid fa-briefcase"></i></span>
            <span><small>Nächste Schicht</small><strong>Fr., 07:30 – 15:00</strong></span>
            <span class="team-live"><i></i> 5 online</span>
          </div>
          <div class="conversation-list" id="conversationList">
            <button type="button" data-chat-id="restaurant" data-chat-type="groups" data-unread="2" data-search="team restaurant dienstplan frühschicht" aria-pressed="true">
              <span class="conversation-avatar team-avatar"><i class="fa-solid fa-users"></i></span>
              <span class="conversation-copy">
                <span><strong>Team Restaurant</strong><time>08:31</time></span>
                <small><b>Anna:</b> Der Dienstplan ist aktualisiert.</small>
              </span>
              <em class="conversation-badge">2</em>
            </button>
            <button type="button" data-chat-id="anna" data-chat-type="direct" data-unread="0" data-search="anna müller geburtstag">
              <span class="conversation-avatar anna-avatar">AM<i class="presence-dot"></i></span>
              <span class="conversation-copy">
                <span><strong>Anna Müller</strong><time>Gestern</time></span>
                <small><i class="fa-solid fa-check-double read-mark"></i> Danke für die Info! 😊</small>
              </span>
            </button>
            <button type="button" data-chat-id="leitung" data-chat-type="groups" data-unread="1" data-search="abteilungsleitung freigabe urlaub">
              <span class="conversation-avatar lead-avatar">AL</span>
              <span class="conversation-copy">
                <span><strong>Abteilungsleitung</strong><time>Mo.</time></span>
                <small>Dein Urlaubsantrag wurde genehmigt.</small>
              </span>
              <em class="conversation-badge">1</em>
            </button>
            <button type="button" data-chat-id="thomas" data-chat-type="direct" data-unread="0" data-search="thomas becker jubiläum frühschicht">
              <span class="conversation-avatar thomas-avatar">TB</span>
              <span class="conversation-copy">
                <span><strong>Thomas Becker</strong><time>Fr.</time></span>
                <small><i class="fa-solid fa-check-double read-mark"></i> Bis morgen in der Frühschicht.</small>
              </span>
            </button>
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
              <strong id="threadName">Team Restaurant</strong>
              <small id="threadStatus"><i></i> 5 von 8 Mitgliedern online</small>
            </div>
            <button type="button" class="thread-action" data-thread-search aria-label="Im Chat suchen">
              <i class="fa-solid fa-magnifying-glass"></i>
            </button>
            <button type="button" class="thread-action" data-thread-info aria-label="Chatinformationen">
              <i class="fa-solid fa-circle-info"></i>
            </button>
          </header>

          <div class="work-context">
            <span><i class="fa-solid fa-wand-magic-sparkles"></i></span>
            <div><small>TimeFlow erkennt den Arbeitskontext</small><strong>Frühschicht am Freitag · 07:30 Uhr</strong></div>
            <button type="button" data-shift-details>Öffnen</button>
          </div>

          <div class="message-list" id="messageList"></div>

          <div class="smart-replies" aria-label="Schnellaktionen">
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
            <button type="submit" class="send-button" aria-label="Nachricht lokal senden">
              <i class="fa-solid fa-paper-plane"></i>
            </button>
          </form>
        </article>
      </div>

      <p class="chat-demo-note">
        <i class="fa-solid fa-shield-halved"></i>
        Diese Vorschau speichert Nachrichten ausschließlich auf deinem Gerät.
      </p>

      <dialog class="new-chat-dialog" id="newChatDialog" aria-labelledby="newChatTitle">
        <header><div><small>Neue Unterhaltung</small><h2 id="newChatTitle">Wen möchtest du erreichen?</h2></div><button type="button" data-close-dialog aria-label="Schließen"><i class="fa-solid fa-xmark"></i></button></header>
        <div>
          <button type="button" data-start-chat="restaurant"><span class="conversation-avatar team-avatar"><i class="fa-solid fa-users"></i></span><span><strong>Team Restaurant</strong><small>8 Mitglieder</small></span><i class="fa-solid fa-chevron-right"></i></button>
          <button type="button" data-start-chat="anna"><span class="conversation-avatar anna-avatar">AM</span><span><strong>Anna Müller</strong><small>Online</small></span><i class="fa-solid fa-chevron-right"></i></button>
          <button type="button" data-start-chat="thomas"><span class="conversation-avatar thomas-avatar">TB</span><span><strong>Thomas Becker</strong><small>Zuletzt gestern</small></span><i class="fa-solid fa-chevron-right"></i></button>
        </div>
      </dialog>
    </section>
  `);

  const CHAT_STORAGE_KEY = "timeflow-chat-demo-v2";
  const SHIFT_STORAGE_KEY = "timeflow-chat-shift-confirmed-v1";
  const schedulePage = document.getElementById("schedulePage");
  const chatPage = document.getElementById("chatPage");
  const homeNav = document.querySelector('[data-target="home"]');
  const scheduleNav = document.querySelector('[data-target="schedule"]');
  const clockNav = document.querySelector('[data-target="clock"]');
  const chatNav = document.querySelector('[data-target="chat"]');
  const profileNav = document.querySelector('[data-target="profile"]');
  const messageList = document.getElementById("messageList");
  const chatDialog = document.getElementById("newChatDialog");

  const conversations = {
    restaurant: {
      name: "Team Restaurant",
      status: "5 von 8 Mitgliedern online",
      online: true,
      avatar: "group",
      messages: [
        { type: "date", text: "Heute" },
        { sender: "Anna", text: "Guten Morgen zusammen! Der Dienstplan für August ist aktualisiert.", time: "08:27" },
        { type: "shift", sender: "TimeFlow Plan" },
        { sender: "Thomas", text: "Danke! Meine Schicht am Freitag passt.", time: "08:29" },
        { sender: "Du", text: "Perfekt, danke für die schnelle Rückmeldung.", time: "08:31", own: true, read: true }
      ]
    },
    anna: {
      name: "Anna Müller",
      status: "Online",
      online: true,
      avatar: "AM",
      messages: [
        { type: "date", text: "Gestern" },
        { sender: "Du", text: "Alles Gute schon einmal für morgen!", time: "17:42", own: true, read: true },
        { sender: "Anna", text: "Danke für die Info! 😊", time: "17:44" }
      ]
    },
    leitung: {
      name: "Abteilungsleitung",
      status: "Zuletzt heute um 07:52",
      avatar: "AL",
      avatarClass: "lead-avatar",
      messages: [
        { type: "date", text: "Montag" },
        { sender: "Abteilungsleitung", text: "Dein Urlaubsantrag vom 15. August wurde genehmigt.", time: "09:12" },
        { sender: "Du", text: "Vielen Dank für die Rückmeldung.", time: "09:16", own: true, read: true }
      ]
    },
    thomas: {
      name: "Thomas Becker",
      status: "Zuletzt gestern um 18:14",
      avatar: "TB",
      avatarClass: "thomas-avatar",
      messages: [
        { type: "date", text: "Freitag" },
        { sender: "Thomas", text: "Bis morgen in der Frühschicht.", time: "16:02" },
        { sender: "Du", text: "Alles klar, bis morgen!", time: "16:05", own: true, read: true }
      ]
    }
  };

  const storedMessages = loadStoredMessages();
  let activeChat = "restaurant";
  let activeFilter = "all";
  let shiftConfirmed = localStorage.getItem(SHIFT_STORAGE_KEY) === "true";

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

  function loadStoredMessages() {
    try {
      const value = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY));
      return value && typeof value === "object" ? value : {};
    } catch {
      return {};
    }
  }

  function renderConversation(id, markRead = true) {
    activeChat = id;
    const conversation = conversations[id];
    if (!conversation) return;

    document.getElementById("threadName").textContent = conversation.name;
    const status = document.getElementById("threadStatus");
    status.replaceChildren();
    if (conversation.online) {
      const dot = document.createElement("i");
      status.append(dot);
    }
    status.append(document.createTextNode(conversation.status));

    const avatar = document.getElementById("threadAvatar");
    avatar.className = `conversation-avatar ${conversation.avatar === "group" ? "team-avatar" : conversation.avatarClass || "anna-avatar"}`;
    avatar.replaceChildren();
    if (conversation.avatar === "group") {
      const icon = document.createElement("i");
      icon.className = "fa-solid fa-users";
      avatar.append(icon);
    } else {
      avatar.append(document.createTextNode(conversation.avatar));
    }

    const hasShiftContext = id === "restaurant";
    chatPage.querySelector(".work-context").hidden = !hasShiftContext;
    chatPage.querySelectorAll('[data-smart-reply="confirm"], [data-smart-reply="swap"]').forEach((button) => {
      button.hidden = !hasShiftContext;
    });

    messageList.replaceChildren();
    [...conversation.messages, ...(storedMessages[id] || [])].forEach((message) => renderMessage(message));

    document.querySelectorAll("[data-chat-id]").forEach((button) => {
      const selected = button.dataset.chatId === id;
      button.setAttribute("aria-pressed", String(selected));
      if (selected && markRead) {
        button.dataset.unread = "0";
        button.querySelector(".conversation-badge")?.remove();
      }
    });

    updateUnreadCount();
    applyConversationFilter();
    messageList.scrollTop = messageList.scrollHeight;
  }

  function renderMessage(message) {
    if (message.type === "date") {
      const separator = document.createElement("div");
      separator.className = "message-date";
      separator.textContent = message.text;
      messageList.append(separator);
      return;
    }

    if (message.type === "shift") {
      const card = document.createElement("article");
      card.className = "inline-shift-card";
      card.innerHTML = `
        <header><span><i class="fa-solid fa-calendar-check"></i></span><div><small>Schicht geteilt von ${message.sender}</small><strong>Frühschicht</strong></div></header>
        <div class="shift-time"><span><small>Freitag</small><strong>31. Juli</strong></span><i></i><span><small>Arbeitszeit</small><strong>07:30 – 15:00</strong></span></div>
        <p><i class="fa-solid fa-location-dot"></i> Restaurant <span>·</span> 30 Min. Pause</p>
        <button type="button" data-confirm-shift${shiftConfirmed ? " disabled" : ""}><i class="fa-solid ${shiftConfirmed ? "fa-circle-check" : "fa-check"}"></i> ${shiftConfirmed ? "Schicht bestätigt" : "Teilnahme bestätigen"}</button>
      `;
      messageList.append(card);
      return;
    }

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

  function sendMessage(text, confirmation = "Nachricht wurde lokal gespeichert.") {
    const cleanText = text.trim();
    if (!cleanText) return;
    storedMessages[activeChat] ||= [];
    storedMessages[activeChat].push({
      sender: "Du",
      text: cleanText,
      time: new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
      own: true,
      read: false
    });
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(storedMessages));
    renderConversation(activeChat, false);
    updateConversationPreview(activeChat, cleanText);
    notify(confirmation);
  }

  function updateConversationPreview(id, text) {
    const item = document.querySelector(`[data-chat-id="${id}"]`);
    const preview = item?.querySelector(".conversation-copy small");
    const time = item?.querySelector(".conversation-copy time");
    if (preview) {
      preview.replaceChildren();
      const receipt = document.createElement("i");
      receipt.className = "fa-solid fa-check read-mark";
      preview.append(receipt, document.createTextNode(` ${text}`));
    }
    if (time) time.textContent = "Jetzt";
  }

  document.addEventListener("timeflow:send-team-message", (event) => {
    const text = String(event.detail?.text || "").trim();
    if (!text) return;
    storedMessages.restaurant ||= [];
    storedMessages.restaurant.push({
      sender: "Du",
      text,
      time: new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
      own: true,
      read: false
    });
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(storedMessages));
    updateConversationPreview("restaurant", text);
    if (activeChat === "restaurant") renderConversation("restaurant", false);
    notify(event.detail?.confirmation || "Meldung wurde im Teamchat gespeichert.");
  });

  function confirmShift() {
    if (shiftConfirmed) {
      notify("Diese Schicht ist bereits bestätigt.");
      return;
    }
    shiftConfirmed = true;
    localStorage.setItem(SHIFT_STORAGE_KEY, "true");
    sendMessage("Ich habe meine Frühschicht am Freitag bestätigt.", "Schicht bestätigt und im Chat geteilt.");
  }

  document.querySelectorAll("[data-chat-id]").forEach((button) => button.addEventListener("click", () => {
    renderConversation(button.dataset.chatId);
    chatPage.classList.add("thread-open");
  }));

  document.getElementById("chatSearch")?.addEventListener("input", applyConversationFilter);
  document.querySelectorAll("[data-chat-filter]").forEach((button) => button.addEventListener("click", () => {
    activeFilter = button.dataset.chatFilter;
    document.querySelectorAll("[data-chat-filter]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    applyConversationFilter();
  }));

  document.getElementById("messageForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.getElementById("messageInput");
    sendMessage(input.value);
    input.value = "";
  });

  messageList.addEventListener("click", (event) => {
    if (event.target.closest("[data-confirm-shift]")) confirmShift();
  });

  document.querySelectorAll("[data-smart-reply]").forEach((button) => button.addEventListener("click", () => {
    const reply = button.dataset.smartReply;
    if (reply === "confirm") confirmShift();
    if (reply === "swap") sendMessage("Kann jemand meine Frühschicht am Freitag übernehmen?", "Tauschanfrage wurde lokal im Team geteilt.");
    if (reply === "late") sendMessage("Ich komme heute voraussichtlich 10 Minuten später.", "Verspätung wurde lokal im Chat geteilt.");
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
  chatPage.querySelector("[data-thread-info]")?.addEventListener("click", () => notify("Team Restaurant · 8 Mitglieder · Benachrichtigungen aktiv"));
  chatPage.querySelector("[data-shift-details]")?.addEventListener("click", () => notify("Frühschicht: Freitag, 31. Juli · 07:30 – 15:00 Uhr · Restaurant"));

  chatPage.querySelector("[data-new-chat]")?.addEventListener("click", () => {
    if (typeof chatDialog.showModal === "function") chatDialog.showModal();
  });
  chatPage.querySelector("[data-close-dialog]")?.addEventListener("click", () => chatDialog.close());
  chatPage.querySelectorAll("[data-start-chat]").forEach((button) => button.addEventListener("click", () => {
    chatDialog.close();
    renderConversation(button.dataset.startChat);
    chatPage.classList.add("thread-open");
  }));
  chatDialog.addEventListener("click", (event) => {
    if (event.target === chatDialog) chatDialog.close();
  });

  renderConversation("restaurant", window.matchMedia("(min-width: 621px)").matches);
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

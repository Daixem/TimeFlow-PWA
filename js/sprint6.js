"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const dashboard = document.getElementById("dashboard");
  const anchor = dashboard?.querySelector(".shift-grid");
  if (!dashboard || !anchor) return;

  anchor.insertAdjacentHTML("beforebegin", `
    <section class="quick-actions-card" aria-labelledby="quickActionsTitle">
      <header>
        <div><span><i class="fa-solid fa-bolt"></i> Schnellzugriff</span><h2 id="quickActionsTitle">Schnellaktionen</h2><p>Wichtige Anliegen in wenigen Sekunden erledigen.</p></div>
        <button type="button" data-quick-history><i class="fa-solid fa-clock-rotate-left"></i> Verlauf <b id="quickActionCount" hidden>0</b></button>
      </header>
      <div class="quick-actions-grid">
        <button type="button" data-quick-action="vacation"><span class="quick-action-icon vacation"><i class="fa-solid fa-umbrella-beach"></i></span><span><strong>Urlaub</strong><small>Antrag stellen</small></span><i class="fa-solid fa-chevron-right"></i></button>
        <button type="button" data-quick-action="late"><span class="quick-action-icon late"><i class="fa-solid fa-person-running"></i></span><span><strong>Verspätung</strong><small>Persönlich vormerken</small></span><i class="fa-solid fa-chevron-right"></i></button>
        <button type="button" data-quick-action="swap"><span class="quick-action-icon swap"><i class="fa-solid fa-arrow-right-arrow-left"></i></span><span><strong>Schichttausch</strong><small>Persönlich vormerken</small></span><i class="fa-solid fa-chevron-right"></i></button>
        <button type="button" data-quick-action="sick"><span class="quick-action-icon sick"><i class="fa-solid fa-kit-medical"></i></span><span><strong>Krankmeldung</strong><small>Persönlich vormerken</small></span><i class="fa-solid fa-chevron-right"></i></button>
      </div>
      <div class="quick-last-action" id="quickLastAction"><span><i class="fa-regular fa-circle-check"></i></span><div><strong>Noch keine Schnellaktion</strong><p>Dein letzter Vorgang erscheint nach dem Absenden hier.</p></div></div>
    </section>
  `);

  dashboard.insertAdjacentHTML("beforeend", `
    <dialog class="quick-action-dialog" id="quickActionDialog" aria-labelledby="quickDialogTitle">
      <form id="quickActionForm">
        <header>
          <span class="quick-dialog-icon" id="quickDialogIcon"><i class="fa-solid fa-bolt"></i></span>
          <div><small id="quickDialogEyebrow">Schnellaktion</small><h2 id="quickDialogTitle">Anliegen erfassen</h2><p id="quickDialogCopy"></p></div>
          <button type="button" data-close-quick-dialog aria-label="Schließen"><i class="fa-solid fa-xmark"></i></button>
        </header>
        <div class="quick-action-fields" id="quickActionFields"></div>
        <footer id="quickDialogFooter"><button type="button" class="quick-cancel" data-close-quick-dialog>Abbrechen</button><button type="submit" class="quick-submit" id="quickSubmitButton"><i class="fa-solid fa-paper-plane"></i> Absenden</button></footer>
      </form>
    </dialog>
  `);

  const STORAGE_KEY = "timeflow-quick-actions-v1";
  const dialog = document.getElementById("quickActionDialog");
  const form = document.getElementById("quickActionForm");
  const fields = document.getElementById("quickActionFields");
  const footer = document.getElementById("quickDialogFooter");
  const icon = document.getElementById("quickDialogIcon");
  const title = document.getElementById("quickDialogTitle");
  const copy = document.getElementById("quickDialogCopy");
  const submitButton = document.getElementById("quickSubmitButton");
  const count = document.getElementById("quickActionCount");
  const lastAction = document.getElementById("quickLastAction");
  let currentAction = null;
  let records = loadRecords();

  function privateMode() {
    try { return JSON.parse(window.TimeFlowPlatform.storage.getItem("timeflow-settings-v1"))?.appMode === "private"; }
    catch { return false; }
  }

  const actions = {
    vacation: {
      title: "Urlaub beantragen", icon: "fa-umbrella-beach", accent: "vacation", submit: "Antrag senden",
      copy: "Wähle deinen Zeitraum. Der Eintrag wird nur auf diesem Gerät gespeichert und nicht an ein Team gesendet.",
      fields: `
        <div class="quick-field-row"><label><span>Erster Urlaubstag</span><input name="start" type="date" required></label><label><span>Letzter Urlaubstag</span><input name="end" type="date" required></label></div>
        <label><span>Urlaubsart</span><select name="kind"><option>Erholungsurlaub</option><option>Sonderurlaub</option><option>Unbezahlter Urlaub</option></select></label>
        <label><span>Hinweis <em>optional</em></span><textarea name="note" rows="3" maxlength="180" placeholder="Kurzer Hinweis an die Personalplanung"></textarea></label>`,
      makeSummary: (data) => `${formatDate(data.get("start"))} – ${formatDate(data.get("end"))}`,
      status: "Lokal gespeichert · nicht übermittelt"
    },
    late: {
      title: "Verspätung vormerken", icon: "fa-person-running", accent: "late", submit: "Lokal vormerken",
      copy: "Gib deine voraussichtliche Verspätung an. Der Eintrag bleibt auf diesem Gerät; das Team wird nicht benachrichtigt.",
      fields: `
        <label><span>Voraussichtliche Verspätung</span><select name="minutes" required><option value="5">5 Minuten</option><option value="10">10 Minuten</option><option value="15">15 Minuten</option><option value="30">30 Minuten</option><option value="45">45 Minuten</option><option value="60">60 Minuten</option></select></label>
        <label><span>Grund <em>optional</em></span><textarea name="note" rows="3" maxlength="180" placeholder="Zum Beispiel: Zugausfall"></textarea></label>
        <p class="quick-info"><i class="fa-solid fa-circle-info"></i><span><strong>Nur auf diesem Gerät</strong><small>Es wird keine Nachricht an das Team gesendet.</small></span></p>`,
      makeSummary: (data) => `ca. ${data.get("minutes")} Minuten`,
      status: "Lokal gespeichert · nicht übermittelt"
    },
    swap: {
      title: "Schichttausch vormerken", icon: "fa-arrow-right-arrow-left", accent: "swap", submit: "Lokal vormerken",
      copy: "Halte deinen Tauschwunsch fest. Er wird nicht an andere Teammitglieder übermittelt.",
      fields: `
        <label><span>Meine Schicht</span><input name="shift" type="text" maxlength="100" required placeholder="Zum Beispiel: Montag, 07:30–15:00"></label>
        <label><span>Gewünschter Tauschtag</span><input name="wanted" type="date" required></label>
        <label><span>Hinweis <em>optional</em></span><textarea name="note" rows="3" maxlength="180" placeholder="Welche Zeiten passen für dich?"></textarea></label>
        <p class="quick-info"><i class="fa-solid fa-circle-info"></i><span><strong>Nur auf diesem Gerät</strong><small>Es wird keine Tauschanfrage an das Team gesendet.</small></span></p>`,
      makeSummary: (data) => `${data.get("shift")} → ${formatDate(data.get("wanted"))}`,
      status: "Lokal gespeichert · nicht übermittelt"
    },
    sick: {
      title: "Krankmeldung erfassen", icon: "fa-kit-medical", accent: "sick", submit: "Abwesenheit melden",
      copy: "Halte deine voraussichtliche Abwesenheit persönlich fest. Der Eintrag wird nicht an ein Team übermittelt.",
      fields: `
        <div class="quick-field-row"><label><span>Erster Fehltag</span><input name="start" type="date" required></label><label><span>Voraussichtlich</span><select name="duration"><option value="1 Tag">1 Tag</option><option value="2 Tage">2 Tage</option><option value="3 Tage">3 Tage</option><option value="noch offen">Noch offen</option></select></label></div>
        <label><span>Hinweis <em>optional</em></span><textarea name="note" rows="3" maxlength="180" placeholder="Keine medizinischen Details erforderlich"></textarea></label>
        <p class="quick-info privacy"><i class="fa-solid fa-shield-halved"></i><span><strong>Datensparsam</strong><small>Die Meldung bleibt lokal; teile keine Diagnose oder sensiblen Gesundheitsdaten.</small></span></p>`,
      makeSummary: (data) => `${formatDate(data.get("start"))} · ${data.get("duration")}`,
      status: "Lokal gespeichert · nicht übermittelt"
    }
  };

  function loadRecords() {
    try {
      const value = JSON.parse(window.TimeFlowPlatform.storage.getItem(STORAGE_KEY));
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function saveRecords() {
    window.TimeFlowPlatform.storage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, 30)));
  }

  function formatDate(value) {
    if (!value) return "–";
    const date = new Date(`${value}T12:00:00`);
    return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  function notify(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 3400);
  }

  function renderLatest() {
    const latest = records[0];
    count.hidden = records.length === 0;
    count.textContent = String(records.length);
    lastAction.replaceChildren();
    const badge = document.createElement("span");
    const badgeIcon = document.createElement("i");
    badgeIcon.className = `fa-solid ${latest ? actions[latest.type]?.icon || "fa-check" : "fa-circle-check"}`;
    badge.append(badgeIcon);
    const content = document.createElement("div");
    const heading = document.createElement("strong");
    const description = document.createElement("p");
    if (latest) {
      heading.textContent = `${latest.title} · ${latest.status}`;
      description.textContent = `${latest.summary} · ${latest.createdLabel}`;
      lastAction.classList.add("has-entry");
    } else {
      heading.textContent = "Noch keine Schnellaktion";
      description.textContent = "Dein letzter Vorgang erscheint nach dem Absenden hier.";
      lastAction.classList.remove("has-entry");
    }
    content.append(heading, description);
    lastAction.append(badge, content);
  }

  function openAction(type) {
    const action = actions[type];
    if (!action) return;
    if (privateMode() && ["late", "swap"].includes(type)) {
      notify("Diese Teamfunktion ist im Privatmodus ausgeblendet.");
      return;
    }
    currentAction = type;
    dialog.className = `quick-action-dialog ${action.accent}`;
    icon.className = `quick-dialog-icon ${action.accent}`;
    icon.innerHTML = `<i class="fa-solid ${action.icon}"></i>`;
    title.textContent = action.title;
    copy.textContent = action.copy;
    fields.innerHTML = action.fields;
    footer.hidden = false;
    submitButton.innerHTML = `<i class="fa-solid fa-paper-plane"></i> ${action.submit}`;
    if (privateMode() && type === "vacation") {
      title.textContent = "Urlaub eintragen";
      copy.textContent = "Trage deinen persönlichen Urlaubszeitraum ein. Der Eintrag bleibt auf deinem Gerät verfügbar.";
      submitButton.innerHTML = '<i class="fa-solid fa-calendar-check"></i> Eintragen';
      fields.querySelector('textarea[name="note"]')?.setAttribute("placeholder", "Persönliche Notiz");
    }
    if (privateMode() && type === "sick") {
      title.textContent = "Krankheit eintragen";
      copy.textContent = "Erfasse deine Abwesenheit ausschließlich für deine persönliche Arbeitszeitübersicht.";
      submitButton.innerHTML = '<i class="fa-solid fa-calendar-check"></i> Eintragen';
    }
    setDefaultDates();
    window.TimeFlowPlatform.dialog.open(dialog);
    fields.querySelector("input, select, textarea")?.focus();
  }

  function setDefaultDates() {
    const today = new Date().toLocaleDateString("sv-SE");
    fields.querySelectorAll('input[type="date"]').forEach((input, index) => {
      input.min = today;
      if (!input.value) {
        const date = new Date();
        date.setDate(date.getDate() + (currentAction === "vacation" ? 7 + index * 4 : index));
        input.value = date.toLocaleDateString("sv-SE");
      }
    });
  }

  function openHistory() {
    currentAction = "history";
    dialog.className = "quick-action-dialog history";
    icon.className = "quick-dialog-icon history";
    icon.innerHTML = '<i class="fa-solid fa-clock-rotate-left"></i>';
    title.textContent = "Deine Schnellaktionen";
    copy.textContent = "Die letzten lokal gespeicherten Vorgänge auf diesem Gerät.";
    footer.hidden = true;
    fields.replaceChildren();
    if (!records.length) {
      const empty = document.createElement("p");
      empty.className = "quick-history-empty";
      empty.textContent = "Du hast noch keine Schnellaktion abgesendet.";
      fields.append(empty);
    } else {
      const list = document.createElement("div");
      list.className = "quick-history-list";
      records.forEach((record) => {
        const item = document.createElement("article");
        const itemIcon = document.createElement("span");
        itemIcon.className = `quick-history-icon ${record.type}`;
        itemIcon.innerHTML = `<i class="fa-solid ${actions[record.type]?.icon || "fa-check"}"></i>`;
        const body = document.createElement("div");
        const heading = document.createElement("strong");
        heading.textContent = record.title;
        const summary = document.createElement("p");
        summary.textContent = record.summary;
        const meta = document.createElement("small");
        meta.textContent = record.createdLabel;
        body.append(heading, summary, meta);
        const status = document.createElement("em");
        status.textContent = record.status;
        item.append(itemIcon, body, status);
        list.append(item);
      });
      fields.append(list);
    }
    window.TimeFlowPlatform.dialog.open(dialog);
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const action = actions[currentAction];
    if (!action || !form.reportValidity()) return;
    const data = new FormData(form);
    if (currentAction === "vacation" && String(data.get("end")) < String(data.get("start"))) {
      notify("Der letzte Urlaubstag darf nicht vor dem ersten liegen.");
      fields.querySelector('[name="end"]')?.focus();
      return;
    }
    const personalRecord = privateMode();
    const record = {
      id: window.crypto?.randomUUID?.() || `qa-${Date.now()}`,
      type: currentAction,
      title: privateMode() && currentAction === "vacation" ? "Urlaub eingetragen" : privateMode() && currentAction === "sick" ? "Krankheit eingetragen" : action.title,
      summary: action.makeSummary(data),
      status: personalRecord ? "Persönlich auf diesem Gerät erfasst" : action.status,
      createdAt: new Date().toISOString(),
      createdLabel: new Date().toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    };
    records.unshift(record);
    saveRecords();
    renderLatest();
    document.dispatchEvent(new CustomEvent("timeflow:create-notification", { detail: {
      type: "success",
      title: personalRecord ? `${action.title} erfasst` : `${action.title} lokal vorgemerkt`,
      body: `${record.summary} · ${record.status}`,
      action: "history"
    } }));
    notify(personalRecord ? "Dein persönlicher Eintrag wurde auf diesem Gerät gespeichert." : "Lokal vorgemerkt. Es wurde nichts an das Team übermittelt.");
    window.TimeFlowPlatform.dialog.close(dialog);
  });

  document.querySelectorAll("[data-quick-action]").forEach((button) => button.addEventListener("click", () => openAction(button.dataset.quickAction)));
  document.querySelector("[data-quick-history]").addEventListener("click", openHistory);
  document.querySelectorAll("[data-close-quick-dialog]").forEach((button) => button.addEventListener("click", () => window.TimeFlowPlatform.dialog.close(dialog)));
  dialog.addEventListener("click", (event) => { if (event.target === dialog) window.TimeFlowPlatform.dialog.close(dialog); });
  document.addEventListener("timeflow:open-quick-actions", (event) => event.detail?.action && event.detail.action !== "history" ? openAction(event.detail.action) : openHistory());
  renderLatest();
});

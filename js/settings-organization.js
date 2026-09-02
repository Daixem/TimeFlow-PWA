(function () {
  "use strict";
  const KEY = "timeflow-settings-v1";
  const storage = () => window.TimeFlowPlatform.storage;
  const read = () => { try { return JSON.parse(storage().getItem(KEY)) || {}; } catch { return {}; } };
  const save = (patch) => { const settings = { ...read(), ...patch }; storage().setItem(KEY, JSON.stringify(settings)); document.dispatchEvent(new CustomEvent("timeflow:settings-updated", { detail: settings })); };
  const words = {
    de: { profile: "Mein Profil", profileCopy: "Deine persönlichen Einstellungen und lokalen Daten.", settings: "Einstellungen", settingsCopy: "Benachrichtigungen, Zeiterfassung und Daten", home: "Home", schedule: "Dienstpläne", quick: "Schnellzugriff", language: "Sprache" },
    en: { profile: "My profile", profileCopy: "Your personal settings and local data.", settings: "Settings", settingsCopy: "Notifications, time tracking and data", home: "Home", schedule: "Schedules", quick: "Quick access", language: "Language" }
  };
  function applyLanguage(language = read().language || "de") {
    const t = words[language] || words.de; document.documentElement.lang = language;
    const set = (selector, value) => { const node = document.querySelector(selector); if (node) node.textContent = value; };
    set("#profileTitle", t.profile); set("#profilePage .profile-page-header p", t.profileCopy);
    set("#profilePage [data-open-settings] strong", t.settings); set("#profilePage [data-open-settings] small", t.settingsCopy);
    set('[data-target="home"] .nav-text', t.home); set('[data-target="schedule"] .nav-text', t.schedule); set('[data-target="profile"] .nav-text', t.profile); set('[data-target="quick"] .nav-text', t.quick);
    document.querySelectorAll("[data-language-select]").forEach((select) => { select.value = language; });
  }
  function languageControl() {
    const details = document.querySelector("#profilePage .profile-details-grid");
    if (details && !details.querySelector(".profile-language-card")) details.insertAdjacentHTML("afterbegin", `<article class="profile-menu-card profile-language-card"><label class="profile-language-select"><span class="menu-icon settings"><i class="fa-solid fa-language"></i></span><span><strong>Sprache</strong><small>Sprache der Benutzeroberfläche</small></span><select data-language-select aria-label="Sprache wählen"><option value="de">Deutsch</option><option value="en">English</option></select></label></article>`);
    const personal = document.querySelector(".personalization-settings-card .settings-list");
    if (personal && !personal.querySelector("[data-language-select]")) personal.insertAdjacentHTML("afterbegin", `<label class="settings-select"><span><strong>Sprache</strong><small>Sprache der Benutzeroberfläche</small></span><select data-language-select><option value="de">Deutsch</option><option value="en">English</option></select></label>`);
    document.querySelectorAll("[data-language-select]").forEach((select) => { if (select.dataset.bound) return; select.dataset.bound = "true"; select.addEventListener("change", () => { save({ language: select.value }); applyLanguage(select.value); }); });
    applyLanguage();
  }
  function groupFor(card) {
    if (card.classList.contains("personalization-settings-card")) return "appearance";
    if (card.matches('[aria-labelledby="timeSettingsTitle"],.legal-settings-card')) return "work";
    if (card.matches('[aria-labelledby="notificationSettingsTitle"]')) return "communication";
    if (card.matches('[aria-labelledby="dataSettingsTitle"]')) return "privacy";
    return "system";
  }
  function makeAccordion(card) {
    if (card.dataset.accordionReady) return; const header = card.querySelector(":scope > header"); if (!header) return;
    const body = document.createElement("div"); body.className = "settings-accordion-body";
    [...card.children].filter((node) => node !== header).forEach((node) => body.append(node)); card.append(body);
    const id = `settings-panel-${Math.random().toString(36).slice(2)}`; body.id = id; header.tabIndex = 0; header.setAttribute("role", "button"); header.setAttribute("aria-controls", id); header.setAttribute("aria-expanded", "false"); header.insertAdjacentHTML("beforeend", '<i class="fa-solid fa-chevron-down settings-chevron" aria-hidden="true"></i>'); body.hidden = true;
    const toggle = () => { const open = header.getAttribute("aria-expanded") !== "true"; header.setAttribute("aria-expanded", String(open)); body.hidden = !open; card.classList.toggle("is-open", open); };
    header.addEventListener("click", toggle); header.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggle(); } }); card.dataset.accordionReady = "true";
  }
  function organize() {
    const layout = document.querySelector("#settingsPage .settings-layout"); if (!layout) return;
    const cards = [...layout.children].filter((node) => node.matches?.(".settings-card")); if (!cards.length) return;
    layout.querySelectorAll(":scope > .settings-group-title").forEach((node) => node.remove());
    const groups = [{ id: "appearance", title: "Darstellung & Sprache" }, { id: "work", title: "Arbeitszeit & Schutz" }, { id: "communication", title: "Benachrichtigungen" }, { id: "system", title: "App & Updates" }, { id: "privacy", title: "Daten & Datenschutz" }];
    groups.forEach((group) => { const members = cards.filter((card) => groupFor(card) === group.id); if (!members.length) return; const title = document.createElement("h2"); title.className = "settings-group-title"; title.textContent = group.title; layout.append(title); members.forEach((card) => { card.dataset.settingsGroup = group.id; layout.append(card); makeAccordion(card); }); });
    languageControl();
  }
  let timer; const schedule = () => { clearTimeout(timer); timer = setTimeout(organize, 60); };
  document.addEventListener("DOMContentLoaded", () => { organize(); const layout = document.querySelector("#settingsPage .settings-layout"); if (layout) new MutationObserver((records) => { if (records.some((record) => [...record.addedNodes].some((node) => node.matches?.(".settings-card:not([data-accordion-ready])")))) schedule(); }).observe(layout, { childList: true }); });
  document.addEventListener("timeflow:settings-updated", () => applyLanguage());
}());

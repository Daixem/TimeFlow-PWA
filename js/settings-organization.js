(function () {
  "use strict";
  const KEY = "timeflow-settings-v1";
  const storage = () => window.TimeFlowPlatform.storage;
  const read = () => { try { return JSON.parse(storage().getItem(KEY)) || {}; } catch { return {}; } };
  const save = (patch) => { const settings = { ...read(), ...patch }; storage().setItem(KEY, JSON.stringify(settings)); document.dispatchEvent(new CustomEvent("timeflow:settings-updated", { detail: settings })); };
  const words = {
    de: { profile: "Mein Profil", profileCopy: "Deine persönlichen Einstellungen und lokalen Daten.", settings: "Einstellungen", settingsCopy: "Benachrichtigungen, Zeiterfassung und Daten", home: "Home", schedule: "Dienstpläne", quick: "Schnellzugriff", language: "Sprache" },
    en: { profile: "My profile", profileCopy: "Your personal settings and local data.", settings: "Settings", settingsCopy: "Notifications, time tracking and data", home: "Home", schedule: "Schedules", quick: "Quick access", language: "Language" },
    fr: { profile: "Mon profil", profileCopy: "Vos paramètres personnels et données locales.", settings: "Paramètres", settingsCopy: "Notifications, temps de travail et données", home: "Accueil", schedule: "Plannings", quick: "Accès rapide", language: "Langue" },
    es: { profile: "Mi perfil", profileCopy: "Tus ajustes personales y datos locales.", settings: "Ajustes", settingsCopy: "Notificaciones, jornada y datos", home: "Inicio", schedule: "Horarios", quick: "Acceso rápido", language: "Idioma" },
    it: { profile: "Il mio profilo", profileCopy: "Impostazioni personali e dati locali.", settings: "Impostazioni", settingsCopy: "Notifiche, orario e dati", home: "Home", schedule: "Turni", quick: "Accesso rapido", language: "Lingua" },
    nl: { profile: "Mijn profiel", profileCopy: "Je persoonlijke instellingen en lokale gegevens.", settings: "Instellingen", settingsCopy: "Meldingen, werktijd en gegevens", home: "Home", schedule: "Roosters", quick: "Snelmenu", language: "Taal" },
    pl: { profile: "Mój profil", profileCopy: "Ustawienia osobiste i dane lokalne.", settings: "Ustawienia", settingsCopy: "Powiadomienia, czas pracy i dane", home: "Start", schedule: "Grafiki", quick: "Szybki dostęp", language: "Język" },
    tr: { profile: "Profilim", profileCopy: "Kişisel ayarlarınız ve yerel verileriniz.", settings: "Ayarlar", settingsCopy: "Bildirimler, çalışma süresi ve veriler", home: "Ana sayfa", schedule: "Vardiyalar", quick: "Hızlı erişim", language: "Dil" },
    ru: { profile: "Мой профиль", profileCopy: "Ваши личные настройки и локальные данные.", settings: "Настройки", settingsCopy: "Уведомления, рабочее время и данные", home: "Главная", schedule: "Графики", quick: "Быстрый доступ", language: "Язык" },
    uk: { profile: "Мій профіль", profileCopy: "Ваші особисті налаштування та локальні дані.", settings: "Налаштування", settingsCopy: "Сповіщення, робочий час і дані", home: "Головна", schedule: "Графіки", quick: "Швидкий доступ", language: "Мова" },
    da: { profile: "Min profil", profileCopy: "Dine personlige indstillinger og lokale data.", settings: "Indstillinger", settingsCopy: "Notifikationer, arbejdstid og data", home: "Hjem", schedule: "Vagtplaner", quick: "Hurtig adgang", language: "Sprog" },
    sv: { profile: "Min profil", profileCopy: "Dina personliga inställningar och lokala data.", settings: "Inställningar", settingsCopy: "Aviseringar, arbetstid och data", home: "Hem", schedule: "Scheman", quick: "Snabbåtkomst", language: "Språk" },
    ar: { profile: "ملفي الشخصي", profileCopy: "إعداداتك الشخصية وبياناتك المحلية.", settings: "الإعدادات", settingsCopy: "الإشعارات وساعات العمل والبيانات", home: "الرئيسية", schedule: "جداول العمل", quick: "وصول سريع", language: "اللغة" },
    "ar-EG": { profile: "ملفي الشخصي", profileCopy: "إعداداتك الشخصية وبياناتك المحلية.", settings: "الإعدادات", settingsCopy: "الإشعارات وساعات العمل والبيانات", home: "الرئيسية", schedule: "جداول العمل", quick: "وصول سريع", language: "العربية المصرية" },
    "ar-AE": { profile: "ملفي الشخصي", profileCopy: "إعداداتك الشخصية وبياناتك المحلية.", settings: "الإعدادات", settingsCopy: "الإشعارات وساعات العمل والبيانات", home: "الرئيسية", schedule: "جداول العمل", quick: "وصول سريع", language: "العربية الخليجية" },
    "ar-MA": { profile: "ملفي الشخصي", profileCopy: "إعداداتك الشخصية وبياناتك المحلية.", settings: "الإعدادات", settingsCopy: "الإشعارات وساعات العمل والبيانات", home: "الرئيسية", schedule: "جداول العمل", quick: "وصول سريع", language: "العربية المغربية" }
  };
  const languageOptions = '<option value="de">Deutsch</option><option value="en">English</option><option value="fr">Français</option><option value="es">Español</option><option value="it">Italiano</option><option value="nl">Nederlands</option><option value="pl">Polski</option><option value="tr">Türkçe</option><option value="ru">Русский</option><option value="uk">Українська</option><option value="da">Dansk</option><option value="sv">Svenska</option><option value="ar">العربية الفصحى</option><option value="ar-EG">العربية المصرية</option><option value="ar-AE">العربية الخليجية</option><option value="ar-MA">العربية المغربية</option>';
  const shellWords = {
    de: ["Guten Morgen", "Schön, dass du da bist.", "Letzter Einsatz", "Nächster Einsatz", "Stunden", "Uhr", "Zeiten", "Stempeln", "Chat"],
    en: ["Good morning", "Nice to see you.", "Last shift", "Next shift", "Hours", "Time", "Times", "Clock in", "Chat"],
    fr: ["Bonjour", "Ravi de vous revoir.", "Dernier service", "Prochain service", "Heures", "Heure", "Horaires", "Pointer", "Discussion"],
    es: ["Buenos días", "Nos alegra verte.", "Último turno", "Próximo turno", "Horas", "Hora", "Horarios", "Fichar", "Chat"],
    it: ["Buongiorno", "È bello rivederti.", "Ultimo turno", "Prossimo turno", "Ore", "Ora", "Orari", "Timbra", "Chat"],
    nl: ["Goedemorgen", "Fijn dat je er bent.", "Laatste dienst", "Volgende dienst", "Uren", "Tijd", "Tijden", "Klokken", "Chat"],
    pl: ["Dzień dobry", "Miło Cię widzieć.", "Ostatnia zmiana", "Następna zmiana", "Godziny", "Czas", "Czas pracy", "Odbij kartę", "Czat"],
    tr: ["Günaydın", "Seni görmek güzel.", "Son vardiya", "Sonraki vardiya", "Saat", "Zaman", "Saatler", "Giriş yap", "Sohbet"],
    ru: ["Доброе утро", "Рады вас видеть.", "Последняя смена", "Следующая смена", "Часы", "Время", "Учёт времени", "Отметиться", "Чат"],
    uk: ["Доброго ранку", "Раді вас бачити.", "Остання зміна", "Наступна зміна", "Години", "Час", "Облік часу", "Відмітитися", "Чат"],
    da: ["Godmorgen", "Dejligt at se dig.", "Seneste vagt", "Næste vagt", "Timer", "Tid", "Tider", "Stempl ind", "Chat"],
    sv: ["God morgon", "Trevligt att se dig.", "Senaste pass", "Nästa pass", "Timmar", "Tid", "Tider", "Stämpla", "Chatt"],
    ar: ["صباح الخير", "سعداء برؤيتك.", "آخر وردية", "الوردية التالية", "ساعات", "الوقت", "الأوقات", "تسجيل الدوام", "الدردشة"]
  };
  function applyLanguage(language = read().language || "de") {
    const t = words[language] || words.de; document.documentElement.lang = language; document.documentElement.dir = language.startsWith("ar") ? "rtl" : "ltr";
    const set = (selector, value) => { const node = document.querySelector(selector); if (node) node.textContent = value; };
    set("#profileTitle", t.profile); set("#profilePage .profile-page-header p", t.profileCopy);
    set("#profilePage [data-open-settings] strong", t.settings); set("#profilePage [data-open-settings] small", t.settingsCopy);
    set('[data-target="home"] .nav-text', t.home); set('[data-target="schedule"] .nav-text', t.schedule); set('[data-target="profile"] .nav-text', t.profile); set('[data-target="quick"] .nav-text', t.quick);
    const shell = shellWords[language] || (language.startsWith("ar") ? shellWords.ar : shellWords.de);
    set("#greeting", shell[0]); set(".header .subtitle", shell[1]);
    document.querySelectorAll(".shift-grid .shift-card").forEach((card, index) => { const values = index ? [shell[3], shell[5]] : [shell[2], shell[4]]; const heading = card.querySelector("h2"); const unit = card.querySelector("span"); if (heading) heading.textContent = values[0]; if (unit) unit.textContent = values[1]; });
    set('[data-target="schedule"] .nav-text', shell[6]); set('[data-target="clock"] .nav-text', shell[7]); set('[data-target="chat"] .nav-text', shell[8]);
    document.title = `TimeFlow – ${t.home}`;
    document.querySelectorAll("[data-language-select]").forEach((select) => { select.value = language; });
    document.dispatchEvent(new CustomEvent("timeflow:language-changed", { detail: { language } }));
  }
  function languageControl() {
    const details = document.querySelector("#profilePage .profile-details-grid");
    if (details && !details.querySelector(".profile-language-card")) details.insertAdjacentHTML("afterbegin", `<article class="profile-menu-card profile-language-card"><label class="profile-language-select"><span class="menu-icon settings"><i class="fa-solid fa-language"></i></span><span><strong>Sprache</strong><small>Sprache der Benutzeroberfläche</small></span><select data-language-select aria-label="Sprache wählen">${languageOptions}</select></label></article>`);
    const personal = document.querySelector(".personalization-settings-card .settings-list");
    if (personal && !personal.querySelector("[data-language-select]")) personal.insertAdjacentHTML("afterbegin", `<label class="settings-select"><span><strong>Sprache</strong><small>Sprache der Benutzeroberfläche</small></span><select data-language-select>${languageOptions}</select></label>`);
    document.querySelectorAll("[data-language-select]").forEach((select) => { if (select.dataset.bound) return; select.dataset.bound = "true"; select.addEventListener("change", () => { save({ language: select.value }); applyLanguage(select.value); }); });
    applyLanguage();
  }
  function groupFor(card) {
    if (card.classList.contains("personalization-settings-card")) return "appearance";
    if (card.matches('[aria-labelledby="timeSettingsTitle"],.legal-settings-card')) return "work";
    if (card.matches('[aria-labelledby="notificationSettingsTitle"]')) return "communication";
    if (card.matches('[aria-labelledby="dataSettingsTitle"]')) return "privacy";
    if (card.matches(".cloud-sync-card,.release-readiness-card")) return "system";
    return "system";
  }
  function normalizeSpecialCards(layout) {
    document.querySelector("#settingsPage > .settings-hero")?.remove();
    const cloud = layout.querySelector(":scope > .cloud-sync-card");
    if (cloud && !cloud.querySelector(":scope > header")) {
      const header = document.createElement("header");
      [cloud.querySelector(":scope > .cloud-sync-icon"), cloud.querySelector(":scope > .cloud-sync-copy"), cloud.querySelector(":scope > .cloud-sync-state")].filter(Boolean).forEach((node) => header.append(node));
      cloud.prepend(header);
    }
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
    const layout = document.querySelector("#settingsPage .settings-layout"); if (!layout) return; normalizeSpecialCards(layout);
    const cards = [...layout.children].filter((node) => node.matches?.(".settings-card,.cloud-sync-card,.release-readiness-card")); if (!cards.length) return;
    layout.querySelectorAll(":scope > .settings-group-title").forEach((node) => node.remove());
    const groups = [{ id: "appearance", title: "Darstellung & Sprache" }, { id: "work", title: "Arbeitszeit & Schutz" }, { id: "communication", title: "Benachrichtigungen" }, { id: "system", title: "App & Updates" }, { id: "privacy", title: "Daten & Datenschutz" }];
    groups.forEach((group) => { const members = cards.filter((card) => groupFor(card) === group.id); if (!members.length) return; const title = document.createElement("h2"); title.className = "settings-group-title"; title.textContent = group.title; layout.append(title); members.forEach((card) => { card.dataset.settingsGroup = group.id; layout.append(card); makeAccordion(card); }); });
    languageControl();
  }
  let timer; const schedule = () => { clearTimeout(timer); timer = setTimeout(organize, 60); };
  document.addEventListener("DOMContentLoaded", () => { organize(); const layout = document.querySelector("#settingsPage .settings-layout"); if (layout) new MutationObserver((records) => { if (records.some((record) => [...record.addedNodes].some((node) => node.matches?.(".settings-card:not([data-accordion-ready]),.cloud-sync-card:not([data-accordion-ready]),.release-readiness-card:not([data-accordion-ready])")))) schedule(); }).observe(layout, { childList: true }); });
  document.addEventListener("timeflow:settings-updated", () => applyLanguage());
}());

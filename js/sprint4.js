"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const dashboard = document.getElementById("dashboard");
  if (!dashboard) return;

  dashboard.insertAdjacentHTML("beforeend", `
    <section id="profilePage" class="profile-page app-page hidden" aria-labelledby="profileTitle">
      <header class="profile-page-header">
        <div>
          <span class="profile-eyebrow"><i class="fa-solid fa-chart-line"></i> Sprint 4</span>
          <h1 id="profileTitle">Mein Profil</h1>
          <p>Deine Arbeit. Deine Entwicklung. Alles im Blick.</p>
        </div>
        <button class="profile-settings-shortcut" type="button" data-open-settings aria-label="Einstellungen öffnen">
          <i class="fa-solid fa-sliders"></i>
        </button>
      </header>

      <section class="profile-hero" aria-labelledby="profileName">
        <button class="profile-avatar-large" type="button" data-edit-profile aria-label="Profil bearbeiten">
          <img id="profileAvatarImage" alt="" hidden>
          <span id="profileInitials">MM</span>
          <i class="fa-solid fa-pen"></i>
        </button>
        <div class="profile-identity">
          <span class="profile-status"><i></i> Im Dienst</span>
          <h2 id="profileName">Max Mustermann</h2>
          <p><span id="profileRole">Servicemitarbeiter</span> · <span id="profileDepartment">Restaurant</span></p>
          <small>Personalnummer TF-2048 · Seit 01. März 2022</small>
        </div>
        <button class="edit-profile-button" type="button" data-edit-profile>
          <i class="fa-regular fa-pen-to-square"></i> Bearbeiten
        </button>
      </section>

      <section class="account-section" aria-labelledby="accountTitle">
        <div class="profile-section-heading">
          <div><span>August 2026</span><h2 id="accountTitle">Arbeitszeitkonto</h2></div>
          <button type="button" data-open-schedule>Dienstplan <i class="fa-solid fa-arrow-right"></i></button>
        </div>
        <div class="account-grid">
          <article class="account-card work-card">
            <span class="account-icon"><i class="fa-regular fa-clock"></i></span>
            <div><small>Arbeitszeit</small><strong>154:23 h</strong><p>von 168:00 h Soll</p></div>
            <span class="account-trend positive"><i class="fa-solid fa-arrow-trend-up"></i> 92 %</span>
          </article>
          <article class="account-card overtime-card">
            <span class="account-icon"><i class="fa-solid fa-arrow-trend-up"></i></span>
            <div><small>Überstunden</small><strong>+13:24 h</strong><p>aktuelles Guthaben</p></div>
            <span class="account-trend positive">+2:18 h</span>
          </article>
          <article class="account-card vacation-card">
            <span class="account-icon"><i class="fa-solid fa-umbrella-beach"></i></span>
            <div><small>Urlaub</small><strong>18 Tage</strong><p>von 30 Tagen übrig</p></div>
            <span class="mini-progress"><i style="width:60%"></i></span>
          </article>
          <article class="account-card sick-card">
            <span class="account-icon"><i class="fa-solid fa-heart-pulse"></i></span>
            <div><small>Krankheit</small><strong>2 Tage</strong><p>im Jahr 2026</p></div>
            <span class="account-trend neutral">–1 Tag</span>
          </article>
        </div>
      </section>

      <section class="statistics-section" aria-labelledby="statisticsTitle">
        <div class="profile-section-heading statistics-heading">
          <div><span>Persönliche Auswertung</span><h2 id="statisticsTitle">Statistik</h2></div>
          <div class="statistics-tabs" role="tablist" aria-label="Statistikzeitraum">
            <button type="button" role="tab" data-stat-period="week" aria-selected="false">Woche</button>
            <button type="button" role="tab" data-stat-period="month" aria-selected="true">Monat</button>
            <button type="button" role="tab" data-stat-period="year" aria-selected="false">Jahr</button>
          </div>
        </div>

        <div class="statistics-layout">
          <article class="chart-card">
            <header>
              <div><small id="chartPeriod">August 2026</small><strong id="chartTotal">154:23 h</strong></div>
              <span id="chartComparison"><i class="fa-solid fa-arrow-up"></i> 6,8 % zum Vormonat</span>
            </header>
            <div class="work-chart" id="workChart" role="img" aria-label="Arbeitszeitdiagramm August 2026"></div>
            <div class="chart-legend"><span><i class="actual"></i> Ist-Zeit</span><span><i class="target"></i> Soll-Zeit</span></div>
          </article>

          <article class="goal-card">
            <div class="goal-ring" id="goalRing" style="--goal:331deg" role="progressbar" aria-label="Zielerreichung" aria-valuemin="0" aria-valuemax="100" aria-valuenow="92">
              <span><strong id="goalPercent">92%</strong><small>Ziel erreicht</small></span>
            </div>
            <h3 id="goalTitle">Starker Monat</h3>
            <p id="goalCopy">Dir fehlen noch 13:37 Stunden bis zu deinem Monatsziel.</p>
            <div class="goal-details"><span>Soll<strong id="goalTarget">168:00 h</strong></span><span>Ist<strong id="goalActual">154:23 h</strong></span></div>
          </article>
        </div>

        <div class="insight-grid">
          <article><span class="insight-icon blue"><i class="fa-solid fa-calendar-check"></i></span><div><small>Arbeitstage</small><strong id="insightDays">19</strong></div></article>
          <article><span class="insight-icon mint"><i class="fa-solid fa-stopwatch"></i></span><div><small>Ø pro Arbeitstag</small><strong id="insightAverage">8:08 h</strong></div></article>
          <article><span class="insight-icon amber"><i class="fa-solid fa-bolt"></i></span><div><small>Produktivster Zeitraum</small><strong id="insightPeak">KW 32</strong></div></article>
        </div>
      </section>

      <section class="profile-details-grid">
        <article class="profile-menu-card">
          <button class="profile-menu-link" type="button" data-open-settings><span class="menu-icon settings"><i class="fa-solid fa-sliders"></i></span><span><strong>Einstellungen</strong><small>Benachrichtigungen, Zeiterfassung und Daten</small></span><i class="fa-solid fa-chevron-right"></i></button>
          <details id="privacySection">
            <summary><span class="menu-icon privacy"><i class="fa-solid fa-shield-halved"></i></span><span><strong>Datenschutz</strong><small>Lokale Daten und Berechtigungen</small></span><i class="fa-solid fa-chevron-down"></i></summary>
            <div class="detail-content privacy-copy"><p>Profil und Einstellungen werden in der privaten Site mit deinem Konto synchronisiert. Chats und sensible Schnellaktionen bleiben lokal.</p><button type="button" data-clear-profile><i class="fa-solid fa-rotate-left"></i> Lokale Profildaten zurücksetzen</button></div>
          </details>
          <div class="version-row"><span class="menu-icon version"><i class="fa-solid fa-mobile-screen"></i></span><span><strong>TimeFlow PWA</strong><small>Version 1.0.1 · Build 0019</small></span><em>Stabil</em></div>
        </article>
      </section>

      <dialog class="profile-dialog" id="profileDialog" aria-labelledby="profileDialogTitle">
        <form method="dialog" id="profileForm">
          <header><div><small>Persönliche Daten</small><h2 id="profileDialogTitle">Profil bearbeiten</h2></div><button type="button" data-close-profile-dialog aria-label="Schließen"><i class="fa-solid fa-xmark"></i></button></header>
          <section class="profile-photo-editor" aria-labelledby="profilePhotoTitle">
            <span class="profile-photo-preview"><img id="profilePhotoPreview" alt="Vorschau des Profilbilds" hidden><b id="profilePhotoInitials">MM</b></span>
            <div><strong id="profilePhotoTitle">Profilbild</strong><small>JPG, PNG oder WebP · wird für TimeFlow optimiert</small><span><label><i class="fa-solid fa-camera"></i> Bild auswählen<input id="profilePhotoInput" type="file" accept="image/jpeg,image/png,image/webp"></label><button type="button" data-remove-profile-photo><i class="fa-regular fa-trash-can"></i> Entfernen</button></span></div>
          </section>
          <div class="profile-form-grid">
            <label><span>Name</span><input name="name" autocomplete="name" required maxlength="50"></label>
            <label><span>Rolle</span><input name="role" required maxlength="40"></label>
            <label><span>Abteilung</span><input name="department" required maxlength="40"></label>
            <label><span>E-Mail</span><input name="email" type="email" autocomplete="email" required></label>
            <label><span>Telefon</span><input name="phone" type="tel" autocomplete="tel" maxlength="30"></label>
          </div>
          <footer><button type="button" class="dialog-cancel" data-close-profile-dialog>Abbrechen</button><button type="submit" class="dialog-save"><i class="fa-solid fa-check"></i> Speichern</button></footer>
        </form>
      </dialog>
    </section>
  `);

  const PROFILE_STORAGE_KEY = "timeflow-profile-v1";
  const defaultProfile = {
    name: "Max Mustermann",
    role: "Servicemitarbeiter",
    department: "Restaurant",
    email: "max.mustermann@timeflow.de",
    phone: "+49 170 1234567",
    avatar: null
  };
  const periods = {
    week: {
      label: "24. – 30. August 2026", total: "32:00 h", comparison: "4,1 % zur Vorwoche", direction: "up",
      goal: 80, goalTitle: "Gute Woche", goalCopy: "Noch 8 Stunden bis zu deinem Wochenziel.", target: "40:00 h", actual: "32:00 h",
      days: "4", average: "8:00 h", peak: "Mittwoch", labels: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"], values: [8, 7.5, 8.5, 0, 8, 0, 0], targetValue: 8
    },
    month: {
      label: "August 2026", total: "154:23 h", comparison: "6,8 % zum Vormonat", direction: "up",
      goal: 92, goalTitle: "Starker Monat", goalCopy: "Dir fehlen noch 13:37 Stunden bis zu deinem Monatsziel.", target: "168:00 h", actual: "154:23 h",
      days: "19", average: "8:08 h", peak: "KW 32", labels: ["KW 31", "KW 32", "KW 33", "KW 34", "KW 35"], values: [31, 42, 40, 33, 8.38], targetValue: 40
    },
    year: {
      label: "Januar – August 2026", total: "1.228:15 h", comparison: "3,2 % zum Vorjahr", direction: "up",
      goal: 91, goalTitle: "Konstant auf Kurs", goalCopy: "Du hast 91 % deines bisherigen Jahresziels erreicht.", target: "1.344:00 h", actual: "1.228:15 h",
      days: "151", average: "8:08 h", peak: "März", labels: ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug"], values: [152, 144, 168, 160, 154, 148, 148, 154.38], targetValue: 168
    }
  };

  const profileDialog = document.getElementById("profileDialog");
  const profileForm = document.getElementById("profileForm");
  const photoInput = document.getElementById("profilePhotoInput");
  const photoPreview = document.getElementById("profilePhotoPreview");
  const photoInitials = document.getElementById("profilePhotoInitials");
  let profile = loadJson(PROFILE_STORAGE_KEY, defaultProfile);
  let pendingAvatar = profile.avatar || null;

  function loadJson(key, fallback) {
    try {
      const value = JSON.parse(window.TimeFlowPlatform.storage.getItem(key));
      return value && typeof value === "object" ? { ...fallback, ...value } : { ...fallback };
    } catch {
      return { ...fallback };
    }
  }

  function initials(name) {
    return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("") || "MM";
  }

  function renderProfile() {
    document.getElementById("profileName").textContent = profile.name;
    document.getElementById("profileRole").textContent = profile.role;
    document.getElementById("profileDepartment").textContent = profile.department;
    const largeImage = document.getElementById("profileAvatarImage");
    const largeInitials = document.getElementById("profileInitials");
    largeImage.hidden = !profile.avatar;
    largeImage.src = profile.avatar || "";
    largeInitials.hidden = Boolean(profile.avatar);
    largeInitials.textContent = initials(profile.name);
    document.getElementById("userName").textContent = profile.name.split(/\s+/)[0] || "Max";
    const smallAvatar = document.querySelector(".profile-initials");
    smallAvatar.textContent = profile.avatar ? "" : initials(profile.name);
    smallAvatar.style.backgroundImage = profile.avatar ? `url(${profile.avatar})` : "";
  }

  function renderPhotoPreview() {
    const value = initials(profileForm.elements.name.value || profile.name);
    photoPreview.hidden = !pendingAvatar;
    photoPreview.src = pendingAvatar || "";
    photoInitials.hidden = Boolean(pendingAvatar);
    photoInitials.textContent = value;
  }

  function optimizePhoto(file) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) { reject(new Error("type")); return; }
      if (file.size > 5 * 1024 * 1024) { reject(new Error("size")); return; }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("read"));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error("image"));
        image.onload = () => {
          const size = Math.min(image.naturalWidth, image.naturalHeight);
          const canvas = document.createElement("canvas");
          canvas.width = 512; canvas.height = 512;
          const context = canvas.getContext("2d");
          if (!context) { reject(new Error("canvas")); return; }
          context.drawImage(image, (image.naturalWidth - size) / 2, (image.naturalHeight - size) / 2, size, size, 0, 0, 512, 512);
          resolve(canvas.toDataURL("image/jpeg", .84));
        };
        image.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });
  }

  function renderStatistics(periodKey) {
    const data = periods[periodKey];
    document.querySelectorAll("[data-stat-period]").forEach((button) => button.setAttribute("aria-selected", String(button.dataset.statPeriod === periodKey)));
    document.getElementById("chartPeriod").textContent = data.label;
    document.getElementById("chartTotal").textContent = data.total;
    const comparison = document.getElementById("chartComparison");
    comparison.innerHTML = `<i class="fa-solid fa-arrow-${data.direction}"></i> ${data.comparison}`;
    document.getElementById("goalPercent").textContent = `${data.goal}%`;
    document.getElementById("goalTitle").textContent = data.goalTitle;
    document.getElementById("goalCopy").textContent = data.goalCopy;
    document.getElementById("goalTarget").textContent = data.target;
    document.getElementById("goalActual").textContent = data.actual;
    document.getElementById("insightDays").textContent = data.days;
    document.getElementById("insightAverage").textContent = data.average;
    document.getElementById("insightPeak").textContent = data.peak;

    const ring = document.getElementById("goalRing");
    ring.style.setProperty("--goal", `${data.goal * 3.6}deg`);
    ring.setAttribute("aria-valuenow", String(data.goal));
    const chart = document.getElementById("workChart");
    chart.setAttribute("aria-label", `Arbeitszeitdiagramm ${data.label}`);
    chart.style.setProperty("--columns", String(data.labels.length));
    chart.replaceChildren();
    const maximum = Math.max(data.targetValue, ...data.values) * 1.12;
    data.labels.forEach((label, index) => {
      const column = document.createElement("div");
      column.className = "chart-column";
      const bars = document.createElement("div");
      bars.className = "chart-bars";
      const target = document.createElement("span");
      target.className = "target-bar";
      target.style.height = `${(data.targetValue / maximum) * 100}%`;
      const actual = document.createElement("span");
      actual.className = "actual-bar";
      actual.style.height = `${(data.values[index] / maximum) * 100}%`;
      actual.title = `${label}: ${formatHours(data.values[index])}`;
      const caption = document.createElement("small");
      caption.textContent = label;
      bars.append(target, actual);
      column.append(bars, caption);
      chart.append(column);
    });
  }

  function formatHours(value) {
    const hours = Math.floor(value);
    const minutes = Math.round((value - hours) * 60);
    return `${hours}:${String(minutes).padStart(2, "0")} h`;
  }

  function openProfileDialog() {
    profileForm.elements.name.value = profile.name;
    profileForm.elements.role.value = profile.role;
    profileForm.elements.department.value = profile.department;
    profileForm.elements.email.value = profile.email;
    profileForm.elements.phone.value = profile.phone;
    pendingAvatar = profile.avatar || null;
    photoInput.value = "";
    renderPhotoPreview();
    window.TimeFlowPlatform.dialog.open(profileDialog);
  }

  function notify(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 3200);
  }

  document.querySelectorAll("[data-stat-period]").forEach((button) => button.addEventListener("click", () => renderStatistics(button.dataset.statPeriod)));
  document.querySelectorAll("[data-edit-profile]").forEach((button) => button.addEventListener("click", openProfileDialog));
  document.querySelectorAll("[data-close-profile-dialog]").forEach((button) => button.addEventListener("click", () => window.TimeFlowPlatform.dialog.close(profileDialog)));
  photoInput.addEventListener("change", async () => {
    const file = photoInput.files?.[0];
    if (!file) return;
    try { pendingAvatar = await optimizePhoto(file); renderPhotoPreview(); }
    catch (error) { notify(error.message === "size" ? "Das Profilbild darf höchstens 5 MB groß sein." : "Dieses Bild konnte nicht verarbeitet werden."); }
  });
  profileForm.elements.name.addEventListener("input", renderPhotoPreview);
  document.querySelector("[data-remove-profile-photo]").addEventListener("click", () => { pendingAvatar = null; photoInput.value = ""; renderPhotoPreview(); });
  document.querySelector("[data-open-schedule]").addEventListener("click", () => document.querySelector('[data-target="schedule"]')?.click());
  document.querySelectorAll("[data-open-settings]").forEach((button) => button.addEventListener("click", () => {
    document.dispatchEvent(new CustomEvent("timeflow:open-settings"));
  }));

  profileForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = new FormData(profileForm);
    profile = {
      name: String(values.get("name")).trim(),
      role: String(values.get("role")).trim(),
      department: String(values.get("department")).trim(),
      email: String(values.get("email")).trim(),
      phone: String(values.get("phone")).trim(),
      avatar: pendingAvatar
    };
    window.TimeFlowPlatform.storage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    renderProfile();
    document.dispatchEvent(new CustomEvent("timeflow:profile-updated", { detail: { ...profile } }));
    window.TimeFlowPlatform.dialog.close(profileDialog);
    notify("Dein Profil wurde lokal gespeichert.");
  });

  profileDialog.addEventListener("click", (event) => {
    if (event.target === profileDialog) window.TimeFlowPlatform.dialog.close(profileDialog);
  });

  document.querySelector("[data-clear-profile]").addEventListener("click", () => {
    window.TimeFlowPlatform.storage.removeItem(PROFILE_STORAGE_KEY);
    profile = { ...defaultProfile };
    renderProfile();
    document.dispatchEvent(new CustomEvent("timeflow:profile-updated", { detail: { ...profile } }));
    notify("Lokale Profildaten wurden zurückgesetzt.");
  });

  renderProfile();
  renderStatistics("month");
});

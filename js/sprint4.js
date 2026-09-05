"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const dashboard = document.getElementById("dashboard");
  if (!dashboard) return;

  dashboard.insertAdjacentHTML("beforeend", `
    <section id="profilePage" class="profile-page app-page hidden" aria-labelledby="profileTitle">
      <header class="profile-page-header">
        <div>
          <span class="profile-eyebrow"><i class="fa-solid fa-chart-line"></i> Einzelnutzung</span>
          <h1 id="profileTitle">Mein Profil</h1>
          <p>Deine Arbeit. Deine Entwicklung. Alles im Blick.</p>
        </div>
      </header>

      <section class="profile-hero" aria-labelledby="profileName">
        <button class="profile-avatar-large" type="button" data-edit-avatar aria-label="Profilbild ändern">
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
        </article>
      </section>

      <dialog class="profile-dialog" id="profileDialog" aria-labelledby="profileDialogTitle">
        <form method="dialog" id="profileForm">
          <header><div><small>Persönliche Daten</small><h2 id="profileDialogTitle">Profil bearbeiten</h2></div><button type="button" data-close-profile-dialog aria-label="Schließen"><i class="fa-solid fa-xmark"></i></button></header>
          <section class="profile-photo-editor" aria-labelledby="profilePhotoTitle">
            <span class="profile-photo-preview"><img id="profilePhotoPreview" alt="Vorschau des Profilbilds" hidden><b id="profilePhotoInitials">MM</b></span>
            <div><strong id="profilePhotoTitle">Profilbild</strong><small>Alle vom Gerät unterstützten Bilder · Ausschnitt frei wählbar</small><span><button type="button" data-select-profile-photo><i class="fa-solid fa-camera"></i> Bild auswählen</button><input id="profilePhotoInput" type="file" accept="image/*,.heic,.heif" hidden><button type="button" data-remove-profile-photo><i class="fa-regular fa-trash-can"></i> Entfernen</button></span></div>
          </section>
          <section class="profile-crop-editor" id="profileCropEditor" hidden aria-label="Bildausschnitt festlegen">
            <div class="profile-crop-viewport" id="profileCropViewport"><img id="profileCropImage" alt="Gewählter Bildausschnitt" draggable="false"><i></i></div>
            <label><span><i class="fa-solid fa-magnifying-glass-minus"></i> Zoom <i class="fa-solid fa-magnifying-glass-plus"></i></span><input id="profileCropZoom" type="range" min="1" max="3" step="0.01" value="1"></label>
            <p><i class="fa-solid fa-up-down-left-right"></i> Bild mit Maus oder Finger verschieben und mit dem Regler zoomen.</p>
            <div><button type="button" data-cancel-profile-crop>Verwerfen</button><button type="button" data-apply-profile-crop><i class="fa-solid fa-crop-simple"></i> Ausschnitt übernehmen</button></div>
          </section>
          <div class="profile-form-grid">
            <label class="profile-account-name"><span>Name <i class="fa-solid fa-lock" aria-hidden="true"></i></span><input name="name" autocomplete="name" required maxlength="50" readonly aria-describedby="profileNameHelp"><small id="profileNameHelp">Wird beim Erstellen des Kontos festgelegt und kann nur von Administratoren geändert werden.</small></label>
            <label><span>Rolle</span><input name="role" required maxlength="40"></label>
            <label><span>Abteilung</span><input name="department" required maxlength="40"></label>
            <label><span>E-Mail</span><input name="email" type="email" autocomplete="email" required></label>
            <label><span>Geburtsdatum</span><input name="birthDate" type="date" autocomplete="bday" required></label>
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
    birthDate: "",
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
  const cropEditor = document.getElementById("profileCropEditor");
  const cropViewport = document.getElementById("profileCropViewport");
  const cropImage = document.getElementById("profileCropImage");
  const cropZoom = document.getElementById("profileCropZoom");
  let profile = loadJson(PROFILE_STORAGE_KEY, defaultProfile);
  let pendingAvatar = profile.avatar || null;
  let cropState = null;
  let accountName = profile.name;
  let canEditAccountName = false;

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

  function loadCropPhoto(file) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/") && !/\.(heic|heif)$/i.test(file.name)) { reject(new Error("type")); return; }
      if (file.size > 20 * 1024 * 1024) { reject(new Error("size")); return; }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("read"));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error("image"));
        image.onload = () => {
          cropImage.src = String(reader.result);
          cropState = { width: image.naturalWidth, height: image.naturalHeight, zoom: 1, x: 0, y: 0 };
          cropZoom.value = "1";
          cropEditor.hidden = false;
          window.requestAnimationFrame(() => { resetCropPosition(); renderCrop(); });
          resolve();
        };
        image.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });
  }

  function cropMetrics() {
    const size = cropViewport.clientWidth || 220;
    const base = Math.max(size / cropState.width, size / cropState.height);
    return { size, scale: base * cropState.zoom, width: cropState.width * base * cropState.zoom, height: cropState.height * base * cropState.zoom };
  }

  function clampCrop() {
    if (!cropState) return;
    const metrics = cropMetrics();
    cropState.x = Math.min(0, Math.max(metrics.size - metrics.width, cropState.x));
    cropState.y = Math.min(0, Math.max(metrics.size - metrics.height, cropState.y));
  }

  function resetCropPosition() {
    const metrics = cropMetrics();
    cropState.x = (metrics.size - metrics.width) / 2;
    cropState.y = (metrics.size - metrics.height) / 2;
  }

  function renderCrop() {
    if (!cropState) return;
    clampCrop();
    const metrics = cropMetrics();
    cropImage.style.width = `${metrics.width}px`;
    cropImage.style.height = `${metrics.height}px`;
    cropImage.style.transform = `translate(${cropState.x}px, ${cropState.y}px)`;
  }

  function applyCrop() {
    if (!cropState) return;
    const metrics = cropMetrics();
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 512;
    const context = canvas.getContext("2d");
    if (!context) return;
    const factor = 512 / metrics.size;
    context.drawImage(cropImage, cropState.x * factor, cropState.y * factor, metrics.width * factor, metrics.height * factor);
    pendingAvatar = canvas.toDataURL("image/jpeg", .86);
    cropEditor.hidden = true;
    cropState = null;
    renderPhotoPreview();
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
    profileForm.elements.name.readOnly = !canEditAccountName;
    profileForm.elements.name.closest("label")?.classList.toggle("is-admin-editable", canEditAccountName);
    document.getElementById("profileNameHelp").textContent = canEditAccountName
      ? "Administratorzugriff: Du darfst den fest hinterlegten Kontonamen ändern."
      : "Wird beim Erstellen des Kontos festgelegt und kann nur von Administratoren geändert werden.";
    profileForm.elements.role.value = profile.role;
    profileForm.elements.department.value = profile.department;
    profileForm.elements.email.value = profile.email;
    profileForm.elements.birthDate.value = profile.birthDate || "";
    profileForm.elements.phone.value = profile.phone;
    pendingAvatar = profile.avatar || null;
    photoInput.value = "";
    cropEditor.hidden = true;
    cropState = null;
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
  document.querySelector("[data-edit-avatar]")?.addEventListener("click", () => { openProfileDialog(); photoInput.click(); });
  document.querySelectorAll("[data-close-profile-dialog]").forEach((button) => button.addEventListener("click", () => window.TimeFlowPlatform.dialog.close(profileDialog)));
  document.querySelector("[data-select-profile-photo]").addEventListener("click", () => photoInput.click());
  photoInput.addEventListener("change", async () => {
    const file = photoInput.files?.[0];
    if (!file) return;
    try { await loadCropPhoto(file); }
    catch (error) { notify(error.message === "size" ? "Das Profilbild darf höchstens 20 MB groß sein." : "Dieses Bildformat kann dein Browser nicht öffnen."); }
  });
  cropZoom.addEventListener("input", () => {
    if (!cropState) return;
    const before = cropMetrics();
    const centerX = (before.size / 2 - cropState.x) / before.width;
    const centerY = (before.size / 2 - cropState.y) / before.height;
    cropState.zoom = Number(cropZoom.value);
    const after = cropMetrics();
    cropState.x = after.size / 2 - centerX * after.width;
    cropState.y = after.size / 2 - centerY * after.height;
    renderCrop();
  });
  let drag = null;
  cropViewport.addEventListener("pointerdown", (event) => {
    if (!cropState) return;
    drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, startX: cropState.x, startY: cropState.y };
    cropViewport.setPointerCapture?.(event.pointerId);
  });
  cropViewport.addEventListener("pointermove", (event) => {
    if (!cropState || !drag || drag.pointerId !== event.pointerId) return;
    cropState.x = drag.startX + event.clientX - drag.x;
    cropState.y = drag.startY + event.clientY - drag.y;
    renderCrop();
  });
  const endCropDrag = (event) => { if (drag?.pointerId === event.pointerId) drag = null; };
  cropViewport.addEventListener("pointerup", endCropDrag);
  cropViewport.addEventListener("pointercancel", endCropDrag);
  document.querySelector("[data-cancel-profile-crop]").addEventListener("click", () => { cropEditor.hidden = true; cropState = null; photoInput.value = ""; });
  document.querySelector("[data-apply-profile-crop]").addEventListener("click", applyCrop);
  profileForm.elements.name.addEventListener("input", renderPhotoPreview);
  document.querySelector("[data-remove-profile-photo]").addEventListener("click", () => { pendingAvatar = null; cropEditor.hidden = true; cropState = null; photoInput.value = ""; renderPhotoPreview(); });
  document.querySelector("[data-open-schedule]").addEventListener("click", () => document.querySelector('[data-target="schedule"]')?.click());
  document.querySelectorAll("[data-open-settings]").forEach((button) => button.addEventListener("click", () => {
    document.dispatchEvent(new CustomEvent("timeflow:open-settings"));
  }));

  profileForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = new FormData(profileForm);
    const requestedName = String(values.get("name")).trim();
    const savedName = canEditAccountName && requestedName ? requestedName : accountName;
    profile = {
      name: savedName,
      role: String(values.get("role")).trim(),
      department: String(values.get("department")).trim(),
      email: String(values.get("email")).trim(),
      birthDate: String(values.get("birthDate")).trim(),
      phone: String(values.get("phone")).trim(),
      avatar: pendingAvatar
    };
    window.TimeFlowPlatform.storage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    if (canEditAccountName && savedName !== accountName) {
      accountName = savedName;
      document.dispatchEvent(new CustomEvent("timeflow:account-name-change", { detail: { name: savedName } }));
    }
    renderProfile();
    document.dispatchEvent(new CustomEvent("timeflow:profile-updated", { detail: { ...profile } }));
    window.TimeFlowPlatform.dialog.close(profileDialog);
    notify("Dein Profil wurde lokal gespeichert.");
  });

  profileDialog.addEventListener("click", (event) => {
    if (event.target === profileDialog) window.TimeFlowPlatform.dialog.close(profileDialog);
  });

  document.addEventListener("timeflow:session-ready", (event) => {
    const user = event.detail?.user;
    const fixedName = String(user?.name || "").trim();
    if (!fixedName) return;
    accountName = fixedName;
    canEditAccountName = user.role === "Administrator";
    profile = {
      ...profile,
      name: fixedName,
      email: user.email || profile.email
    };
    window.TimeFlowPlatform.storage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    renderProfile();
  });

  renderProfile();
  renderStatistics("month");
});

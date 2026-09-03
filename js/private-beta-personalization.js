(function () {
  "use strict";
  const SETTINGS_KEY = "timeflow-settings-v1";
  const SETUP_KEY = "timeflow-private-setup-v1";
  const TARGETS_KEY = "timeflow-monthly-targets-v1";
  const BACKGROUND_DB = "timeflow-personalization-v1";
  const BACKGROUND_STORE = "assets";
  const storage = () => window.TimeFlowPlatform?.storage || { getItem: () => null, setItem: () => undefined };

  function read(key, fallback = {}) {
    try {
      const value = JSON.parse(storage().getItem(key));
      return value && typeof value === "object" ? value : fallback;
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    storage().setItem(key, JSON.stringify(value));
  }

  function backgroundStore(mode = "readonly") {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(BACKGROUND_DB, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(BACKGROUND_STORE);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result.transaction(BACKGROUND_STORE, mode).objectStore(BACKGROUND_STORE));
    });
  }

  async function getBackground() {
    const store = await backgroundStore();
    return new Promise((resolve, reject) => { const request = store.get("custom-background"); request.onsuccess = () => resolve(request.result || null); request.onerror = () => reject(request.error); });
  }

  async function setBackground(value) {
    const store = await backgroundStore("readwrite");
    return new Promise((resolve, reject) => { const request = value ? store.put(value, "custom-background") : store.delete("custom-background"); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); });
  }

  function applyCustomBackground(asset) {
    const root = document.documentElement;
    if (!asset?.dataUrl) {
      delete root.dataset.tfCustomBackground;
      ["--tf-custom-background-image", "--tf-custom-background-rgb", "--tf-custom-background-overlay"].forEach((name) => root.style.removeProperty(name));
      return;
    }
    const rgb = Array.isArray(asset.rgb) ? asset.rgb : [12, 54, 88];
    root.dataset.tfCustomBackground = "true";
    root.style.setProperty("--tf-custom-background-image", `url("${asset.dataUrl}")`);
    root.style.setProperty("--tf-custom-background-rgb", rgb.join(" "));
    root.style.setProperty("--tf-custom-background-overlay", String(asset.luminance > 0.55 ? 0.62 : asset.luminance > 0.3 ? 0.48 : 0.34));
  }

  async function restoreCustomBackground() { try { applyCustomBackground(await getBackground()); } catch { applyCustomBackground(null); } }

  function loadImage(file) {
    return new Promise((resolve, reject) => { const image = new Image(); const url = URL.createObjectURL(file); image.onload = () => { URL.revokeObjectURL(url); resolve(image); }; image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("invalid_image")); }; image.src = url; });
  }

  async function prepareBackground(file) {
    if (!file?.type.startsWith("image/")) throw new Error("invalid_type");
    if (file.size > 30 * 1024 * 1024) throw new Error("too_large");
    const image = await loadImage(file);
    const scale = Math.min(1, 1920 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d", { alpha: false }); context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const sample = document.createElement("canvas"); sample.width = sample.height = 32;
    const sampleContext = sample.getContext("2d", { willReadFrequently: true }); sampleContext.drawImage(canvas, 0, 0, 32, 32);
    const pixels = sampleContext.getImageData(0, 0, 32, 32).data;
    let red = 0, green = 0, blue = 0, count = 0;
    for (let index = 0; index < pixels.length; index += 16) { red += pixels[index]; green += pixels[index + 1]; blue += pixels[index + 2]; count += 1; }
    const rgb = [red, green, blue].map((value) => Math.round(value / count));
    const luminance = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
    return { dataUrl: canvas.toDataURL("image/jpeg", 0.84), rgb, luminance, updatedAt: new Date().toISOString() };
  }

  function updateBackgroundControls(active) {
    document.querySelector("[data-custom-background-preview]")?.classList.toggle("has-image", active);
    const remove = document.querySelector("[data-remove-custom-background]"); if (remove) remove.hidden = !active;
  }

  function installBackgroundPicker() {
    const input = document.querySelector("[data-custom-background-input]");
    if (!input || input.dataset.ready) return;
    input.dataset.ready = "true";
    getBackground().then((asset) => updateBackgroundControls(Boolean(asset?.dataUrl))).catch(() => updateBackgroundControls(false));
    input.addEventListener("change", async () => {
      const file = input.files?.[0]; if (!file) return;
      const picker = input.closest(".custom-background-setting"); picker?.classList.add("is-processing");
      try { const asset = await prepareBackground(file); await setBackground(asset); applyCustomBackground(asset); updateBackgroundControls(true); notify("Eigenes Hintergrundbild wurde gespeichert."); }
      catch { notify("Dieses Bild konnte nicht verarbeitet werden."); }
      finally { picker?.classList.remove("is-processing"); input.value = ""; }
    });
    document.querySelector("[data-remove-custom-background]")?.addEventListener("click", async () => { await setBackground(null); applyCustomBackground(null); updateBackgroundControls(false); notify("Eigenes Hintergrundbild wurde entfernt."); });
  }

  function vacationUsage(year = new Date().getFullYear()) {
    const schedule = read("timeflow-private-schedule-v1", []);
    if (!Array.isArray(schedule)) return 0;
    return schedule.filter((entry) => Number(String(entry.date || "").slice(0, 4)) === year && /urlaub|vacation|\bu\b/i.test(String(entry.title || entry.type || ""))).length;
  }

  function refreshVacationBalance() {
    const settings = read(SETTINGS_KEY);
    const used = vacationUsage();
    const annual = Math.max(0, Number(settings.annualVacationDays || 0));
    const input = document.querySelector("[data-annual-vacation]");
    if (input) input.value = String(annual);
    const usedOutput = document.querySelector("[data-vacation-used]");
    const remainingOutput = document.querySelector("[data-vacation-remaining]");
    if (usedOutput) usedOutput.textContent = `${used} Tage`;
    if (remainingOutput) remainingOutput.textContent = `${Math.max(0, annual - used)} Tage`;
  }

  function applyPersonalization(settings = read(SETTINGS_KEY)) {
    const root = document.documentElement;
    const scale = Math.min(1.3, Math.max(1, Number(settings.fontScale || 1.1)));
    root.style.setProperty("--tf-font-scale", String(scale));
    root.dataset.tfFontSize = scale >= 1.2 ? "expanded" : scale >= 1.1 ? "large" : "normal";
    root.dataset.tfFont = ["inter", "system", "segoe", "aptos", "calibri", "cambria", "times", "arial", "rounded", "serif", "verdana", "tahoma", "trebuchet", "century", "courier", "mono"].includes(settings.fontFamily) ? settings.fontFamily : "inter";
    root.dataset.tfBackground = ["midnight", "ocean", "teal", "violet", "graphite", "forest", "sunset", "rose", "light"].includes(settings.appBackground) ? settings.appBackground : "midnight";
  }

  function notify(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.setTimeout(() => toast.classList.remove("is-visible"), 3200);
  }

  function saveSettings(patch) {
    const settings = { ...read(SETTINGS_KEY), ...patch };
    write(SETTINGS_KEY, settings);
    if (Number.isFinite(Number(settings.monthlyTargetHours))) {
      const month = new Date().toLocaleDateString("sv-SE").slice(0, 7);
      write(TARGETS_KEY, { ...read(TARGETS_KEY), [month]: Number(settings.monthlyTargetHours) });
    }
    applyPersonalization(settings);
    document.dispatchEvent(new CustomEvent("timeflow:settings-updated", { detail: settings }));
    return settings;
  }

  function installSettings() {
    const layout = document.querySelector("#settingsPage .settings-layout");
    const timeList = document.querySelector("#settingsPage [aria-labelledby='timeSettingsTitle'] .settings-list");
    if (!layout || !timeList || document.querySelector(".personalization-settings-card")) return;
    const settings = read(SETTINGS_KEY);
    const year = new Date().getFullYear();
    const used = vacationUsage(year);
    timeList.querySelector('[data-setting="monthlyTargetHours"]')?.closest("label")?.insertAdjacentHTML("afterend", `
      <label class="settings-select vacation-entitlement-setting"><span><strong>Jahresurlaub ${year}</strong><small>Genommene Urlaubstage werden aus deinem Dienstplan abgezogen</small></span><span class="settings-hours-input"><input type="number" inputmode="numeric" min="0" max="366" step="1" value="${Number(settings.annualVacationDays || 0)}" data-annual-vacation aria-label="Verfügbare Jahresurlaubstage"><b>Tage</b></span></label>
      <p class="vacation-balance"><span><small>GENOMMEN</small><strong data-vacation-used>${used} Tage</strong></span><span><small>VERBLEIBEND</small><strong data-vacation-remaining>${Math.max(0, Number(settings.annualVacationDays || 0) - used)} Tage</strong></span></p>`);
    layout.insertAdjacentHTML("afterbegin", `
      <section class="settings-card personalization-settings-card" aria-labelledby="personalizationTitle">
        <header><span class="settings-card-icon violet"><i class="fa-solid fa-palette"></i></span><div><small>Darstellung</small><h2 id="personalizationTitle">Persönliches Erscheinungsbild</h2></div></header>
        <div class="settings-list">
          <label class="settings-select"><span><strong>Hintergrund</strong><small>Farbstimmung der gesamten App</small></span><select data-personal-setting="appBackground"><option value="midnight">Mitternacht</option><option value="ocean">Ozeanblau</option><option value="teal">Petrol</option><option value="violet">Violett</option><option value="graphite">Graphit</option><option value="forest">Waldgrün</option><option value="sunset">Sonnenuntergang</option><option value="rose">Rosé</option><option value="light">Hell</option></select></label>
          <div class="custom-background-setting" data-custom-background-preview><span><strong>Eigenes Hintergrundbild</strong><small>Bleibt lokal auf diesem Gerät. Fenster und Kontrast passen sich automatisch an.</small></span><div class="custom-background-actions"><label class="custom-background-pick"><i class="fa-solid fa-image"></i><span>Bild auswählen</span><input type="file" accept="image/*,.heic,.heif" data-custom-background-input></label><button type="button" data-remove-custom-background hidden><i class="fa-solid fa-trash-can"></i><span>Entfernen</span></button></div></div>
          <label class="settings-select"><span><strong>Schriftart</strong><small>Für alle Ansichten</small></span><select data-personal-setting="fontFamily"><option value="inter">Inter</option><option value="system">Systemschrift</option><option value="segoe">Segoe UI</option><option value="aptos">Aptos</option><option value="calibri">Calibri</option><option value="cambria">Cambria</option><option value="times">Times New Roman</option><option value="arial">Arial</option><option value="verdana">Verdana</option><option value="tahoma">Tahoma</option><option value="trebuchet">Trebuchet MS</option><option value="century">Century Gothic</option><option value="courier">Courier New</option><option value="rounded">Abgerundet</option><option value="serif">Serif</option><option value="mono">Monospace</option></select></label>
          <label class="settings-select"><span><strong>Schriftgröße</strong><small>Auch für Karten und Dialoge</small></span><select data-personal-setting="fontScale"><option value="1">Normal</option><option value="1.1">Groß</option><option value="1.2">Sehr groß</option><option value="1.3">Maximal</option></select></label>
        </div>
      </section>`);
    document.querySelectorAll("[data-personal-setting]").forEach((control) => {
      control.value = String(settings[control.dataset.personalSetting] || ({ appBackground: "midnight", fontFamily: "inter", fontScale: 1.1 })[control.dataset.personalSetting]);
      control.addEventListener("change", () => {
        const value = control.dataset.personalSetting === "fontScale" ? Number(control.value) : control.value;
        saveSettings({ [control.dataset.personalSetting]: value });
        notify("Darstellung wurde gespeichert.");
      });
    });
    installBackgroundPicker();
    document.querySelector("[data-annual-vacation]")?.addEventListener("change", (event) => {
      const annualVacationDays = Math.max(0, Math.round(Number(event.target.value || 0)));
      const updated = saveSettings({ annualVacationDays });
      document.querySelector("[data-vacation-remaining]").textContent = `${Math.max(0, Number(updated.annualVacationDays || 0) - vacationUsage(year))} Tage`;
      notify("Jahresurlaub wurde gespeichert.");
    });
    refreshVacationBalance();
  }

  function installSetup() {
    const settings = read(SETTINGS_KEY);
    const profile = read("timeflow-profile-v1");
    const birthDate = String(profile.birthDate || settings.birthDate || "");
    const alreadyConfigured = read(SETUP_KEY, null)?.completed && /^\d{4}-\d{2}-\d{2}$/.test(birthDate);
    if (alreadyConfigured || document.getElementById("privateInitialSetup")) return;
    document.body.insertAdjacentHTML("beforeend", `
      <dialog class="private-initial-setup" id="privateInitialSetup" aria-labelledby="privateInitialSetupTitle">
        <form method="dialog"><span class="setup-icon"><i class="fa-solid fa-user-clock"></i></span><small>ERSTEINRICHTUNG</small><h2 id="privateInitialSetupTitle">Deine Grundlage für TimeFlow</h2><p>Trage deine Vertragswerte und dein Geburtsdatum ein. TimeFlow nutzt das Alter für Hinweise zu Arbeitszeit, Pausen und Ruhezeiten.</p><label>Geburtsdatum<span><input name="birthDate" type="date" autocomplete="bday" max="${new Date().toLocaleDateString("sv-SE")}" required></span></label><label>Monatliche Sollstunden<span><input name="monthlyTargetHours" type="number" inputmode="decimal" min="0.25" max="744" step="0.25" required><b>Stunden</b></span></label><label>Verfügbare Urlaubstage pro Jahr<span><input name="annualVacationDays" type="number" inputmode="numeric" min="0" max="366" step="1" required><b>Tage</b></span></label><button type="submit"><i class="fa-solid fa-check"></i> Angaben speichern und starten</button><em>Die Prüfung liefert Hinweise und ersetzt keine rechtliche Beratung oder betriebliche Einzelfallprüfung.</em></form>
      </dialog>`);
    const dialog = document.getElementById("privateInitialSetup");
    const form = dialog.querySelector("form");
    form.elements.monthlyTargetHours.value = Number(settings.monthlyTargetHours || 160);
    form.elements.annualVacationDays.value = Number(settings.annualVacationDays || 0);
    form.elements.birthDate.value = birthDate;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const savedBirthDate = String(form.elements.birthDate.value);
      write("timeflow-profile-v1", { ...profile, birthDate: savedBirthDate });
      saveSettings({ birthDate: savedBirthDate, monthlyTargetHours: Number(form.elements.monthlyTargetHours.value), annualVacationDays: Math.round(Number(form.elements.annualVacationDays.value)), fontScale: Number(settings.fontScale || 1.1) });
      write(SETUP_KEY, { completed: true, completedAt: new Date().toISOString() });
      window.TimeFlowPlatform.dialog.close(dialog);
      installSettings();
      refreshVacationBalance();
      notify("TimeFlow ist für deine Vertragswerte eingerichtet.");
    });
    window.TimeFlowPlatform.dialog.open(dialog);
  }

  function applyRoleVisibility(access = window.TimeFlowBetaAccess || {}) {
    document.documentElement.classList.toggle("timeflow-beta-admin", Boolean(access.admin));
    document.documentElement.classList.toggle("timeflow-beta-user", !access.admin);
  }

  function initialize(access = window.TimeFlowBetaAccess || {}, verified = false) {
    applyRoleVisibility(access);
    applyPersonalization();
    restoreCustomBackground();
    installSettings();
    if (verified) installSetup();
  }

  document.addEventListener("DOMContentLoaded", () => initialize(window.TimeFlowBetaAccess || {}, Boolean(window.TimeFlowBetaAccess)));
  document.addEventListener("timeflow:beta-access-ready", (event) => initialize(event.detail, true));
  document.addEventListener("timeflow:private-schedule-updated", () => { installSettings(); refreshVacationBalance(); });
}());

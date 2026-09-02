(function () {
  "use strict";
  const SETTINGS_KEY = "timeflow-settings-v1";
  const SETUP_KEY = "timeflow-private-setup-v1";
  const TARGETS_KEY = "timeflow-monthly-targets-v1";
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
    root.dataset.tfFont = ["inter", "system", "serif"].includes(settings.fontFamily) ? settings.fontFamily : "inter";
    root.dataset.tfBackground = ["midnight", "ocean", "teal", "violet"].includes(settings.appBackground) ? settings.appBackground : "midnight";
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
          <label class="settings-select"><span><strong>Hintergrund</strong><small>Farbstimmung der gesamten App</small></span><select data-personal-setting="appBackground"><option value="midnight">Mitternacht</option><option value="ocean">Ozeanblau</option><option value="teal">Petrol</option><option value="violet">Violett</option></select></label>
          <label class="settings-select"><span><strong>Schriftart</strong><small>Für alle Ansichten</small></span><select data-personal-setting="fontFamily"><option value="inter">Inter</option><option value="system">Systemschrift</option><option value="serif">Serif</option></select></label>
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
    const alreadyConfigured = read(SETUP_KEY, null)?.completed || (Number(settings.monthlyTargetHours) > 0 && Number.isFinite(Number(settings.annualVacationDays)));
    if (alreadyConfigured || document.getElementById("privateInitialSetup")) return;
    document.body.insertAdjacentHTML("beforeend", `
      <dialog class="private-initial-setup" id="privateInitialSetup" aria-labelledby="privateInitialSetupTitle">
        <form method="dialog"><span class="setup-icon"><i class="fa-solid fa-user-clock"></i></span><small>ERSTEINRICHTUNG</small><h2 id="privateInitialSetupTitle">Deine Grundlage für TimeFlow</h2><p>Trage einmal deine vertraglichen Monatsstunden und deinen Jahresurlaub ein. Beides kannst du später jederzeit in den Einstellungen ändern.</p><label>Monatliche Sollstunden<span><input name="monthlyTargetHours" type="number" inputmode="decimal" min="0.25" max="744" step="0.25" required><b>Stunden</b></span></label><label>Verfügbare Urlaubstage pro Jahr<span><input name="annualVacationDays" type="number" inputmode="numeric" min="0" max="366" step="1" required><b>Tage</b></span></label><button type="submit"><i class="fa-solid fa-check"></i> Angaben speichern und starten</button><em>Diese Werte werden nur für deine persönlichen Berechnungen verwendet.</em></form>
      </dialog>`);
    const dialog = document.getElementById("privateInitialSetup");
    const form = dialog.querySelector("form");
    form.elements.monthlyTargetHours.value = Number(settings.monthlyTargetHours || 160);
    form.elements.annualVacationDays.value = Number(settings.annualVacationDays || 0);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      saveSettings({ monthlyTargetHours: Number(form.elements.monthlyTargetHours.value), annualVacationDays: Math.round(Number(form.elements.annualVacationDays.value)), fontScale: Number(settings.fontScale || 1.1) });
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
    installSettings();
    if (verified && !access.admin) installSetup();
  }

  document.addEventListener("DOMContentLoaded", () => initialize(window.TimeFlowBetaAccess || {}, Boolean(window.TimeFlowBetaAccess)));
  document.addEventListener("timeflow:beta-access-ready", (event) => initialize(event.detail, true));
  document.addEventListener("timeflow:private-schedule-updated", () => { installSettings(); refreshVacationBalance(); });
}());

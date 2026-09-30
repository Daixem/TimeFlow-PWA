(function () {
  "use strict";
  const KEY = "timeflow-beta-consent-v1"; const VERSION = "0041-retention-2026-09";
  const read = () => { try { return JSON.parse(window.TimeFlowPlatform.storage.getItem(KEY) || "null"); } catch { return null; } };
  const init = () => {
    if (document.getElementById("betaPrivacyDialog")) return;
    document.body.insertAdjacentHTML("beforeend", `<dialog class="beta-privacy-dialog" id="betaPrivacyDialog"><header><span><i class="fa-solid fa-shield-halved"></i></span><div><small>GESCHÜTZTE BETA</small><h2>Beta-Hinweise & Datenschutz</h2></div></header><section><h3>Welche Daten TimeFlow speichert</h3><p>Profil und Einstellungen, eigene Dienstpläne, Stempelungen, Pausen, Arbeitszeitkonto, Korrekturhistorie und persönliche Lernwerte des Dienstplanimports.</p><h3>Wofür die Daten verwendet werden</h3><p>Für deine Zeiterfassung, Dienstplanung, Synchronisierung und die von dir gewählten Erinnerungen. Teamdaten werden zusätzlich für die Arbeitszeitverwaltung deines Unternehmens verwendet.</p><h3>Was bei einer Cloud-Kontolöschung passiert</h3><p>Profil, Synchronisierung und dein Teamzugang werden entfernt. Wenn die 30-Tage-Wiederherstellung in deiner Umgebung aktiviert ist, zeigt TimeFlow dir den genauen Löschtermin und einen Knopf zum Wiederherstellen. Andernfalls werden Arbeitszeiten durch diesen Schritt nicht gelöscht.</p><h3>Arbeitszeit im Unternehmen</h3><p>Team-Arbeitszeiten bleiben während deiner Beschäftigung und anschließend 24 Monate für dein Unternehmen nachvollziehbar. Eine Kontolöschung beendet deinen Zugang, löscht diese Nachweise aber nicht vorzeitig. Nur ein dokumentierter rechtlicher Grund kann die Frist für betroffene Daten verlängern.</p><h3>Lokale Daten und Sicherungen</h3><p>Daten auf diesem Gerät werden getrennt gelöscht. Nutze dafür „Lokale Daten löschen“. Technische Sicherungen können noch für eine begrenzte Zeit bestehen; bei einer Wiederherstellung werden bereits fällige Löschungen erneut ausgeführt.</p><h3>Wichtige Beta-Grenzen</h3><p>Importierte Dienstpläne und Berechnungen müssen kontrolliert werden. Benachrichtigungen bei vollständig geschlossener PWA können ohne Push-Zustellung des Betriebssystems ausbleiben.</p><h3>Deine Kontrolle</h3><p>Du kannst Daten exportieren, Arbeitszeiten korrigieren, lokale Daten löschen und deine Cloud-Daten entfernen. Eine aktivierte 30-Tage-Wiederherstellung erkennst du immer am sichtbaren Löschtermin in den Einstellungen.</p></section><label><input type="checkbox" data-beta-consent-check> <span>Ich habe die Beta-Hinweise und die Regeln zur Speicherung und Löschung gelesen.</span></label><footer><button type="button" data-beta-close>Schließen</button><button type="button" data-beta-accept disabled>Einverstanden</button></footer></dialog>`);
    const dialog = document.getElementById("betaPrivacyDialog"); const check = dialog.querySelector("[data-beta-consent-check]"); const accept = dialog.querySelector("[data-beta-accept]");
    const open = (required = false) => { dialog.dataset.required = String(required); check.checked = read()?.version === VERSION; accept.disabled = !check.checked; window.TimeFlowPlatform.dialog.open(dialog); };
    check.addEventListener("change", () => { accept.disabled = !check.checked; }); accept.addEventListener("click", () => { window.TimeFlowPlatform.storage.setItem(KEY, JSON.stringify({ version: VERSION, acceptedAt: new Date().toISOString() })); document.dispatchEvent(new CustomEvent("timeflow:settings-updated")); window.TimeFlowPlatform.dialog.close(dialog); });
    dialog.querySelector("[data-beta-close]").addEventListener("click", () => { if (dialog.dataset.required === "true" && read()?.version !== VERSION) return; window.TimeFlowPlatform.dialog.close(dialog); }); dialog.addEventListener("cancel", (event) => { if (dialog.dataset.required === "true" && read()?.version !== VERSION) event.preventDefault(); });
    document.addEventListener("click", (event) => { if (event.target.closest("[data-beta-privacy]")) open(false); });
    document.addEventListener("timeflow:session-ready", (event) => { if (event.detail?.source === "platform" && read()?.version !== VERSION) open(true); });
  };
  const refreshRetentionPreview = async () => {
    const dialog = document.getElementById("betaPrivacyDialog");
    if (!dialog) return;
    let panel = dialog.querySelector("[data-retention-preview]");
    if (!panel) {
      const label = dialog.querySelector("label");
      if (!label) return;
      label.insertAdjacentHTML("beforebegin", `<section data-retention-preview hidden><h3>Löschvorschau</h3><p data-retention-preview-status>Die Vorschau wird geprüft …</p></section>`);
      panel = dialog.querySelector("[data-retention-preview]");
    }
    try {
      const response = await fetch("/api/admin/retention", { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) return;
      const preview = await response.json();
      const count = Number(preview?.eligibleCount || 0);
      panel.hidden = false;
      panel.querySelector("[data-retention-preview-status]").textContent = count === 0
        ? "Derzeit wäre keine Arbeitszeit von einer späteren Löschung betroffen. Es wird nichts gelöscht."
        : `${count} Arbeitszeitkonto bzw. Arbeitszeitkonten wären nach Ablauf der jeweiligen Frist betroffen. Es wird nichts gelöscht.`;
    } catch (_error) {
      // Die Vorschau bleibt für nicht berechtigte oder nicht verbundene Konten unsichtbar.
    }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
  document.addEventListener("click", (event) => { if (event.target.closest("[data-beta-privacy]")) window.setTimeout(refreshRetentionPreview, 0); });
  document.addEventListener("timeflow:session-ready", () => window.setTimeout(refreshRetentionPreview, 0));
}());

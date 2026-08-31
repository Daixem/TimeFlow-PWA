(function () {
  "use strict";
  const KEY = "timeflow-private-schedule-v1";
  const platform = () => window.TimeFlowPlatform;
  const privateMode = () => document.documentElement.classList.contains("timeflow-private-mode") || document.body.dataset.appMode === "private";
  const read = () => { try { const value = JSON.parse(platform().storage.getItem(KEY) || "[]"); return Array.isArray(value) ? value : []; } catch (_error) { return []; } };
  const dateValue = (text) => { const match = String(text).match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/); if (!match) return ""; return `${match[3].length === 2 ? "20" + match[3] : match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`; };
  const parse = (text) => {
    const source = String(text).replace(/[–—]/g, "-").replace(/\r/g, "\n");
    const lines = source.split(/\n|;/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
    const range = source.match(/(\d{1,2})[.]?(\d{2})\s*-\s*(\d{1,2})[.]?(\d{2})/);
    const now = new Date();
    const startMonth = Number(range?.[2] || now.getMonth() + 1);
    const endMonth = Number(range?.[4] || startMonth);
    const startYear = now.getFullYear();
    let pendingDate = "";
    let pendingWeekday = "";
    const result = [];
    const inferredDate = (day, month = startMonth) => {
      const year = month < startMonth && endMonth < startMonth ? startYear + 1 : startYear;
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    };
    lines.forEach((line) => {
      const isoDate = line.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
      const partialDate = line.match(/\b(\d{1,2})[.\/-](\d{1,2})(?:[.]|\b)/);
      const fullDate = dateValue(line);
      const dayMarker = line.match(/(?:^|\s)(?:Mo|Di|Mi|Do|Fr|Sa|So)[.,]?\s*(\d{1,2})(?:\s|$)/i);
      const weekdayOnly = line.match(/(?:^|\s)(Mo|Di|Mi|Do|Fr|Sa|So)(?:ntag|enstag|ttwoch|nnerstag|eitag|mstag)?[.,]?(?:\s|$)/i);
      if (isoDate) pendingDate = `${isoDate[1]}-${isoDate[2].padStart(2, "0")}-${isoDate[3].padStart(2, "0")}`;
      else if (fullDate) pendingDate = fullDate;
      else if (partialDate && Number(partialDate[2]) <= 12) pendingDate = inferredDate(Number(partialDate[1]), Number(partialDate[2]));
      else if (dayMarker) {
        const day = Number(dayMarker[1]);
        const month = range && day < Number(range[1]) ? endMonth : startMonth;
        pendingDate = inferredDate(day, month);
      }
      else if (pendingWeekday && /^\d{1,2}$/.test(line)) { const day = Number(line); pendingDate = inferredDate(day, range && day < Number(range[1]) ? endMonth : startMonth); }
      if (weekdayOnly) pendingWeekday = weekdayOnly[1].slice(0, 2).toLowerCase();
      const normalizedTimeLine = line.replace(/\b([0-2]?\d)([0-5]\d)\b/g, "$1:$2").replace(/\b([0-2]?\d)\s*(?:Uhr|h)\b/gi, "$1:00");
      const times = [...normalizedTimeLine.matchAll(/(?:^|\D)([0-2]?\d)[:.]([0-5]\d)(?=\D|$)/g)].map((match) => `${match[1].padStart(2, "0")}:${match[2]}`);
      if (pendingDate && times.length > 1) {
        result.push({ id: `import-${Date.now()}-${result.length}`, date: pendingDate, start: times[0], end: times[1], break: 30, title: /früh/i.test(line) ? "Frühschicht" : /spät/i.test(line) ? "Spätschicht" : /nacht/i.test(line) ? "Nachtschicht" : "Arbeit", note: "Aus Dienstplan-Screenshot erkannt" });
        pendingDate = "";
      }
    });
    return result;
  };
  window.TimeFlowPrivateScheduleParser = parse;
  async function pdfText(file) {
    const pdfjs = await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
    const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    let text = "";
    for (let number = 1; number <= pdf.numPages; number += 1) { const content = await (await pdf.getPage(number)).getTextContent(); text += `\n${content.items.map((item) => item.str).join(" ")}`; }
    return text;
  }
  async function imageText(file, status) {
    status.textContent = "Das Bild wird lokal gelesen – das kann einen Moment dauern …";
    const module = await import("https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.esm.min.js");
    const api = module.default || module;
    const bitmap = await createImageBitmap(file);
    const scale = Math.max(1, Math.min(2.5, 2400 / Math.max(bitmap.width, bitmap.height)));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close?.();
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height); let brightness = 0;
    for (let index = 0; index < pixels.data.length; index += 4) brightness += (pixels.data[index] + pixels.data[index + 1] + pixels.data[index + 2]) / 3;
    const invert = brightness / (pixels.data.length / 4) < 128;
    for (let index = 0; index < pixels.data.length; index += 4) { let gray = .299 * pixels.data[index] + .587 * pixels.data[index + 1] + .114 * pixels.data[index + 2]; if (invert) gray = 255 - gray; gray = gray > 155 ? 255 : gray < 80 ? 0 : gray; pixels.data[index] = pixels.data[index + 1] = pixels.data[index + 2] = gray; }
    context.putImageData(pixels, 0, 0);
    const result = await api.recognize(canvas, "deu", { logger: (message) => { if (message.status === "recognizing text") status.textContent = `Texterkennung: ${Math.round((message.progress || 0) * 100)} %`; } });
    return result.data.text;
  }
  function install() {
    const tabs = document.querySelector("#schedulePage .schedule-tabs");
    if (!tabs || document.querySelector(".private-import-panel")) return;
    const panel = document.createElement("section");
    panel.className = "private-import-panel";
    panel.innerHTML = `<header><div><small>PRIVAT / EINZELNUTZUNG</small><h2>Mein eigener Dienstplan</h2><p>Einsätze aus Dateien erkennen und nach deiner Freigabe übernehmen.</p></div><button type="button" data-pick-plan><i class="fa-solid fa-file-arrow-up"></i> Dienstplan hochladen</button></header><input hidden type="file" data-plan-file accept="image/*,.pdf,.csv,.txt,.json,.ics,application/pdf,text/csv,text/plain,application/json,text/calendar"><p class="private-import-note"><i class="fa-solid fa-shield-halved"></i> Auswählen allein ändert nichts. Die Übernahme erfolgt erst nach deiner ausdrücklichen Zustimmung.</p><div class="private-imported-shifts" data-imported-shifts></div>`;
    tabs.insertAdjacentElement("afterend", panel);
    document.body.insertAdjacentHTML("beforeend", `<dialog class="private-import-dialog" id="privateImportDialog"><header><div><small>IMPORT-VORSCHAU</small><h2>Erkannte Einsätze prüfen und korrigieren</h2><p data-import-status>Die Datei wird analysiert.</p></div><button type="button" data-close-import aria-label="Schließen"><i class="fa-solid fa-xmark"></i></button></header><form><div class="private-import-toolbar"><span>Jeder Wert kann vor der Übernahme geändert werden.</span><button type="button" data-add-import-row><i class="fa-solid fa-plus"></i> Fehlenden Einsatz ergänzen</button></div><div class="private-import-preview" data-import-preview></div><label class="private-import-consent"><input type="checkbox" data-import-consent><span>Ich habe alle Einträge geprüft und stimme der Übernahme in meinen privaten Dienstplan zu.</span></label><footer><button type="button" data-close-import>Abbrechen</button><button type="submit" data-commit-import disabled><i class="fa-solid fa-check"></i> Verbindlich übernehmen</button></footer></form></dialog>`);
    const dialog = document.getElementById("privateImportDialog"); const input = panel.querySelector("[data-plan-file]"); const status = dialog.querySelector("[data-import-status]"); const preview = dialog.querySelector("[data-import-preview]"); const savedList = panel.querySelector("[data-imported-shifts]"); const consent = dialog.querySelector("[data-import-consent]"); const commit = dialog.querySelector("[data-commit-import]"); let entries = [];
    const renderSaved = () => {
      const shifts = read().sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
      savedList.innerHTML = shifts.length ? shifts.map((entry) => `<article><span><small>${new Date(`${entry.date}T12:00:00`).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" })}</small><strong>${entry.start} – ${entry.end}</strong></span><span><small>${entry.title || "Arbeit"}</small><strong>${Number(entry.break || 0)} Min. Pause</strong></span></article>`).join("") : '<p class="private-import-empty">Noch keine eigenen Einsätze gespeichert.</p>';
      const today = new Date().toLocaleDateString("sv-SE"); const next = shifts.find((entry) => entry.date >= today); const card = document.querySelectorAll(".shift-card")[1];
      if (next && card && privateMode()) { card.querySelector("p").textContent = new Date(`${next.date}T12:00:00`).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" }); card.querySelector("strong").textContent = `${next.start} – ${next.end}`; card.querySelector("span").textContent = next.title || "Arbeit"; }
    };
    const render = () => { preview.innerHTML = entries.length ? entries.map((entry, index) => `<article><label class="import-title">Schicht<input type="text" maxlength="40" data-i="${index}" data-field="title" value="${entry.title || "Arbeit"}"></label><label>Datum<input type="date" data-i="${index}" data-field="date" value="${entry.date}"></label><label>Beginn<input type="time" data-i="${index}" data-field="start" value="${entry.start}"></label><label>Ende<input type="time" data-i="${index}" data-field="end" value="${entry.end}"></label><label>Pause<select data-i="${index}" data-field="break"><option value="0"${Number(entry.break) === 0 ? " selected" : ""}>Keine</option><option value="15"${Number(entry.break) === 15 ? " selected" : ""}>15 Min.</option><option value="30"${Number(entry.break) === 30 ? " selected" : ""}>30 Min.</option><option value="45"${Number(entry.break) === 45 ? " selected" : ""}>45 Min.</option><option value="60"${Number(entry.break) === 60 ? " selected" : ""}>60 Min.</option></select></label><button type="button" data-remove="${index}" aria-label="Entfernen"><i class="fa-regular fa-trash-can"></i></button></article>`).join("") : '<p class="private-import-empty">Keine vollständigen Schichten erkannt. Ergänze einen Einsatz oder wähle eine besser lesbare Datei.</p>'; consent.checked = false; commit.disabled = true; };
    panel.querySelector("[data-pick-plan]").addEventListener("click", () => input.click());
    input.addEventListener("change", async () => {
      const file = input.files?.[0]; if (!file) return; entries = []; render(); status.textContent = `${file.name} wird geprüft …`; platform().dialog.open(dialog);
      try { let text = file.type.startsWith("image/") ? await imageText(file, status) : file.type === "application/pdf" || /\.pdf$/i.test(file.name) ? await pdfText(file) : await file.text(); if (/\.json$/i.test(file.name)) { try { const json = JSON.parse(text); const list = Array.isArray(json) ? json : json.shifts; if (Array.isArray(list)) entries = list.map((item, index) => ({ id: `import-${Date.now()}-${index}`, date: item.date, start: item.start, end: item.end, break: Number(item.break ?? 30), title: item.title || "Arbeit", note: "Aus Datei importiert" })).filter((item) => item.date && item.start && item.end); } catch (_error) { entries = []; } } if (!entries.length) entries = parse(text); status.textContent = entries.length ? `${entries.length} mögliche Einsätze erkannt. Bitte jeden Eintrag kontrollieren.` : "Keine vollständigen Einsätze erkannt."; } catch (_error) { status.textContent = "Diese Datei konnte auf dem Gerät nicht automatisch gelesen werden."; }
      render(); input.value = "";
    });
    preview.addEventListener("input", (event) => { const entry = entries[Number(event.target.dataset.i)]; if (entry && event.target.dataset.field) entry[event.target.dataset.field] = event.target.value; consent.checked = false; commit.disabled = true; });
    preview.addEventListener("change", (event) => { const entry = entries[Number(event.target.dataset.i)]; if (entry && event.target.dataset.field) entry[event.target.dataset.field] = event.target.dataset.field === "break" ? Number(event.target.value) : event.target.value; consent.checked = false; commit.disabled = true; });
    preview.addEventListener("click", (event) => { const button = event.target.closest("[data-remove]"); if (button) { entries.splice(Number(button.dataset.remove), 1); render(); } });
    dialog.querySelector("[data-add-import-row]").addEventListener("click", () => { entries.push({ id: `import-${Date.now()}-${entries.length}`, date: new Date().toLocaleDateString("sv-SE"), start: "08:00", end: "16:30", break: 30, title: "Arbeit", note: "In Import-Vorschau ergänzt" }); render(); });
    consent.addEventListener("change", () => { commit.disabled = !consent.checked || !entries.length || entries.some((entry) => !entry.date || !entry.start || !entry.end || entry.end <= entry.start); });
    dialog.querySelectorAll("[data-close-import]").forEach((button) => button.addEventListener("click", () => platform().dialog.close(dialog)));
    dialog.querySelector("form").addEventListener("submit", (event) => { event.preventDefault(); if (commit.disabled) return; platform().storage.setItem(KEY, JSON.stringify(read().concat(entries))); platform().dialog.close(dialog); renderSaved(); document.dispatchEvent(new CustomEvent("timeflow:private-schedule-updated")); const toast = document.getElementById("toast"); toast.textContent = `${entries.length} Einsätze wurden übernommen.`; toast.classList.add("is-visible"); });
    const updateMode = () => { panel.hidden = !privateMode(); if (privateMode()) renderSaved(); }; updateMode(); new MutationObserver(updateMode).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();
}());

(function () {
  "use strict";
  const KEY = "timeflow-private-schedule-v1";
  const platform = () => window.TimeFlowPlatform;
  const privateMode = () => document.documentElement.classList.contains("timeflow-private-mode") || document.body.dataset.appMode === "private";
  const read = () => { try { const value = JSON.parse(platform().storage.getItem(KEY) || "[]"); return Array.isArray(value) ? value : []; } catch (_error) { return []; } };
  const mergeEntries = (saved, incoming) => {
    const merged = new Map(saved.map((entry) => [entry.date, entry]));
    incoming.forEach((entry) => merged.set(entry.date, entry));
    return [...merged.values()].sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
  };
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const minutes = (entry) => {
    if (!entry.start || !entry.end || /^(frei|urlaub|krank)$/i.test(entry.title)) return 0;
    const [startHour, startMinute] = entry.start.split(":").map(Number); const [endHour, endMinute] = entry.end.split(":").map(Number);
    let gross = endHour * 60 + endMinute - startHour * 60 - startMinute; if (gross <= 0) gross += 24 * 60;
    return Math.max(0, gross - Number(entry.break || 0));
  };
  const duration = (value) => `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")} h`;
  const userKey = () => {
    try { const session = JSON.parse(platform().storage.getItem("timeflow-session-v1") || "{}"); if (session.userId) return session.userId; } catch (_error) { /* Profil als Ersatz */ }
    try { const profile = JSON.parse(platform().storage.getItem("timeflow-profile-v1") || "{}"); if (profile.email) return String(profile.email).trim().toLowerCase(); } catch (_error) { /* Lokales Profil */ }
    return "local-private-user";
  };
  const learningKey = () => `timeflow-private-schedule-learning-v1:${userKey()}`;
  const readLearning = () => { try { const value = JSON.parse(platform().storage.getItem(learningKey()) || "{}"); return value && typeof value === "object" ? value : {}; } catch (_error) { return {}; } };
  const writeLearning = (value) => platform().storage.setItem(learningKey(), JSON.stringify(value));
  const dateValue = (text) => { const match = String(text).match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/); if (!match) return ""; return `${match[3].length === 2 ? "20" + match[3] : match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`; };
  const parse = (text) => {
    const source = String(text).replace(/[–—]/g, "-").replace(/\r/g, "\n");
    const lines = source.split(/\n|;/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
    const range = source.match(/(\d{1,2})[.]?(\d{2})[.]?\s*-\s*(\d{1,2})[.]?(\d{2})[.]?/);
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
      const markerLine = line.replace(/\b20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}\b/g, "").replace(/\b\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}\b/g, "").replace(/^(?:Mo|Di|Mi|Do|Fr|Sa|So)[.,]?\s*\d{0,2}/i, "").trim();
      const normalizedTimeLine = line.replace(/\b([0-2]?\d)([0-5]\d)\s*(?:-|bis)\s*([0-2]?\d)([0-5]\d)\b/gi, "$1:$2 - $3:$4").replace(/\b([0-2]?\d)\s*(?:Uhr|h)\b/gi, "$1:00");
      let timeOnlyLine = normalizedTimeLine.replace(/\b20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}\b/g, " ").replace(/\b\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}\b/g, " ");
      const rawTimeCount = [...timeOnlyLine.matchAll(/(?:^|\D)([0-2]?\d)[:.]([0-5]\d)(?=\D|$)/g)].length;
      if (rawTimeCount < 2) timeOnlyLine = timeOnlyLine.replace(/\b(\d{1,2})[.\/-](\d{1,2})[.]?(?=\s|$)/g, (full, _day, month) => Number(month) <= 12 ? " " : full);
      const times = [...timeOnlyLine.matchAll(/(?:^|\D)([0-2]?\d)[:.]([0-5]\d)(?=\D|$)/g)].map((match) => `${match[1].padStart(2, "0")}:${match[2]}`);
      if (pendingDate && times.length > 1) {
        result.push({ id: `import-${Date.now()}-${result.length}`, date: pendingDate, start: times[0], end: times[1], break: 30, title: /früh/i.test(line) ? "Frühschicht" : /spät/i.test(line) ? "Spätschicht" : /nacht/i.test(line) ? "Nachtschicht" : "Arbeit", note: "Aus Dienstplan-Screenshot erkannt" });
        pendingDate = "";
      } else if (pendingDate && /^(?:[-–—]|A|F|frei|off|U|Urlaub|K|Krank)$/i.test(markerLine)) {
        const marker = markerLine.toUpperCase() || "FREI"; const defaultTitle = /^(?:U|URLAUB)$/i.test(marker) ? "Urlaub" : /^(?:K|KRANK)$/i.test(marker) ? "Krank" : "Frei";
        result.push({ id: `import-${Date.now()}-${result.length}`, date: pendingDate, start: "", end: "", break: 0, title: readLearning()[marker] || defaultTitle, sourceMarker: marker, note: `Abwesenheit (${markerLine}) aus Dienstplan erkannt` });
        pendingDate = "";
      }
    });
    return result;
  };
  const parseLayout = (data, imageWidth) => {
    const words = [];
    const visit = (node) => {
      if (!node || typeof node !== "object") return;
      if (typeof node.text === "string" && node.bbox && !node.words && !node.lines && !node.paragraphs && !node.blocks) words.push(node);
      ["blocks", "paragraphs", "lines", "words"].forEach((key) => Array.isArray(node[key]) && node[key].forEach(visit));
    };
    visit({ blocks: data.blocks || [] });
    if (!words.length) return [];
    const allText = words.map((word) => word.text).join(" ").replace(/[–—]/g, "-");
    const range = allText.match(/(\d{1,2})[.]?(\d{2})[.]?\s*-\s*(\d{1,2})[.]?(\d{2})[.]?/);
    const now = new Date(); const startMonth = Number(range?.[2] || now.getMonth() + 1); const endMonth = Number(range?.[4] || startMonth); const startDay = Number(range?.[1] || 1);
    const detectedDayRows = words.filter((word) => /^(Mo|Di|Mi|Do|Fr|Sa|So)[.,]?$/i.test(word.text) && word.bbox.x0 < imageWidth * .24).map((weekday) => {
      const middle = (weekday.bbox.y0 + weekday.bbox.y1) / 2;
      const dayWord = words.filter((word) => /^\d{1,2}$/.test(word.text) && word.bbox.x0 < imageWidth * .24).sort((a, b) => Math.abs(((a.bbox.y0 + a.bbox.y1) / 2) - middle) - Math.abs(((b.bbox.y0 + b.bbox.y1) / 2) - middle))[0];
      return dayWord && Math.abs(((dayWord.bbox.y0 + dayWord.bbox.y1) / 2) - middle) < Math.max(70, imageWidth * .055) ? { weekday: weekday.text, day: Number(dayWord.text), y: (middle + (dayWord.bbox.y0 + dayWord.bbox.y1) / 2) / 2 } : null;
    }).filter(Boolean).sort((a, b) => a.y - b.y);
    let dayRows = detectedDayRows.reduce((unique, row) => {
      const duplicate = unique.find((entry) => entry.day === row.day && Math.abs(entry.y - row.y) < Math.max(90, imageWidth * .07));
      if (!duplicate) unique.push(row);
      else duplicate.y = (duplicate.y + row.y) / 2;
      return unique;
    }, []).sort((a, b) => a.y - b.y);
    if (range && dayRows.length >= 2 && dayRows.length < 7) {
      const expectedDays = [];
      const rangeStart = new Date(Date.UTC(now.getFullYear(), startMonth - 1, startDay));
      for (let offset = 0; offset < 7; offset += 1) { const date = new Date(rangeStart); date.setUTCDate(rangeStart.getUTCDate() + offset); expectedDays.push({ day: date.getUTCDate(), month: date.getUTCMonth() + 1, index: offset }); }
      const matched = expectedDays.map((expected) => ({ expected, found: dayRows.find((row) => row.day === expected.day) })).filter((item) => item.found);
      const first = matched[0]; const last = matched[matched.length - 1];
      const step = last.expected.index !== first.expected.index ? (last.found.y - first.found.y) / (last.expected.index - first.expected.index) : 100;
      const origin = matched.reduce((sum, item) => sum + item.found.y - item.expected.index * step, 0) / matched.length;
      dayRows = expectedDays.map((expected) => dayRows.find((row) => row.day === expected.day) || { weekday: "", day: expected.day, y: origin + expected.index * step, inferred: true }).sort((a, b) => a.y - b.y);
    }
    return dayRows.map((row, index) => {
      const previousY = index ? (dayRows[index - 1].y + row.y) / 2 : row.y - (dayRows[index + 1]?.y - row.y || 100) / 2;
      const nextY = index < dayRows.length - 1 ? (row.y + dayRows[index + 1].y) / 2 : row.y + (row.y - dayRows[index - 1]?.y || 100) / 2;
      const band = words.filter((word) => { const y = (word.bbox.y0 + word.bbox.y1) / 2; return y >= previousY && y < nextY && word.bbox.x0 >= imageWidth * .18; }).sort((a, b) => a.bbox.x0 - b.bbox.x0).map((word) => word.text).join(" ").replace(/[–—]/g, "-").replace(/\b([0-2]?\d)([0-5]\d)\b/g, "$1:$2");
      const times = [...band.matchAll(/(?:^|\D)([0-2]?\d)[:.]([0-5]\d)(?=\D|$)/g)].map((match) => `${match[1].padStart(2, "0")}:${match[2]}`);
      const month = range && row.day < startDay ? endMonth : startMonth; const year = month < startMonth && endMonth < startMonth ? now.getFullYear() + 1 : now.getFullYear();
      const free = times.length < 2;
      const rawMarker = band.trim().replace(/^[\s|:;,-]+|[\s|:;,-]+$/g, "");
      const marker = rawMarker ? rawMarker.toUpperCase().slice(0, 30) : "__EMPTY__";
      const learnedTitle = readLearning()[marker];
      const knownFree = marker === "__EMPTY__" || /^(A|F|FREI|OFF|—|-)$/i.test(marker);
      return { id: `import-${Date.now()}-${index}`, date: `${year}-${String(month).padStart(2, "0")}-${String(row.day).padStart(2, "0")}`, start: free ? "" : times[0], end: free ? "" : times[1], break: free ? 0 : 30, title: free ? learnedTitle || (knownFree ? "Frei" : `Prüfen: ${rawMarker}`) : /früh/i.test(band) ? "Frühschicht" : /spät/i.test(band) ? "Spätschicht" : /nacht/i.test(band) ? "Nachtschicht" : "Arbeit", sourceMarker: free ? marker : "", note: free ? `${learnedTitle ? "Persönlich gelernt" : "Aus Dienstplan erkannt"}: ${rawMarker || "leeres Feld"}` : "Aus Dienstplan-Screenshot erkannt" };
    });
  };
  window.TimeFlowPrivateScheduleParser = parse;
  window.TimeFlowPrivateScheduleLayoutParser = parseLayout;
  window.TimeFlowPrivateScheduleMerge = mergeEntries;
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
    const worker = await api.createWorker("deu", 1, { logger: (message) => { if (message.status === "recognizing text") status.textContent = `Texterkennung: ${Math.round((message.progress || 0) * 100)} %`; } });
    await worker.setParameters({ tessedit_pageseg_mode: "11", preserve_interword_spaces: "1" });
    const result = await worker.recognize(canvas, {}, { blocks: true });
    status.textContent = "Wochentage und Datumswerte werden gezielt zugeordnet …";
    const dayCanvas = document.createElement("canvas"); dayCanvas.width = Math.max(180, Math.round(canvas.width * .3)); dayCanvas.height = canvas.height;
    dayCanvas.getContext("2d").drawImage(canvas, 0, 0, dayCanvas.width, dayCanvas.height, 0, 0, dayCanvas.width, dayCanvas.height);
    await worker.setParameters({ tessedit_pageseg_mode: "6", preserve_interword_spaces: "1" });
    const dayResult = await worker.recognize(dayCanvas, {}, { blocks: true });
    await worker.terminate();
    const combinedData = { blocks: [...(result.data.blocks || []), ...(dayResult.data.blocks || [])] };
    return { text: `${result.data.text}\n${dayResult.data.text}`, layoutEntries: parseLayout(combinedData, canvas.width) };
  }
  function install() {
    const tabs = document.querySelector("#schedulePage .schedule-tabs");
    if (!tabs || document.querySelector(".private-import-panel")) return;
    const panel = document.createElement("section");
    panel.className = "private-import-panel";
    panel.innerHTML = `<header><div><small>PRIVAT / EINZELNUTZUNG</small><h2>Mein eigener Dienstplan</h2><p>Lade einen oder mehrere Dienstpläne hoch oder trage deine Einsätze vollständig manuell ein.</p></div><div class="private-import-actions"><button type="button" data-pick-plan><i class="fa-solid fa-file-arrow-up"></i> Dienstplan hochladen</button><button type="button" data-manual-plan><i class="fa-solid fa-pen-to-square"></i> Manuell eintragen</button><button type="button" data-absence-plan><i class="fa-solid fa-calendar-day"></i> Abwesenheit eintragen</button></div></header><input hidden type="file" data-plan-file multiple accept="image/*,.pdf,.csv,.txt,.json,.ics,application/pdf,text/csv,text/plain,application/json,text/calendar"><p class="private-import-formats"><i class="fa-solid fa-file-circle-check"></i> Bilder, Screenshots, PDF, JSON, CSV, TXT und ICS · mehrere Dateien gleichzeitig möglich</p><p class="private-import-note"><i class="fa-solid fa-shield-halved"></i> Auswählen oder Eintragen allein ändert nichts. Die Übernahme erfolgt erst nach deiner ausdrücklichen Zustimmung.</p><p class="private-learning-note" data-learning-note></p>`;
    tabs.insertAdjacentElement("afterend", panel);
    document.body.insertAdjacentHTML("beforeend", `<dialog class="private-import-dialog" id="privateImportDialog"><header><div><small>IMPORT-VORSCHAU</small><h2>Erkannte Einsätze prüfen und korrigieren</h2><p data-import-status>Die Datei wird analysiert.</p></div><button type="button" data-close-import aria-label="Schließen"><i class="fa-solid fa-xmark"></i></button></header><form><div class="private-import-toolbar"><span>Jeder Wert kann vor der Übernahme geändert werden.</span><button type="button" data-add-import-row><i class="fa-solid fa-plus"></i> Fehlenden Einsatz ergänzen</button></div><div class="private-import-preview" data-import-preview></div><label class="private-import-consent"><input type="checkbox" data-import-consent><span>Ich habe alle Einträge geprüft und stimme der Übernahme in meinen privaten Dienstplan zu.</span></label><footer><button type="button" data-close-import>Abbrechen</button><button type="submit" data-commit-import disabled><i class="fa-solid fa-check"></i> Verbindlich übernehmen</button></footer></form></dialog><dialog class="private-absence-dialog" id="privateAbsenceDialog"><header><div><small>TAG KENNZEICHNEN</small><h2>Frei oder Abwesenheit eintragen</h2><p>An diesem Tag wird keine Sollzeit berechnet.</p></div><button type="button" data-close-absence aria-label="Schließen"><i class="fa-solid fa-xmark"></i></button></header><form><label>Datum<input name="date" type="date" required></label><label>Art<select name="title"><option value="Frei">Frei</option><option value="Urlaub">Urlaub</option><option value="Krank">Krank</option></select></label><footer><button type="button" data-close-absence>Abbrechen</button><button type="submit"><i class="fa-solid fa-check"></i> Tag speichern</button></footer></form></dialog>`);
    const dialog = document.getElementById("privateImportDialog"); const absenceDialog = document.getElementById("privateAbsenceDialog"); const absenceForm = absenceDialog.querySelector("form"); const input = panel.querySelector("[data-plan-file]"); const status = dialog.querySelector("[data-import-status]"); const preview = dialog.querySelector("[data-import-preview]"); const learningNote = panel.querySelector("[data-learning-note]"); const consent = dialog.querySelector("[data-import-consent]"); const commit = dialog.querySelector("[data-commit-import]"); let entries = []; let visibleWeekStart = "";
    const renderLearning = () => { const learned = Object.entries(readLearning()).filter(([marker]) => marker !== "__EMPTY__"); learningNote.innerHTML = learned.length ? `<i class="fa-solid fa-brain"></i> Persönlich gelernt: ${learned.map(([marker, title]) => `${marker} = ${title}`).join(" · ")}` : '<i class="fa-solid fa-brain"></i> TimeFlow lernt deine Dienstplan-Kürzel nach einer geprüften Übernahme.'; };
    const renderScheduleViews = (shifts) => {
      const dayPanel = document.querySelector('#schedulePage [data-panel="day"]'); const weekPanel = document.querySelector('#schedulePage [data-panel="week"]'); const periodPanel = document.querySelector('#schedulePage [data-panel="period"]');
      if (!dayPanel || !weekPanel || !periodPanel) return;
      const today = new Date().toLocaleDateString("sv-SE"); const selected = shifts.find((entry) => entry.date === today) || shifts.find((entry) => entry.date >= today) || shifts[0];
      const selectedDate = selected ? new Date(`${selected.date}T12:00:00`) : new Date();
      dayPanel.innerHTML = `<div class="date-switch"><span>${selectedDate.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</span></div>${selected ? `<article class="my-shift"><p><i class="fa-solid fa-briefcase"></i> Eigener Dienstplan</p><div><i class="fa-regular fa-clock"></i><span><strong>${/^(frei|urlaub|krank)$/i.test(selected.title) ? escapeHtml(selected.title) : `${escapeHtml(selected.start)} – ${escapeHtml(selected.end)}`}</strong><small>${escapeHtml(selected.title || "Arbeit")}</small></span><em>Importiert</em></div><footer>${/^(frei|urlaub|krank)$/i.test(selected.title) ? "Kein Einsatz geplant" : `${duration(minutes(selected))} Arbeitszeit · ${Number(selected.break || 0)} Min. Pause`}</footer></article>` : '<p class="private-import-empty">Noch kein eigener Dienstplan übernommen.</p>'}`;
      const monday = visibleWeekStart ? new Date(`${visibleWeekStart}T12:00:00`) : new Date(selectedDate); const weekday = (monday.getDay() + 6) % 7; monday.setDate(monday.getDate() - weekday); visibleWeekStart = monday.toLocaleDateString("sv-SE"); const weekDates = Array.from({ length: 7 }, (_, index) => { const value = new Date(monday); value.setDate(monday.getDate() + index); return value; });
      const weekEntries = weekDates.map((date) => shifts.find((entry) => entry.date === date.toLocaleDateString("sv-SE")) || { date: date.toLocaleDateString("sv-SE"), title: "Frei", start: "", end: "", break: 0 }); const total = weekEntries.reduce((sum, entry) => sum + minutes(entry), 0);
      weekPanel.innerHTML = `<div class="date-switch"><button type="button" data-private-week="previous" aria-label="Vorherige Woche"><i class="fa-solid fa-chevron-left"></i></button><span>${weekDates[0].toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })} – ${weekDates[6].toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}</span><button type="button" data-private-week="next" aria-label="Nächste Woche"><i class="fa-solid fa-chevron-right"></i></button></div><div class="week-summary"><span>Arbeitszeit<strong>${duration(total)}</strong></span><span>Einsätze<strong>${weekEntries.filter((entry) => minutes(entry) > 0).length}</strong></span><span>Pausen<strong>${weekEntries.reduce((sum, entry) => sum + Number(entry.break || 0), 0)} Min.</strong></span><span>Freie Tage<strong>${weekEntries.filter((entry) => !minutes(entry)).length}</strong></span></div><div class="week-list">${weekEntries.map((entry) => { const date = new Date(`${entry.date}T12:00:00`); const free = !minutes(entry); return `<div class="week-row${free ? " free" : ""}"><b>${date.toLocaleDateString("de-DE", { weekday: "short" })}<small>${date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}</small></b><i></i><span>${escapeHtml(entry.title || "Arbeit")}</span><em>${free ? "" : `${Number(entry.break || 0)} Min. Pause`}</em><strong>${free ? "" : `${escapeHtml(entry.start)} – ${escapeHtml(entry.end)}`}</strong></div>`; }).join("")}</div>`;
      periodPanel.innerHTML = shifts.length ? shifts.map((entry) => { const date = new Date(`${entry.date}T12:00:00`); const free = !minutes(entry); return `<article class="period-day"><h2>${date.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}<span>${free ? "Frei" : duration(minutes(entry))}</span></h2><p${free ? "" : ' class="active"'}>${free ? "○" : "●"} ${free ? "Kein Einsatz" : `${escapeHtml(entry.start)} – ${escapeHtml(entry.end)}`} <span>Eigener Dienstplan</span><b>${escapeHtml(entry.title || "Arbeit")}</b></p></article>`; }).join("") : '<p class="private-import-empty">Noch kein eigener Dienstplan übernommen.</p>';
    };
    const renderSaved = () => {
      const shifts = read().sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
      renderScheduleViews(shifts);
      const today = new Date().toLocaleDateString("sv-SE"); const next = shifts.find((entry) => entry.date >= today && !/^(frei|urlaub|krank)$/i.test(entry.title)); const card = document.querySelectorAll(".shift-card")[1];
      if (next && card && privateMode()) { card.querySelector("p").textContent = new Date(`${next.date}T12:00:00`).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" }); card.querySelector("strong").textContent = `${next.start} – ${next.end}`; card.querySelector("span").textContent = next.title || "Arbeit"; }
    };
    const render = () => { preview.innerHTML = entries.length ? entries.map((entry, index) => `<article><label class="import-title">Schicht<input type="text" maxlength="40" data-i="${index}" data-field="title" value="${entry.title || "Arbeit"}"></label><label>Datum<input type="date" data-i="${index}" data-field="date" value="${entry.date}"></label><label>Beginn<input type="time" data-i="${index}" data-field="start" value="${entry.start}"></label><label>Ende<input type="time" data-i="${index}" data-field="end" value="${entry.end}"></label><label>Pause<select data-i="${index}" data-field="break"><option value="0"${Number(entry.break) === 0 ? " selected" : ""}>Keine</option><option value="15"${Number(entry.break) === 15 ? " selected" : ""}>15 Min.</option><option value="30"${Number(entry.break) === 30 ? " selected" : ""}>30 Min.</option><option value="45"${Number(entry.break) === 45 ? " selected" : ""}>45 Min.</option><option value="60"${Number(entry.break) === 60 ? " selected" : ""}>60 Min.</option></select></label><button type="button" data-remove="${index}" aria-label="Entfernen"><i class="fa-regular fa-trash-can"></i></button></article>`).join("") : '<p class="private-import-empty">Keine vollständigen Schichten erkannt. Ergänze einen Einsatz oder wähle eine besser lesbare Datei.</p>'; consent.checked = false; commit.disabled = true; };
    panel.querySelector("[data-pick-plan]").addEventListener("click", () => input.click());
    panel.querySelector("[data-manual-plan]").addEventListener("click", () => {
      entries = [{ id: `manual-${Date.now()}`, date: new Date().toLocaleDateString("sv-SE"), start: "08:00", end: "16:30", break: 30, title: "Arbeit", note: "Manuell eingetragen" }];
      status.textContent = "Trage deinen Einsatz ein und ergänze bei Bedarf weitere Tage.";
      render();
      platform().dialog.open(dialog);
    });
    panel.querySelector("[data-absence-plan]").addEventListener("click", () => { absenceForm.elements.date.value = new Date().toLocaleDateString("sv-SE"); platform().dialog.open(absenceDialog); });
    absenceDialog.querySelectorAll("[data-close-absence]").forEach((button) => button.addEventListener("click", () => platform().dialog.close(absenceDialog)));
    absenceForm.addEventListener("submit", (event) => { event.preventDefault(); const entry = { id: `absence-${Date.now()}`, date: absenceForm.elements.date.value, start: "", end: "", break: 0, title: absenceForm.elements.title.value, note: "Persönlich eingetragen" }; platform().storage.setItem(KEY, JSON.stringify(mergeEntries(read(), [entry]))); visibleWeekStart = ""; platform().dialog.close(absenceDialog); renderSaved(); document.dispatchEvent(new CustomEvent("timeflow:private-schedule-updated")); });
    document.querySelector('#schedulePage [data-panel="week"]').addEventListener("click", (event) => { const button = event.target.closest("[data-private-week]"); if (!button) return; const date = new Date(`${visibleWeekStart}T12:00:00`); date.setDate(date.getDate() + (button.dataset.privateWeek === "next" ? 7 : -7)); visibleWeekStart = date.toLocaleDateString("sv-SE"); renderSaved(); });
    async function readPlanFile(file, fileIndex) {
      status.textContent = `${file.name} wird geprüft …`;
      const imageResult = file.type.startsWith("image/") ? await imageText(file, status) : null;
      const text = imageResult?.text ?? (file.type === "application/pdf" || /\.pdf$/i.test(file.name) ? await pdfText(file) : await file.text());
      let found = imageResult?.layoutEntries?.length ? imageResult.layoutEntries : [];
      if (/\.json$/i.test(file.name) || file.type === "application/json") {
        try {
          const json = JSON.parse(text);
          const list = Array.isArray(json) ? json : json.shifts || json.schedule || json.entries;
          if (Array.isArray(list)) found = list.map((item, index) => ({ id: `import-${Date.now()}-${fileIndex}-${index}`, date: item.date || item.day, start: item.start || item.begin || "", end: item.end || item.finish || "", break: Number(item.break ?? item.pause ?? 30), title: item.title || item.shift || item.type || "Arbeit", note: `Aus ${file.name} importiert` })).filter((item) => item.date);
        } catch (_error) { found = []; }
      }
      if (!found.length) found = parse(text);
      return found.map((entry, index) => ({ ...entry, id: `import-${Date.now()}-${fileIndex}-${index}`, sourceFile: file.name }));
    }
    input.addEventListener("change", async () => {
      const files = [...(input.files || [])]; if (!files.length) return; entries = []; render(); platform().dialog.open(dialog);
      const failed = [];
      for (let index = 0; index < files.length; index += 1) {
        try { entries = mergeEntries(entries, await readPlanFile(files[index], index)); }
        catch (_error) { failed.push(files[index].name); }
      }
      status.textContent = entries.length
        ? `${entries.length} Tage aus ${files.length} Datei${files.length === 1 ? "" : "en"} erkannt. Bitte alle Angaben kontrollieren.${failed.length ? ` Nicht gelesen: ${failed.join(", ")}.` : ""}`
        : "Keine vollständigen Einsätze erkannt. Die Angaben können unten manuell ergänzt werden.";
      render(); input.value = "";
    });
    preview.addEventListener("input", (event) => { const entry = entries[Number(event.target.dataset.i)]; if (entry && event.target.dataset.field) entry[event.target.dataset.field] = event.target.value; consent.checked = false; commit.disabled = true; });
    preview.addEventListener("change", (event) => { const entry = entries[Number(event.target.dataset.i)]; if (entry && event.target.dataset.field) entry[event.target.dataset.field] = event.target.dataset.field === "break" ? Number(event.target.value) : event.target.value; consent.checked = false; commit.disabled = true; });
    preview.addEventListener("click", (event) => { const button = event.target.closest("[data-remove]"); if (button) { entries.splice(Number(button.dataset.remove), 1); render(); } });
    dialog.querySelector("[data-add-import-row]").addEventListener("click", () => { entries.push({ id: `import-${Date.now()}-${entries.length}`, date: new Date().toLocaleDateString("sv-SE"), start: "08:00", end: "16:30", break: 30, title: "Arbeit", note: "In Import-Vorschau ergänzt" }); render(); });
    consent.addEventListener("change", () => { commit.disabled = !consent.checked || !entries.length || entries.some((entry) => !entry.date || (!/^(frei|urlaub|krank)$/i.test(entry.title) && (!entry.start || !entry.end))); });
    dialog.querySelectorAll("[data-close-import]").forEach((button) => button.addEventListener("click", () => platform().dialog.close(dialog)));
    dialog.querySelector("form").addEventListener("submit", (event) => { event.preventDefault(); if (commit.disabled) return; const learned = readLearning(); entries.filter((entry) => entry.sourceMarker).forEach((entry) => { learned[entry.sourceMarker] = entry.title.trim(); }); writeLearning(learned); const saved = read(); const updated = entries.filter((entry) => saved.some((item) => item.date === entry.date)).length; platform().storage.setItem(KEY, JSON.stringify(mergeEntries(saved, entries))); platform().storage.setItem("timeflow-private-last-import-v1", JSON.stringify({ at: new Date().toISOString(), added: entries.length - updated, updated })); platform().dialog.close(dialog); renderLearning(); renderSaved(); document.dispatchEvent(new CustomEvent("timeflow:private-schedule-updated")); const toast = document.getElementById("toast"); toast.textContent = `${entries.length - updated} Tage ergänzt${updated ? `, ${updated} aktualisiert` : ""}. Persönliche Kürzel wurden gelernt.`; toast.classList.add("is-visible"); });
    const updateMode = () => { panel.hidden = !privateMode(); if (privateMode()) { const weekTab = tabs.querySelector('[data-view="week"]'); if (weekTab && weekTab.getAttribute("aria-selected") !== "true") weekTab.click(); renderLearning(); renderSaved(); } }; updateMode(); new MutationObserver(updateMode).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();
}());

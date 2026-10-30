(function () {
  "use strict";
  const KEY = "timeflow-private-schedule-v1";
  const COLLEAGUE_KEY_PREFIX = "timeflow-private-colleague-schedule-v1:";
  const colleagueKey = () => `${COLLEAGUE_KEY_PREFIX}${userKey()}`;
  const PDFJS_MODULE_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";
  const PDFJS_WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
  // OCR is a core private-schedule feature. It deliberately uses fixed local
  // assets rather than an unbounded dynamic CDN import that can stall in a PWA.
  const importScriptUrl = document.currentScript?.src || window.location.href;
  const localAssetUrl = (path) => new URL(path, importScriptUrl).toString();
  const TESSERACT_MODULE_URL = localAssetUrl("../vendor/tesseract/tesseract.esm.min.js");
  const TESSERACT_WORKER_URL = localAssetUrl("../vendor/tesseract/worker.min.js");
  const TESSERACT_CORE_URL = localAssetUrl("../vendor/tesseract/core");
  const TESSERACT_LANGUAGE_URL = localAssetUrl("../vendor/tesseract/lang/4.0.0");
  const OCR_MODULE_TIMEOUT_MS = 20000;
  const OCR_WORKER_TIMEOUT_MS = 30000;
  const OCR_RECOGNITION_TIMEOUT_MS = 90000;
  const IMAGE_DECODE_TIMEOUT_MS = 15000;
  const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
  const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
  const TEXT_EXTENSIONS = new Set(["pdf", "csv", "txt", "json", "ics"]);
  const platform = () => window.TimeFlowPlatform;
  const privateMode = () => document.documentElement.classList.contains("timeflow-private-mode") || document.body.dataset.appMode === "private";
  const read = () => { try { const value = JSON.parse(platform().storage.getItem(KEY) || "[]"); return Array.isArray(value) ? value : []; } catch (_error) { return []; } };
  const readColleagues = () => { try { const value = JSON.parse(platform().storage.getItem(colleagueKey()) || "[]"); return Array.isArray(value) ? value : []; } catch (_error) { return []; } };
  const saveColleagues = (incoming) => {
    const merged = new Map(readColleagues().map((entry) => [`${entry.date}|${normalizeLearningText(entry.personName)}`, entry]));
    incoming.forEach((entry) => merged.set(`${entry.date}|${normalizeLearningText(entry.personName)}`, entry));
    const value = [...merged.values()].sort((a, b) => `${a.date}${a.start}${a.personName}`.localeCompare(`${b.date}${b.start}${b.personName}`));
    platform().storage.setItem(colleagueKey(), JSON.stringify(value));
    return value;
  };
  const mergeEntries = (saved, incoming) => {
    const key = (entry) => entry.isColleague ? `${entry.date}|colleague|${normalizeLearningText(entry.personName)}` : `${entry.date}|personal`;
    const merged = new Map(saved.map((entry) => [key(entry), entry]));
    incoming.forEach((entry) => merged.set(key(entry), entry));
    return [...merged.values()].sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
  };
  const shiftSummary = (entry) => !entry ? "Kein Eintrag" : /^(frei|urlaub|krank)$/i.test(entry.title || "") ? (entry.title || "Frei") : `${entry.title || "Arbeit"}, ${entry.start || "--:--"}–${entry.end || "--:--"}`;
  const saveEntries = (storage, saved, incoming) => {
    const merged = mergeEntries(saved, incoming);
    storage.setItem(KEY, JSON.stringify(merged));
    return merged;
  };
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const minutes = (entry) => {
    if (!entry.start || !entry.end || /^(frei|urlaub|krank)$/i.test(entry.title)) return 0;
    const [startHour, startMinute] = entry.start.split(":").map(Number); const [endHour, endMinute] = entry.end.split(":").map(Number);
    let gross = endHour * 60 + endMinute - startHour * 60 - startMinute; if (gross <= 0) gross += 24 * 60;
    return Math.max(0, gross - Number(entry.break || 0));
  };
  const duration = (value) => `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")} h`;
  const isoWeek = (value) => {
    const date = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  };
  const userKey = () => {
    try { const cached = JSON.parse(platform().storage.getItem("timeflow-platform-session-cache-v1") || "{}"); if (cached.session?.user?.email) return String(cached.session.user.email).trim().toLowerCase(); } catch (_error) { /* Profil als Ersatz */ }
    try { const session = JSON.parse(platform().storage.getItem("timeflow-session-v1") || "{}"); if (session.user?.email) return String(session.user.email).trim().toLowerCase(); if (session.userId) return session.userId; } catch (_error) { /* Profil als Ersatz */ }
    try { const profile = JSON.parse(platform().storage.getItem("timeflow-profile-v1") || "{}"); if (profile.email) return String(profile.email).trim().toLowerCase(); } catch (_error) { /* Lokales Profil */ }
    try { const cached = JSON.parse(platform().storage.getItem("timeflow-platform-session-cache-v1") || "{}"); if (cached.session?.user?.id) return cached.session.user.id; } catch (_error) { /* Lokales Profil */ }
    return "local-private-user";
  };
  const learningKey = () => `timeflow-private-schedule-learning-v1:${userKey()}`;
  const normalizeLearningText = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ß/gi, "ss").toLowerCase().replace(/ae/g, "a").replace(/oe/g, "o").replace(/ue/g, "u").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
  const normalizeLearning = (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return { markers: {}, labels: {}, times: {} };
    if (value.markers || value.labels || value.times) return { markers: value.markers || {}, labels: value.labels || {}, times: value.times || {} };
    // Migrate the old marker → title map without losing any learned values.
    return { markers: value, labels: {}, times: {} };
  };
  const readLearning = () => { try { return normalizeLearning(JSON.parse(platform().storage.getItem(learningKey()) || "{}")); } catch (_error) { return normalizeLearning(null); } };
  const writeLearning = (value) => platform().storage.setItem(learningKey(), JSON.stringify(value));
  const learningTimeKey = (start, end) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(start || "")) && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(end || "")) && start !== end ? `${start}-${end}` : "";
  const learnedShiftTitle = (learning, label, start, end) => {
    const key = normalizeLearningText(label);
    const byLabel = key && learning.labels[key];
    const byTime = learning.times[learningTimeKey(start, end)];
    return String(byLabel || byTime || "").trim();
  };
  const rememberCorrections = (value, entries) => {
    const learning = normalizeLearning(value);
    let learnedCount = 0;
    entries.forEach((entry) => {
      const title = String(entry.title || "").trim();
      const recognized = String(entry.recognizedTitle || "").trim();
      if (entry.sourceMarker) { learning.markers[String(entry.sourceMarker).toUpperCase()] = title; learnedCount += 1; }
      if (!title || (!entry.learningLabel && !entry.recognizedTimeKey) || /^(frei|urlaub|krank)$/i.test(title)) return;
      const label = normalizeLearningText(entry.learningLabel);
      const timeKey = learningTimeKey(entry.start, entry.end);
      const timeChanged = Boolean(timeKey && timeKey !== (entry.recognizedTimeKey || ""));
      const titleChanged = title !== recognized;
      if (!titleChanged && !timeChanged) return;
      if (titleChanged && label && label.length <= 96) { learning.labels[label] = title; learnedCount += 1; }
      if (timeKey) { learning.times[timeKey] = title; learnedCount += 1; }
    });
    return { learning, learnedCount };
  };
  const dateValue = (text) => { const match = String(text).match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/); if (!match) return ""; return `${match[3].length === 2 ? "20" + match[3] : match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`; };
  const fileExtension = (file) => String(file?.name || "").split(".").pop().toLowerCase();
  const importError = (message) => { const error = new Error(message); error.importMessage = message; return error; };
  const withTimeout = (promise, timeout, message) => new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(importError(message)), timeout);
    Promise.resolve(promise).then((value) => { window.clearTimeout(timer); resolve(value); }, (error) => { window.clearTimeout(timer); reject(error); });
  });
  const stage = (status, message, state = "info") => {
    status.textContent = message;
    status.dataset.state = state;
    console.info("[TimeFlow schedule import]", message);
  };
  const validateImportFile = (file) => {
    const type = String(file?.type || "").toLowerCase(); const extension = fileExtension(file);
    if (["heic", "heif"].includes(extension) || ["image/heic", "image/heif"].includes(type)) throw importError("HEIC/HEIF wird auf diesem Gerät noch nicht unterstützt. Bitte als JPG oder PNG exportieren.");
    const image = IMAGE_TYPES.has(type) || ["png", "jpg", "jpeg", "webp"].includes(extension);
    if (image) {
      if (Number(file?.size || 0) > MAX_IMAGE_BYTES) throw importError("Das Bild ist zu groß. Bitte einen Screenshot bis 25 MB auswählen.");
      return "image";
    }
    if (TEXT_EXTENSIONS.has(extension) || ["application/pdf", "text/csv", "text/plain", "application/json", "text/calendar"].includes(type)) return extension === "pdf" || type === "application/pdf" ? "pdf" : "text";
    throw importError("Dieses Dateiformat wird nicht unterstützt. Erlaubt sind PNG, JPG, WEBP, PDF, CSV, TXT, JSON und ICS.");
  };
  const validEntry = (entry) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(entry?.date || ""))) return false;
    if (/^(frei|urlaub|krank)$/i.test(String(entry.title || ""))) return true;
    const validTime = (value) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(value || ""));
    return validTime(entry.start) && validTime(entry.end) && entry.start !== entry.end;
  };
  const entryQuality = (entries) => entries.reduce((score, entry) => {
    if (!validEntry(entry)) return score;
    return score + (entry.start && entry.end ? 3 : 1);
  }, 0);
  const normalizeOcrTimes = (value) => String(value).replace(/[–—]/g, "-")
    .replace(/\b([0-2]?\d)\s*[:.]\s*([0-5]\d)\b/g, "$1:$2")
    .replace(/\b([0-2]?\d)\s+([0-5]\d)\b/g, "$1:$2");
  const shiftTitle = (value) => {
    const normalized = String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (/fruh(?:schicht)?/.test(normalized)) return "Frühschicht";
    if (/spat(?:schicht)?/.test(normalized)) return "Spätschicht";
    if (/nacht(?:schicht)?/.test(normalized)) return "Nachtschicht";
    return "Arbeit";
  };
  const parse = (text) => {
    const source = String(text).replace(/[–—]/g, "-").replace(/\r/g, "\n");
    const lines = source.split(/\n|;/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
    const range = source.match(/(\d{1,2})\s*\.?\s*(\d{2})\s*\.?\s*-\s*(\d{1,2})\s*\.?\s*(\d{2})\s*\.?/);
    const now = new Date();
    const startMonth = Number(range?.[2] || now.getMonth() + 1);
    const endMonth = Number(range?.[4] || startMonth);
    const startYear = now.getFullYear();
    let pendingDate = "";
    let pendingWeekday = "";
    const result = [];
    const learning = readLearning();
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
      const lineWithoutDates = line.replace(/\b20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}\b/g, " ").replace(/\b\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?\b/g, " ").replace(/\b\d{1,2}\.\d{1,2}\.(?:\d{2,4}\b)?/g, " ");
      const normalizedTimeLine = normalizeOcrTimes(lineWithoutDates).replace(/\b([0-2]?\d)([0-5]\d)\s*(?:-|bis)\s*([0-2]?\d)([0-5]\d)\b/gi, "$1:$2 - $3:$4").replace(/\b([0-2]?\d)\s*(?:Uhr|h)\b/gi, "$1:00");
      let timeOnlyLine = normalizedTimeLine.replace(/\b20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}\b/g, " ").replace(/\b\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}\b/g, " ");
      const rawTimeCount = [...timeOnlyLine.matchAll(/(?:^|\D)([0-2]?\d)[:.]([0-5]\d)(?=\D|$)/g)].length;
      if (rawTimeCount < 2) timeOnlyLine = timeOnlyLine.replace(/\b(\d{1,2})[.\/-](\d{1,2})[.]?(?=\s|$)/g, (full, _day, month) => Number(month) <= 12 ? " " : full);
      const times = [...timeOnlyLine.matchAll(/(?:^|\D)([0-2]?\d)[:.]([0-5]\d)(?=\D|$)/g)].map((match) => `${match[1].padStart(2, "0")}:${match[2]}`);
      if (pendingDate && times.length > 1) {
        const learningLabel = normalizeLearningText(normalizedTimeLine.replace(/\b\d{1,2}:\d{2}\b/g, " "));
        const learnedTitle = learnedShiftTitle(learning, learningLabel, times[0], times[1]);
        const title = learnedTitle || shiftTitle(line);
        result.push({ id: `import-${Date.now()}-${result.length}`, date: pendingDate, start: times[0], end: times[1], break: 30, title, recognizedTitle: title, learningLabel, recognizedTimeKey: learningTimeKey(times[0], times[1]), note: "Aus Dienstplan erkannt" });
        pendingDate = "";
      } else if (pendingDate && /^(?:[-–—]|A|F|frei|off|U|Urlaub|K|Krank)$/i.test(markerLine)) {
        const marker = markerLine.toUpperCase() || "FREI"; const defaultTitle = /^(?:U|URLAUB)$/i.test(marker) ? "Urlaub" : /^(?:K|KRANK)$/i.test(marker) ? "Krank" : "Frei";
        result.push({ id: `import-${Date.now()}-${result.length}`, date: pendingDate, start: "", end: "", break: 0, title: learning.markers[marker] || defaultTitle, recognizedTitle: learning.markers[marker] || defaultTitle, sourceMarker: marker, note: `Abwesenheit (${markerLine}) aus Dienstplan erkannt` });
        pendingDate = "";
      }
    });
    if (range && Number(range[1]) >= 1 && Number(range[1]) <= 31 && Number(range[3]) >= 1 && Number(range[3]) <= 31 && Number(range[2]) >= 1 && Number(range[2]) <= 12 && Number(range[4]) >= 1 && Number(range[4]) <= 12) {
      const firstDay = Number(range[1]);
      const firstMonth = Number(range[2]);
      const firstDate = new Date(Date.UTC(startYear, firstMonth - 1, firstDay));
      const indexed = new Map(result.map((entry) => [entry.date, entry]));
      for (let offset = 0; offset < 7; offset += 1) {
        const date = new Date(firstDate);
        date.setUTCDate(firstDate.getUTCDate() + offset);
        const isoDate = date.toISOString().slice(0, 10);
        if (!indexed.has(isoDate)) {
          indexed.set(isoDate, {
            id: `import-${Date.now()}-${indexed.size}`,
            date: isoDate,
            start: "",
            end: "",
            break: 0,
            title: "Frei",
            recognizedTitle: "Frei",
            sourceMarker: "__EMPTY__",
            note: "Kein Einsatz im erkannten Wochenzeitraum"
          });
        }
      }
      return [...indexed.values()].sort((left, right) => left.date.localeCompare(right.date));
    }
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
    const maxY = Math.max(...words.map((word) => Number(word.bbox.y1) || 0));
    const headerLimit = maxY * .24;
    const topWords = words.filter((word) => (word.bbox.y0 + word.bbox.y1) / 2 < headerLimit).sort((a, b) => ((a.bbox.y0 + a.bbox.y1) / 2) - ((b.bbox.y0 + b.bbox.y1) / 2));
    const headerBands = [];
    topWords.forEach((word) => {
      const y = (word.bbox.y0 + word.bbox.y1) / 2;
      let band = headerBands.find((candidate) => Math.abs(candidate.y - y) < Math.max(16, maxY * .018));
      if (!band) { band = { y, words: [] }; headerBands.push(band); }
      band.words.push(word); band.y = band.words.reduce((sum, item) => sum + (item.bbox.y0 + item.bbox.y1) / 2, 0) / band.words.length;
    });
    const dateHeaders = [];
    headerBands.forEach((band) => {
      const line = band.words.sort((a, b) => a.bbox.x0 - b.bbox.x0);
      for (let start = 0; start < line.length; start += 1) {
        for (let count = 1; count <= 3 && start + count <= line.length; count += 1) {
          const selected = line.slice(start, start + count);
          const value = selected.map((item) => item.text).join("").replace(/[^\d.]/g, "");
          const match = value.match(/^(\d{1,2})\.(\d{1,2})\.?$/);
          if (match) { dateHeaders.push({ day: Number(match[1]), month: Number(match[2]), x: (selected[0].bbox.x0 + selected[selected.length - 1].bbox.x1) / 2, y: band.y }); start += count - 1; break; }
        }
      }
    });
    const uniqueHeaders = dateHeaders.sort((a, b) => a.x - b.x).filter((header, index, list) => list.findIndex((item) => item.day === header.day && item.month === header.month) === index);
    const currentDate = new Date();
    const headerDates = uniqueHeaders.map((header) => {
      let year = currentDate.getFullYear();
      let value = new Date(Date.UTC(year, header.month - 1, header.day));
      if (value < new Date(Date.UTC(year, currentDate.getMonth(), currentDate.getDate() - 60))) { year += 1; value = new Date(Date.UTC(year, header.month - 1, header.day)); }
      return { ...header, date: value.toISOString().slice(0, 10) };
    });
    const hasWeekHeader = headerDates.length >= 4 && headerDates.slice(1).every((header, index) => {
      const previous = new Date(`${headerDates[index].date}T12:00:00Z`); previous.setUTCDate(previous.getUTCDate() + 1);
      return previous.toISOString().slice(5, 10) === header.date.slice(5, 10);
    });
    if (hasWeekHeader) {
      const cellLines = headerDates.map((header, index) => {
        const left = index ? (headerDates[index - 1].x + header.x) / 2 : header.x - (headerDates[index + 1].x - header.x) / 2;
        const right = index < headerDates.length - 1 ? (header.x + headerDates[index + 1].x) / 2 : header.x + (header.x - headerDates[index - 1].x) / 2;
        const cellWords = words.filter((word) => { const x = (word.bbox.x0 + word.bbox.x1) / 2; const y = (word.bbox.y0 + word.bbox.y1) / 2; return x >= left && x < right && y > header.y + Math.max(22, maxY * .025); }).sort((a, b) => ((a.bbox.y0 + a.bbox.y1) / 2) - ((b.bbox.y0 + b.bbox.y1) / 2));
        const lines = [];
        cellWords.forEach((word) => {
          const y = (word.bbox.y0 + word.bbox.y1) / 2;
          let line = lines.find((candidate) => Math.abs(candidate.y - y) < Math.max(13, maxY * .014));
          if (!line) { line = { y, words: [] }; lines.push(line); }
          line.words.push(word); line.y = line.words.reduce((sum, item) => sum + (item.bbox.y0 + item.bbox.y1) / 2, 0) / line.words.length;
        });
        lines.forEach((line) => { line.words.sort((a, b) => a.bbox.x0 - b.bbox.x0); line.text = line.words.map((word) => word.text).join(" ").trim(); });
        return { header, lines };
      });
      const colleagueEntries = [];
      const nonName = /\b(?:rezeption|hotel|restaurant|fruhschicht|spatschicht|nachtschicht|schicht|pause|dienstplan|kw|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b/i;
      const personName = (line) => {
        const cleaned = String(line || "").replace(/(?:[01]?\d|2[0-3])[:.][0-5]\d/g, " ").replace(/[|,:;–—-]/g, " ").replace(/\s+/g, " ").trim();
        const tokens = cleaned.split(" ").filter(Boolean);
        return tokens.length >= 2 && tokens.length <= 5 && !nonName.test(cleaned) && tokens.every((token) => /^[\p{L}][\p{L}'.-]*$/u.test(token)) ? cleaned : "";
      };
      cellLines.forEach(({ header, lines }) => {
        const timeRows = lines.map((line) => {
          const normalized = normalizeOcrTimes(line.text).replace(/\b([0-2]?\d)([0-5]\d)\b/g, "$1:$2");
          const times = [...normalized.matchAll(/(?:^|\D)([0-2]?\d)[:.]([0-5]\d)(?=\D|$)/g)].map((match) => `${match[1].padStart(2, "0")}:${match[2]}`);
          return times.length >= 2 ? { line, start: times[0], end: times[1] } : null;
        }).filter(Boolean);
        const consumedNames = new Set();
        timeRows.forEach(({ line, start, end }, rowIndex) => {
          const candidates = lines.map((candidate, candidateIndex) => ({ candidate, candidateIndex, name: personName(candidate.text), distance: line.y - candidate.y }))
            .filter((item) => item.name && !consumedNames.has(item.candidateIndex) && item.distance >= -12 && item.distance <= Math.max(100, maxY * .14))
            .sort((a, b) => Math.abs(a.distance) - Math.abs(b.distance));
          let name = candidates[0]?.name || "";
          if (candidates[0]) consumedNames.add(candidates[0].candidateIndex);
          if (!name) name = personName(line.text);
          if (!name) return;
          colleagueEntries.push({ id: `colleague-${Date.now()}-${colleagueEntries.length}`, date: header.date, start, end, break: 0, title: "Schicht", personName: name, isColleague: true, note: "Kollegenschicht aus Wochenplan erkannt" });
        });
      });
      if (colleagueEntries.length) return colleagueEntries;
    }
    const allText = words.map((word) => word.text).join(" ").replace(/[–—]/g, "-");
    const range = allText.match(/(\d{1,2})\s*\.?\s*(\d{2})\s*\.?\s*-\s*(\d{1,2})\s*\.?\s*(\d{2})\s*\.?/);
    const now = new Date(); const startMonth = Number(range?.[2] || now.getMonth() + 1); const endMonth = Number(range?.[4] || startMonth); const startDay = Number(range?.[1] || 1);
    const leftColumn = words.filter((word) => word.bbox.x0 < imageWidth * .24);
    const detectedDayRows = leftColumn.filter((word) => /^(Mo|Di|Mi|Do|Fr|Sa|So)[.,]?$/i.test(word.text)).map((weekday) => {
      const middle = (weekday.bbox.y0 + weekday.bbox.y1) / 2;
      const dayWord = leftColumn.filter((word) => /^\d{1,2}$/.test(word.text)).sort((a, b) => Math.abs(((a.bbox.y0 + a.bbox.y1) / 2) - middle) - Math.abs(((b.bbox.y0 + b.bbox.y1) / 2) - middle))[0];
      return dayWord && Math.abs(((dayWord.bbox.y0 + dayWord.bbox.y1) / 2) - middle) < Math.max(70, imageWidth * .055) ? { weekday: weekday.text, day: Number(dayWord.text), y: (middle + (dayWord.bbox.y0 + dayWord.bbox.y1) / 2) / 2 } : null;
    }).filter(Boolean).sort((a, b) => a.y - b.y);
    let dayRows = detectedDayRows.reduce((unique, row) => {
      const duplicate = unique.find((entry) => entry.day === row.day && Math.abs(entry.y - row.y) < Math.max(90, imageWidth * .07));
      if (!duplicate) unique.push(row);
      else duplicate.y = (duplicate.y + row.y) / 2;
      return unique;
    }, []).sort((a, b) => a.y - b.y);
    if (range) {
      const expectedDays = [];
      const rangeStart = new Date(Date.UTC(now.getFullYear(), startMonth - 1, startDay));
      for (let offset = 0; offset < 7; offset += 1) { const date = new Date(rangeStart); date.setUTCDate(rangeStart.getUTCDate() + offset); expectedDays.push({ day: date.getUTCDate(), month: date.getUTCMonth() + 1, index: offset }); }
      // Some OCR engines read the weekday label and date number as one token,
      // or miss the weekday altogether. Recover rows from the narrow date
      // column when the date range gives us a reliable seven-day reference.
      if (dayRows.length < 2) {
        const dateCandidates = leftColumn.filter((word) => /^\d{1,2}$/.test(word.text) && Number(word.text) >= 1 && Number(word.text) <= 31)
          .map((word) => ({ day: Number(word.text), y: (word.bbox.y0 + word.bbox.y1) / 2 }))
          .filter((row) => row.y > imageWidth * .15 && expectedDays.some((expected) => expected.day === row.day));
        const recovered = expectedDays.map((expected) => ({ expected, found: dateCandidates.filter((row) => row.day === expected.day).sort((a, b) => a.y - b.y)[0] }))
          .filter((item) => item.found).map((item) => ({ weekday: "", day: item.expected.day, y: item.found.y }));
        if (recovered.length >= 2) dayRows = recovered;
      }
      if (dayRows.length >= 2 && dayRows.length < 7) {
      const matched = expectedDays.map((expected) => ({ expected, found: dayRows.find((row) => row.day === expected.day) })).filter((item) => item.found);
      const first = matched[0]; const last = matched[matched.length - 1];
      const step = last.expected.index !== first.expected.index ? (last.found.y - first.found.y) / (last.expected.index - first.expected.index) : 100;
      const origin = matched.reduce((sum, item) => sum + item.found.y - item.expected.index * step, 0) / matched.length;
      dayRows = expectedDays.map((expected) => dayRows.find((row) => row.day === expected.day) || { weekday: "", day: expected.day, y: origin + expected.index * step, inferred: true }).sort((a, b) => a.y - b.y);
      }
    }
    return dayRows.map((row, index) => {
      const previousY = index ? (dayRows[index - 1].y + row.y) / 2 : row.y - (dayRows[index + 1]?.y - row.y || 100) / 2;
      const nextY = index < dayRows.length - 1 ? (row.y + dayRows[index + 1].y) / 2 : row.y + (row.y - dayRows[index - 1]?.y || 100) / 2;
      const band = normalizeOcrTimes(words.filter((word) => { const y = (word.bbox.y0 + word.bbox.y1) / 2; return y >= previousY && y < nextY && word.bbox.x0 >= imageWidth * .18; }).sort((a, b) => a.bbox.x0 - b.bbox.x0).map((word) => word.text).join(" ")).replace(/\b([0-2]?\d)([0-5]\d)\b/g, "$1:$2");
      const times = [...band.matchAll(/(?:^|\D)([0-2]?\d)[:.]([0-5]\d)(?=\D|$)/g)].map((match) => `${match[1].padStart(2, "0")}:${match[2]}`);
      const month = range && row.day < startDay ? endMonth : startMonth; const year = month < startMonth && endMonth < startMonth ? now.getFullYear() + 1 : now.getFullYear();
      const free = times.length < 2;
      const rawMarker = band.trim().replace(/^[\s|:;,-]+|[\s|:;,-]+$/g, "");
      const marker = rawMarker ? rawMarker.toUpperCase().slice(0, 30) : "__EMPTY__";
      const learningLabel = normalizeLearningText(band.replace(/\b(?:[01]?\d|2[0-3])[:.]\d{2}\b/g, " ").replace(/\b\d{1,2}\s+\d{2}\b/g, " "));
      const learning = readLearning();
      const learnedTitle = learning.markers[marker] || learnedShiftTitle(learning, learningLabel, times[0], times[1]);
      const absenceTitle = /^(U|URLAUB)$/i.test(marker) ? "Urlaub" : /^(K|KRANK)$/i.test(marker) ? "Krank" : /^(A|F|FREI|OFF|—|-|__EMPTY__)$/i.test(marker) ? "Frei" : "";
      const hasShiftClue = /(?:fru|sp.t|nacht|schicht|arbeit)/i.test(band) || /\b\d{1,2}\s*[:.]\s*\d{1,2}\b/.test(band);
      const title = free ? learnedTitle || absenceTitle || (hasShiftClue ? `Prüfen: ${rawMarker || "Schicht ohne vollständige Uhrzeit"}` : "Frei") : learnedTitle || shiftTitle(band);
      return { id: `import-${Date.now()}-${index}`, date: `${year}-${String(month).padStart(2, "0")}-${String(row.day).padStart(2, "0")}`, start: free ? "" : times[0], end: free ? "" : times[1], break: free ? 0 : 30, title, recognizedTitle: title, learningLabel, recognizedTimeKey: free ? "" : learningTimeKey(times[0], times[1]), sourceMarker: free ? marker : "", note: free ? `${learnedTitle ? "Persönlich gelernt" : "Aus Dienstplan erkannt"}: ${rawMarker || "leeres Feld"}` : "Aus Dienstplan-Screenshot erkannt" };
    });
  };
  window.TimeFlowPrivateScheduleParser = parse;
  window.TimeFlowPrivateScheduleLayoutParser = parseLayout;
  window.TimeFlowPrivateScheduleMerge = mergeEntries;
  window.TimeFlowPrivateScheduleImport = { validateImportFile, validEntry, saveEntries, normalizeLearning, rememberCorrections, learnedShiftTitle, learningTimeKey };
  async function pdfText(file, status) {
    stage(status, "PDF wird vorbereitet …");
    let pdfjs;
    try { pdfjs = await withTimeout(import(PDFJS_MODULE_URL), OCR_MODULE_TIMEOUT_MS, "PDF-Komponente konnte nicht geladen werden."); }
    catch (error) { throw error.importMessage ? error : importError("PDF-Komponente konnte nicht geladen werden."); }
    pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
    const pdf = await withTimeout(pdfjs.getDocument({ data: await file.arrayBuffer() }).promise, OCR_RECOGNITION_TIMEOUT_MS, "PDF konnte nicht gelesen werden.");
    let text = "";
    for (let number = 1; number <= pdf.numPages; number += 1) { const content = await (await pdf.getPage(number)).getTextContent(); text += `\n${content.items.map((item) => item.str).join(" ")}`; }
    return text;
  }
  async function imageText(file, status) {
    stage(status, "Datei akzeptiert. Bild wird vorbereitet …");
    stage(status, "Texterkennung wird geladen …");
    let module;
    try { module = await withTimeout(import(TESSERACT_MODULE_URL), OCR_MODULE_TIMEOUT_MS, "Texterkennung konnte nicht gestartet werden. OCR-Komponente konnte nicht geladen werden."); }
    catch (error) { throw error.importMessage ? error : importError("Texterkennung konnte nicht gestartet werden. OCR-Komponente konnte nicht geladen werden."); }
    stage(status, "Texterkennung geladen. Bild wird dekodiert …");
    const api = module.default || module;
    if (!api || typeof api.createWorker !== "function") throw importError("Texterkennung konnte nicht gestartet werden. OCR-Komponente ist ungültig.");
    let image;
    try {
      if (typeof createImageBitmap === "function") image = await withTimeout(createImageBitmap(file), IMAGE_DECODE_TIMEOUT_MS, "Das Bild konnte nicht rechtzeitig dekodiert werden.");
    } catch (_error) { /* Safari fallback below. */ }
    if (!image) {
      const objectUrl = URL.createObjectURL(file);
      try {
        image = await withTimeout(new Promise((resolve, reject) => {
          const element = new Image(); element.onload = () => resolve(element); element.onerror = () => reject(importError("Das Bild konnte nicht dekodiert werden. Bitte JPG oder PNG verwenden.")); element.src = objectUrl;
        }), IMAGE_DECODE_TIMEOUT_MS, "Das Bild konnte nicht rechtzeitig dekodiert werden.");
      } finally { URL.revokeObjectURL(objectUrl); }
    }
    stage(status, "Bild dekodiert. OCR-Worker wird erstellt …");
    const scale = Math.max(1, Math.min(2.5, 2400 / Math.max(image.width, image.height)));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(image, 0, 0, canvas.width, canvas.height); image.close?.();
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height); let brightness = 0;
    const histogram = new Uint32Array(256); const pixelCount = pixels.data.length / 4;
    for (let index = 0; index < pixels.data.length; index += 4) {
      const gray = Math.round(.299 * pixels.data[index] + .587 * pixels.data[index + 1] + .114 * pixels.data[index + 2]);
      brightness += gray; histogram[gray] += 1;
    }
    const invert = brightness / pixelCount < 128;
    if (invert) {
      const reversed = new Uint32Array(256);
      for (let level = 0; level < 256; level += 1) reversed[255 - level] = histogram[level];
      histogram.set(reversed);
    }
    // Otsu selects a threshold from this image instead of assuming every
    // screenshot has the same dark/light palette or text brightness.
    let totalWeighted = 0;
    for (let level = 0; level < 256; level += 1) totalWeighted += level * histogram[level];
    let backgroundWeight = 0; let backgroundSum = 0; let threshold = 128; let bestVariance = -1;
    for (let level = 0; level < 256; level += 1) {
      backgroundWeight += histogram[level]; if (!backgroundWeight) continue;
      const foregroundWeight = pixelCount - backgroundWeight; if (!foregroundWeight) break;
      backgroundSum += level * histogram[level];
      const difference = backgroundSum / backgroundWeight - (totalWeighted - backgroundSum) / foregroundWeight;
      const variance = backgroundWeight * foregroundWeight * difference * difference;
      if (variance > bestVariance) { bestVariance = variance; threshold = level; }
    }
    for (let index = 0; index < pixels.data.length; index += 4) {
      let gray = Math.round(.299 * pixels.data[index] + .587 * pixels.data[index + 1] + .114 * pixels.data[index + 2]);
      if (invert) gray = 255 - gray;
      gray = gray > threshold ? 255 : 0;
      pixels.data[index] = pixels.data[index + 1] = pixels.data[index + 2] = gray;
    }
    context.putImageData(pixels, 0, 0);
    let worker;
    try {
      worker = await withTimeout(api.createWorker("deu", 1, {
        workerPath: TESSERACT_WORKER_URL,
        corePath: TESSERACT_CORE_URL,
        langPath: TESSERACT_LANGUAGE_URL,
        logger: (message) => {
          if (message.status === "loading language traineddata") stage(status, "Deutsche Sprache wird geladen …");
          else if (message.status === "recognizing text") stage(status, `Dienstplan wird gelesen: ${Math.round((message.progress || 0) * 100)} %`);
        }
      }), OCR_WORKER_TIMEOUT_MS, "Texterkennung konnte nicht gestartet werden. OCR-Worker, Core oder deutsche Sprachdatei konnten nicht geladen werden.");
      stage(status, "OCR-Worker erstellt. Dienstplan wird gelesen …");
      await worker.setParameters({ tessedit_pageseg_mode: "11", preserve_interword_spaces: "1" });
      const result = await withTimeout(worker.recognize(canvas, {}, { blocks: true }), OCR_RECOGNITION_TIMEOUT_MS, "Die Texterkennung hat zu lange gedauert. Bitte einen kleineren oder klareren Screenshot verwenden.");
      stage(status, "Erkannte Daten werden geprüft …");
      const dayCanvas = document.createElement("canvas"); dayCanvas.width = Math.max(180, Math.round(canvas.width * .3)); dayCanvas.height = canvas.height;
      dayCanvas.getContext("2d").drawImage(canvas, 0, 0, dayCanvas.width, dayCanvas.height, 0, 0, dayCanvas.width, dayCanvas.height);
      await worker.setParameters({ tessedit_pageseg_mode: "6", preserve_interword_spaces: "1" });
      const dayResult = await withTimeout(worker.recognize(dayCanvas, {}, { blocks: true }), OCR_RECOGNITION_TIMEOUT_MS, "Die Datumsprüfung hat zu lange gedauert. Bitte einen kleineren oder klareren Screenshot verwenden.");
      const combinedData = { blocks: [...(result.data.blocks || []), ...(dayResult.data.blocks || [])] };
      stage(status, "Parser startet …");
      return { text: `${result.data.text}\n${dayResult.data.text}`, layoutEntries: parseLayout(combinedData, canvas.width) };
    } catch (error) {
      throw error.importMessage ? error : importError("Die Texterkennung ist fehlgeschlagen. Bitte Bildformat, Lesbarkeit und Verbindung prüfen.");
    } finally {
      if (worker) {
        try { await withTimeout(worker.terminate(), 5000, ""); }
        catch (_error) { console.warn("[TimeFlow schedule import] OCR-Worker konnte nicht rechtzeitig beendet werden."); }
      }
    }
  }
  function install() {
    const tabs = document.querySelector("#schedulePage .schedule-tabs");
    if (!tabs || document.querySelector(".private-import-panel")) return;
    const panel = document.createElement("section");
    panel.className = "private-import-panel";
    panel.innerHTML = `<header><div><small>PRIVAT / EINZELNUTZUNG</small><h2>Mein eigener Dienstplan</h2><p>Lade einen oder mehrere Dienstpläne hoch oder trage deine Einsätze vollständig manuell ein. Kollegenschichten werden separat angezeigt.</p></div><div class="private-import-actions"><button type="button" data-pick-plan><i class="fa-solid fa-file-arrow-up"></i> Dienstplan hochladen</button><button type="button" data-manual-plan><i class="fa-solid fa-pen-to-square"></i> Manuell eintragen</button><button type="button" data-absence-plan><i class="fa-solid fa-calendar-day"></i> Abwesenheit eintragen</button></div></header><input hidden type="file" data-plan-file multiple accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp,.pdf,.csv,.txt,.json,.ics,application/pdf,text/csv,text/plain,application/json,text/calendar"><p class="private-import-formats"><i class="fa-solid fa-file-circle-check"></i> PNG, JPG, WEBP, PDF, JSON, CSV, TXT und ICS · mehrere Dateien gleichzeitig möglich</p><p class="private-import-note"><i class="fa-solid fa-shield-halved"></i> HEIC/HEIF bitte vor dem Import als JPG oder PNG exportieren. Kollegennamen und ihre Schichten bleiben nur auf diesem Gerät.</p><p class="private-learning-note" data-learning-note></p>`;
    tabs.insertAdjacentElement("afterend", panel);
    document.body.insertAdjacentHTML("beforeend", `<dialog class="private-import-dialog" id="privateImportDialog"><header><div><small>IMPORT-VORSCHAU</small><h2>Erkannte Einsätze prüfen und korrigieren</h2><p data-import-status>Die Datei wird analysiert.</p></div><button type="button" data-close-import aria-label="Schließen"><i class="fa-solid fa-xmark"></i></button></header><form><div class="private-import-toolbar"><span>Jeder Wert kann vor der Übernahme geändert werden.</span><div><button type="button" data-add-import-row><i class="fa-solid fa-plus"></i> Fehlenden Einsatz ergänzen</button><button type="button" data-add-colleague-row><i class="fa-solid fa-user-plus"></i> Kollegenschicht ergänzen</button></div></div><div class="private-import-preview" data-import-preview></div><label class="private-import-consent"><input type="checkbox" data-import-consent><span>Ich habe die Angaben geprüft und stimme der Speicherung meines Plans und der lokalen Kollegenübersicht zu.</span></label><footer><button type="button" data-close-import>Abbrechen</button><button type="submit" data-commit-import disabled><i class="fa-solid fa-check"></i> Verbindlich übernehmen</button></footer></form></dialog><dialog class="private-absence-dialog" id="privateAbsenceDialog"><header><div><small>TAG KENNZEICHNEN</small><h2>Frei oder Abwesenheit eintragen</h2><p>An diesem Tag wird keine Sollzeit berechnet.</p></div><button type="button" data-close-absence aria-label="Schließen"><i class="fa-solid fa-xmark"></i></button></header><form><label>Datum<input name="date" type="date" required></label><label>Art<select name="title"><option value="Frei">Frei</option><option value="Urlaub">Urlaub</option><option value="Krank">Krank</option></select></label><footer><button type="button" data-close-absence>Abbrechen</button><button type="submit"><i class="fa-solid fa-check"></i> Tag speichern</button></footer></form></dialog>`);
    const dialog = document.getElementById("privateImportDialog"); const absenceDialog = document.getElementById("privateAbsenceDialog"); const absenceForm = absenceDialog.querySelector("form"); const input = panel.querySelector("[data-plan-file]"); const status = dialog.querySelector("[data-import-status]"); const preview = dialog.querySelector("[data-import-preview]"); const learningNote = panel.querySelector("[data-learning-note]"); const consent = dialog.querySelector("[data-import-consent]"); const commit = dialog.querySelector("[data-commit-import]"); let entries = []; let visibleWeekStart = ""; let visibleMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12);
    const setStatus = (message, state = "info") => { status.textContent = message; status.dataset.state = state; };
    const renderLearning = () => {
      const learned = readLearning();
      const markers = Object.keys(learned.markers).filter((marker) => marker !== "__EMPTY__").length;
      const labels = Object.keys(learned.labels).length;
      const times = Object.keys(learned.times).length;
      const details = [markers && `${markers} Kürzel`, labels && `${labels} Bezeichnungen`, times && `${times} Zeitmuster`].filter(Boolean).join(" · ");
      learningNote.innerHTML = details ? `<i class="fa-solid fa-brain"></i> Persönlich gelernt: ${escapeHtml(details)}. Bestätigte Korrekturen werden bei neuen Dienstplänen berücksichtigt.` : '<i class="fa-solid fa-brain"></i> TimeFlow merkt sich bestätigte Korrekturen an Kürzeln, Schichtnamen und wiederkehrenden Uhrzeiten.';
    };
    const renderScheduleViews = (shifts) => {
      const dayPanel = document.querySelector('#schedulePage [data-panel="day"]'); const weekPanel = document.querySelector('#schedulePage [data-panel="week"]'); const periodPanel = document.querySelector('#schedulePage [data-panel="period"]');
      if (!dayPanel || !weekPanel || !periodPanel) return;
      const today = new Date().toLocaleDateString("sv-SE"); const selected = shifts.find((entry) => entry.date === today) || shifts.find((entry) => entry.date >= today) || shifts[0];
      const colleagueFallback = readColleagues().find((entry) => entry.date >= today) || readColleagues()[0];
      const selectedDate = selected ? new Date(`${selected.date}T12:00:00`) : colleagueFallback ? new Date(`${colleagueFallback.date}T12:00:00`) : new Date();
      dayPanel.innerHTML = `<div class="date-switch"><span>${selectedDate.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</span></div>${selected ? `<article class="my-shift"><p><i class="fa-solid fa-briefcase"></i> Eigener Dienstplan</p><div><i class="fa-regular fa-clock"></i><span><strong>${/^(frei|urlaub|krank)$/i.test(selected.title) ? escapeHtml(selected.title) : `${escapeHtml(selected.start)} – ${escapeHtml(selected.end)}`}</strong><small>${escapeHtml(selected.title || "Arbeit")}</small></span><em>Importiert</em></div><footer>${/^(frei|urlaub|krank)$/i.test(selected.title) ? "Kein Einsatz geplant" : `${duration(minutes(selected))} Arbeitszeit · ${Number(selected.break || 0)} Min. Pause`}</footer></article>` : '<p class="private-import-empty">Noch kein eigener Dienstplan übernommen.</p>'}`;
      const monday = visibleWeekStart ? new Date(`${visibleWeekStart}T12:00:00`) : new Date(selectedDate); const weekday = (monday.getDay() + 6) % 7; monday.setDate(monday.getDate() - weekday); visibleWeekStart = monday.toLocaleDateString("sv-SE"); const weekDates = Array.from({ length: 7 }, (_, index) => { const value = new Date(monday); value.setDate(monday.getDate() + index); return value; });
      const weekEntries = weekDates.map((date) => shifts.find((entry) => entry.date === date.toLocaleDateString("sv-SE")) || { date: date.toLocaleDateString("sv-SE"), title: "Frei", start: "", end: "", break: 0 }); const total = weekEntries.reduce((sum, entry) => sum + minutes(entry), 0);
      const colleagueShifts = readColleagues();
      const colleaguesThisWeek = colleagueShifts.map((entry, index) => ({ ...entry, savedIndex: index })).filter((entry) => entry.date >= weekDates[0].toLocaleDateString("sv-SE") && entry.date <= weekDates[6].toLocaleDateString("sv-SE"));
      const colleagueDays = weekDates.map((date) => {
        const key = date.toLocaleDateString("sv-SE"); const shiftsForDay = colleaguesThisWeek.filter((entry) => entry.date === key);
        return `<div class="colleague-day${shiftsForDay.length ? " has-shifts" : ""}"><b>${date.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" })}</b>${shiftsForDay.length ? shiftsForDay.map((entry) => `<article><span><strong>${escapeHtml(entry.personName)}</strong><small>${escapeHtml(entry.title || "Schicht")}</small></span><time>${escapeHtml(entry.start)} – ${escapeHtml(entry.end)}</time><button type="button" data-remove-colleague="${entry.savedIndex}" aria-label="Kollegenschicht entfernen"><i class="fa-solid fa-xmark"></i></button></article>`).join("") : '<span class="colleague-day-empty">–</span>'}</div>`;
      }).join("");
      weekPanel.innerHTML = `<div class="date-switch"><button type="button" data-private-week="previous" aria-label="Vorherige Woche"><i class="fa-solid fa-chevron-left"></i></button><span>KW ${isoWeek(weekDates[0])} • ${weekDates[0].toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })} – ${weekDates[6].toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}</span><button type="button" data-private-week="next" aria-label="Nächste Woche"><i class="fa-solid fa-chevron-right"></i></button></div><div class="week-summary"><span>Arbeitszeit<strong>${duration(total)}</strong></span><span>Einsätze<strong>${weekEntries.filter((entry) => minutes(entry) > 0).length}</strong></span><span>Pausen<strong>${weekEntries.reduce((sum, entry) => sum + Number(entry.break || 0), 0)} Min.</strong></span><span>Freie Tage<strong>${weekEntries.filter((entry) => !minutes(entry)).length}</strong></span></div><div class="week-list">${weekEntries.map((entry) => { const date = new Date(`${entry.date}T12:00:00`); const free = !minutes(entry); return `<div class="week-row${free ? " free" : ""}"><b>${date.toLocaleDateString("de-DE", { weekday: "short" })}<small>${date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}</small></b><i></i><span>${escapeHtml(entry.title || "Arbeit")}</span><em>${free ? "" : `${Number(entry.break || 0)} Min. Pause`}</em><strong>${free ? "" : `${escapeHtml(entry.start)} – ${escapeHtml(entry.end)}`}</strong></div>`; }).join("")}</div><section class="colleague-week"><header><strong>Kolleginnen und Kollegen</strong><small>Nur auf diesem Gerät gespeichert</small></header><div class="colleague-week-grid">${colleagueDays}</div>${colleaguesThisWeek.length ? '<button type="button" class="colleague-clear" data-clear-colleagues>Kollegenschichten dieser Woche löschen</button>' : '<p class="colleague-empty">Erkannte oder manuell ergänzte Kollegenschichten erscheinen hier. Prüfe die Namen und Zeiten vor dem Speichern.</p>'}</section>`;
      periodPanel.innerHTML = shifts.length ? shifts.map((entry) => { const date = new Date(`${entry.date}T12:00:00`); const free = !minutes(entry); return `<article class="period-day"><h2>${date.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}<span>${free ? "Frei" : duration(minutes(entry))}</span></h2><p${free ? "" : ' class="active"'}>${free ? "○" : "●"} ${free ? "Kein Einsatz" : `${escapeHtml(entry.start)} – ${escapeHtml(entry.end)}`} <span>Eigener Dienstplan</span><b>${escapeHtml(entry.title || "Arbeit")}</b></p></article>`; }).join("") : '<p class="private-import-empty">Noch kein eigener Dienstplan übernommen.</p>';
      const monthPanel = document.querySelector('#schedulePage [data-panel="month"]');
      if (monthPanel) {
        const monthStart = new Date(visibleMonthStart.getFullYear(), visibleMonthStart.getMonth(), 1, 12);
        const monthKey = monthStart.toLocaleDateString("sv-SE").slice(0, 7);
        const gridStart = new Date(monthStart); gridStart.setDate(monthStart.getDate() - ((monthStart.getDay() + 6) % 7));
        const monthEntries = shifts.filter((entry) => String(entry.date || "").startsWith(monthKey));
        const days = Array.from({ length: 42 }, (_, index) => {
          const date = new Date(gridStart); date.setDate(gridStart.getDate() + index);
          const key = date.toLocaleDateString("sv-SE");
          const entry = monthEntries.find((item) => item.date === key);
          const title = String(entry?.title || "").toLocaleLowerCase("de-DE");
          const type = !entry ? "" : /urlaub/.test(title) ? "blue" : /krank/.test(title) ? "red" : /frei/.test(title) ? "free" : "green";
          return `<span class="${date.getMonth() === monthStart.getMonth() ? type : "muted"}" aria-label="${date.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}${entry ? ` · ${escapeHtml(entry.title || "Arbeit")}${minutes(entry) ? ` · ${escapeHtml(entry.start)}–${escapeHtml(entry.end)}` : ""}` : ""}">${date.getDate()}</span>`;
        }).join("");
        const total = monthEntries.reduce((sum, entry) => sum + minutes(entry), 0);
        const workDays = monthEntries.filter((entry) => minutes(entry) > 0).length;
        const vacationDays = monthEntries.filter((entry) => /urlaub/i.test(entry.title || "")).length;
        const sickDays = monthEntries.filter((entry) => /krank/i.test(entry.title || "")).length;
        monthPanel.innerHTML = `<div class="date-switch"><button type="button" data-private-month="previous" aria-label="Vorheriger Monat"><i class="fa-solid fa-chevron-left"></i></button><span>${monthStart.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}</span><button type="button" data-private-month="next" aria-label="Nächster Monat"><i class="fa-solid fa-chevron-right"></i></button></div><div class="calendar-weekdays"><span>Mo.</span><span>Di.</span><span>Mi.</span><span>Do.</span><span>Fr.</span><span>Sa.</span><span>So.</span></div><div class="month-calendar">${days}</div><article class="month-overview"><h2>Monatsübersicht</h2><div><span><b>${duration(total)}</b>Arbeitszeit</span><span><b>${workDays}</b>Arbeitstage</span><span><b>${vacationDays}</b>Urlaubstage</span><span><b>${sickDays}</b>Krankheitstage</span></div></article>`;
      }
    };
    const renderSaved = () => {
      const shifts = read().sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
      renderScheduleViews(shifts);
      const today = new Date().toLocaleDateString("sv-SE"); const next = shifts.find((entry) => entry.date >= today && !/^(frei|urlaub|krank)$/i.test(entry.title)); const card = document.querySelectorAll(".shift-card")[1];
      if (next && card && privateMode()) { card.querySelector("p").textContent = new Date(`${next.date}T12:00:00`).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" }); card.querySelector("strong").textContent = `${next.start} – ${next.end}`; card.querySelector("span").textContent = next.title || "Arbeit"; }
    };
    document.querySelector('#schedulePage [data-panel="month"]')?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-private-month]"); if (!button) return;
      visibleMonthStart.setMonth(visibleMonthStart.getMonth() + (button.dataset.privateMonth === "next" ? 1 : -1));
      renderSaved();
    });
    document.querySelector('#schedulePage [data-panel="week"]')?.addEventListener("click", (event) => {
      const removeButton = event.target.closest("[data-remove-colleague]");
      if (removeButton) { const saved = readColleagues(); saved.splice(Number(removeButton.dataset.removeColleague), 1); platform().storage.setItem(colleagueKey(), JSON.stringify(saved)); renderSaved(); return; }
      const clearButton = event.target.closest("[data-clear-colleagues]");
      if (!clearButton) return;
      const start = new Date(`${visibleWeekStart}T12:00:00`); const end = new Date(start); end.setDate(start.getDate() + 6);
      const from = start.toLocaleDateString("sv-SE"); const to = end.toLocaleDateString("sv-SE");
      platform().storage.setItem(colleagueKey(), JSON.stringify(readColleagues().filter((entry) => entry.date < from || entry.date > to)));
      renderSaved();
    });
    const render = () => { preview.innerHTML = entries.length ? entries.map((entry, index) => { const freeDay = !entry.isColleague && /^frei$/i.test(String(entry.title || "")); return `<article><label class="import-roster-type"><input type="checkbox" data-i="${index}" data-field="myShift"${entry.isColleague ? "" : " checked"}><span>Das ist mein Dienst</span></label><label class="import-person">Name<input type="text" maxlength="80" data-i="${index}" data-field="personName" value="${escapeHtml(entry.personName || "")}" placeholder="${entry.isColleague ? "Name erforderlich" : "Optional"}"></label><label class="import-title">Schicht<input type="text" maxlength="40" data-i="${index}" data-field="title" value="${escapeHtml(entry.title || "Arbeit")}"${freeDay ? " readonly" : ""}></label><label class="import-date">Datum<input type="date" data-i="${index}" data-field="date" value="${escapeHtml(entry.date)}"></label>${freeDay ? '<label class="import-free-toggle"><input type="checkbox" data-i="${index}" data-field="freeDay" checked><span>Als freien Tag markieren</span></label><p class="import-free-note">Für einen freien Tag sind keine Uhrzeiten nötig.</p>' : `<label class="import-date"><span>Beginn</span><input type="time" data-i="${index}" data-field="start" value="${escapeHtml(entry.start)}"></label><label class="import-date"><span>Ende</span><input type="time" data-i="${index}" data-field="end" value="${escapeHtml(entry.end)}"></label>${!entry.isColleague ? `<label class="import-break"><span>Pause</span><select data-i="${index}" data-field="break"><option value="0"${Number(entry.break) === 0 ? " selected" : ""}>Keine</option><option value="15"${Number(entry.break) === 15 ? " selected" : ""}>15 Min.</option><option value="30"${Number(entry.break) === 30 ? " selected" : ""}>30 Min.</option><option value="45"${Number(entry.break) === 45 ? " selected" : ""}>45 Min.</option><option value="60"${Number(entry.break) === 60 ? " selected" : ""}>60 Min.</option></select></label>` : ""}`}${!entry.isColleague && !freeDay ? `<label class="import-free-toggle"><input type="checkbox" data-i="${index}" data-field="freeDay"><span>Als freien Tag markieren</span></label>` : ""}<button type="button" data-remove="${index}" aria-label="Entfernen"><i class="fa-regular fa-trash-can"></i></button></article>`; }).join("") : '<p class="private-import-empty">Keine vollständigen Schichten erkannt. Ergänze einen Einsatz oder wähle eine besser lesbare Datei.</p>'; consent.checked = false; commit.disabled = true; };
    panel.querySelector("[data-pick-plan]").addEventListener("click", () => input.click());
    panel.querySelector("[data-manual-plan]").addEventListener("click", () => {
      entries = [{ id: `manual-${Date.now()}`, date: new Date().toLocaleDateString("sv-SE"), start: "08:00", end: "16:30", break: 30, title: "Arbeit", note: "Manuell eingetragen" }];
      status.textContent = "Trage deinen Einsatz ein und ergänze bei Bedarf weitere Tage.";
      render();
      platform().dialog.open(dialog);
    });
    panel.querySelector("[data-absence-plan]").addEventListener("click", () => { absenceForm.elements.date.value = new Date().toLocaleDateString("sv-SE"); platform().dialog.open(absenceDialog); });
    absenceDialog.querySelectorAll("[data-close-absence]").forEach((button) => button.addEventListener("click", () => platform().dialog.close(absenceDialog)));
    absenceForm.addEventListener("submit", (event) => { event.preventDefault(); const entry = { id: `absence-${Date.now()}`, date: absenceForm.elements.date.value, start: "", end: "", break: 0, title: absenceForm.elements.title.value, note: "Persönlich eingetragen" }; saveEntries(platform().storage, read(), [entry]); visibleWeekStart = ""; platform().dialog.close(absenceDialog); renderSaved(); document.dispatchEvent(new CustomEvent("timeflow:private-schedule-updated")); });
    document.querySelector('#schedulePage [data-panel="week"]').addEventListener("click", (event) => { const button = event.target.closest("[data-private-week]"); if (!button) return; const date = new Date(`${visibleWeekStart}T12:00:00`); date.setDate(date.getDate() + (button.dataset.privateWeek === "next" ? 7 : -7)); visibleWeekStart = date.toLocaleDateString("sv-SE"); renderSaved(); });
    async function readPlanFile(file, fileIndex) {
      const kind = validateImportFile(file);
      setStatus(`${file.name} wird geprüft …`);
      let imageResult = null;
      if (kind === "image") {
        try { imageResult = await imageText(file, status); }
        catch (error) { throw error.importMessage ? error : importError("Die Texterkennung konnte nicht gestartet werden. Bitte Verbindung, Bildformat und Lesbarkeit prüfen."); }
      }
      const text = imageResult?.text ?? (kind === "pdf" ? await pdfText(file, status) : await file.text());
      let found = imageResult?.layoutEntries?.length ? imageResult.layoutEntries : [];
      if (/\.json$/i.test(file.name) || file.type === "application/json") {
        try {
          const json = JSON.parse(text);
          const list = Array.isArray(json) ? json : json.shifts || json.schedule || json.entries;
          if (Array.isArray(list)) found = list.map((item, index) => {
            const start = item.start || item.begin || ""; const end = item.end || item.finish || ""; const title = item.title || item.shift || item.type || "Arbeit";
            return { id: `import-${Date.now()}-${fileIndex}-${index}`, date: item.date || item.day, start, end, break: Number(item.break ?? item.pause ?? 30), title, recognizedTitle: title, recognizedTimeKey: learningTimeKey(start, end), note: `Aus ${file.name} importiert` };
          }).filter((item) => item.date);
        } catch (_error) { found = []; }
      }
      const textEntries = parse(text);
      // OCR layout information is useful for grid-like rosters, but it must
      // never hide a more complete text result. This also protects against a
      // partially read weekday column being mistaken for several free days.
      if (!found.some((entry) => entry.isColleague) && entryQuality(textEntries) > entryQuality(found)) found = textEntries;
      const valid = found.filter(validEntry).map((entry, index) => ({ ...entry, id: `import-${Date.now()}-${fileIndex}-${index}`, sourceFile: file.name }));
      if (!valid.length) throw importError("Keine lesbaren Schichten erkannt. Es wurde nichts gespeichert. Bitte Bild und Vorschau prüfen.");
      stage(status, `${valid.length} Einträge erkannt. Vorschau wird angezeigt.`, "success");
      return valid;
    }
    input.addEventListener("change", async () => {
      const files = [...(input.files || [])]; if (!files.length) return; entries = []; render(); platform().dialog.open(dialog);
      const failed = [];
      for (let index = 0; index < files.length; index += 1) {
        try { entries = mergeEntries(entries, await readPlanFile(files[index], index)); }
        catch (error) { failed.push(`${files[index].name}: ${error.importMessage || "Datei konnte nicht gelesen werden."}`); }
      }
      setStatus(entries.length
        ? `${entries.length} Einträge aus ${files.length} Datei${files.length === 1 ? "" : "en"} erkannt. Bitte alle Angaben kontrollieren.${failed.length ? ` Nicht gelesen: ${failed.join(", ")}.` : ""}`
        : failed.length ? `Es wurden keine Daten übernommen. ${failed.join(" ")}` : "Keine vollständigen Einsätze erkannt. Die Angaben können unten manuell ergänzt werden.", entries.length ? "success" : "error");
      render(); input.value = "";
    });
    preview.addEventListener("input", (event) => { const entry = entries[Number(event.target.dataset.i)]; if (entry && event.target.dataset.field) entry[event.target.dataset.field] = event.target.value; consent.checked = false; commit.disabled = true; });
    preview.addEventListener("change", (event) => { const entry = entries[Number(event.target.dataset.i)]; if (entry && event.target.dataset.field === "freeDay") { if (event.target.checked) Object.assign(entry, { title: "Frei", start: "", end: "", break: 0 }); else Object.assign(entry, { title: "Arbeit", start: "08:00", end: "16:30", break: 30 }); render(); } else if (entry && event.target.dataset.field === "myShift") { entry.isColleague = !event.target.checked; render(); } else if (entry && event.target.dataset.field) entry[event.target.dataset.field] = event.target.dataset.field === "break" ? Number(event.target.value) : event.target.value; consent.checked = false; commit.disabled = true; });
    preview.addEventListener("click", (event) => { const button = event.target.closest("[data-remove]"); if (button) { entries.splice(Number(button.dataset.remove), 1); render(); } });
    dialog.querySelector("[data-add-import-row]").addEventListener("click", () => { entries.push({ id: `import-${Date.now()}-${entries.length}`, date: new Date().toLocaleDateString("sv-SE"), start: "08:00", end: "16:30", break: 30, title: "Arbeit", note: "In Import-Vorschau ergänzt" }); render(); });
    dialog.querySelector("[data-add-colleague-row]").addEventListener("click", () => { entries.push({ id: `colleague-${Date.now()}-${entries.length}`, date: new Date().toLocaleDateString("sv-SE"), start: "08:00", end: "16:00", break: 0, title: "Schicht", personName: "", isColleague: true, note: "Kollegenschicht manuell ergänzt" }); render(); });
    consent.addEventListener("change", () => { commit.disabled = !consent.checked || !entries.length || entries.some((entry) => !entry.date || (entry.isColleague ? (!entry.personName?.trim() || !entry.start || !entry.end) : (!/^(frei|urlaub|krank)$/i.test(entry.title) && (!entry.start || !entry.end)))); });
    dialog.querySelectorAll("[data-close-import]").forEach((button) => button.addEventListener("click", () => platform().dialog.close(dialog)));
    dialog.querySelector("form").addEventListener("submit", (event) => { event.preventDefault(); if (commit.disabled) return; const personalEntries = entries.filter((entry) => !entry.isColleague); const colleagueEntries = entries.filter((entry) => entry.isColleague && entry.personName?.trim()); const { learning, learnedCount } = rememberCorrections(readLearning(), personalEntries); writeLearning(learning); const saved = read(); const before = new Map(saved.map((entry) => [entry.date, entry])); const changes = personalEntries.map((entry) => { const previous = before.get(entry.date); if (previous && shiftSummary(previous) === shiftSummary(entry)) return null; const date = new Date(`${entry.date}T12:00:00`).toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }); return previous ? `${date}: ${shiftSummary(previous)} → ${shiftSummary(entry)}` : `${date}: ${shiftSummary(entry)} eingetragen`; }).filter(Boolean).slice(0, 40); const updated = personalEntries.filter((entry) => saved.some((item) => item.date === entry.date)).length; saveEntries(platform().storage, saved, personalEntries); saveColleagues(colleagueEntries); const at = new Date().toISOString(); platform().storage.setItem("timeflow-private-last-import-v1", JSON.stringify({ at, added: personalEntries.length - updated, updated, changes })); visibleWeekStart = ""; platform().dialog.close(dialog); renderLearning(); renderSaved(); document.dispatchEvent(new CustomEvent("timeflow:private-schedule-updated")); const toast = document.getElementById("toast"); toast.textContent = `${personalEntries.length - updated} persönliche Tage ergänzt${updated ? `, ${updated} aktualisiert` : ""}.${colleagueEntries.length ? ` ${colleagueEntries.length} Kollegenschichten gespeichert.` : ""}${learnedCount ? " Korrekturen für Kürzel und wiederkehrende Schichten gemerkt." : ""}`; toast.classList.add("is-visible"); });
    const updateMode = () => { panel.hidden = !privateMode(); if (privateMode()) { const weekTab = tabs.querySelector('[data-view="week"]'); if (weekTab && weekTab.getAttribute("aria-selected") !== "true") weekTab.click(); renderLearning(); renderSaved(); } }; updateMode(); new MutationObserver(updateMode).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    document.addEventListener("timeflow:sync-restored", () => { visibleWeekStart = ""; renderLearning(); renderSaved(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();
}());

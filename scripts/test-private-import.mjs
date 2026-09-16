import { readFile } from "node:fs/promises";
import vm from "node:vm";

const code = await readFile(new URL("../js/private-schedule-import.js", import.meta.url), "utf8");
for (const marker of ["multiple accept=", "application/pdf", "application/json", "async function readPlanFile", "json.schedule", "mehrere Dateien gleichzeitig möglich", "data-private-week=\"previous\"", "data-private-week=\"next\"", "data-absence-plan", "privateAbsenceDialog", "An diesem Tag wird keine Sollzeit berechnet."]) {
  if (!code.includes(marker)) throw new Error(`Mehrfach- oder Dateiformatimport fehlt: ${marker}`);
}
const memory = new Map();
const storage = { getItem: (key) => memory.has(key) ? memory.get(key) : null, setItem: (key, value) => memory.set(key, String(value)) };
const context = {
  window: { TimeFlowPlatform: { storage }, location: { href: "https://example.test/TimeFlow-PWA/index.html" }, setTimeout, clearTimeout },
  document: { readyState: "loading", currentScript: { src: "https://example.test/TimeFlow-PWA/js/private-schedule-import.js" }, addEventListener() {} },
  console, Date, JSON, String, Number, Array, Math, URL, setTimeout, clearTimeout
};
vm.runInNewContext(code, context);
const parse = context.window.TimeFlowPrivateScheduleParser;
const merge = context.window.TimeFlowPrivateScheduleMerge;
const importApi = context.window.TimeFlowPrivateScheduleImport;
if (!importApi || importApi.validateImportFile({ name: "plan.PNG", type: "image/png", size: 4096 }) !== "image" || importApi.validateImportFile({ name: "plan.jpg", type: "", size: 4096 }) !== "image") throw new Error("PNG/JPG-Dateien werden nicht als aktive Bildimporte akzeptiert.");
if (code.includes(".heic,.heif")) throw new Error("Die Dateiauswahl darf HEIC/HEIF nicht als unterstütztes Format anbieten.");
for (const stage of ["Texterkennung wird geladen …", "OCR-Worker wird erstellt …", "Erkannte Daten werden geprüft …", "OCR_MODULE_TIMEOUT_MS"]) {
  if (!code.includes(stage)) throw new Error(`Bildimport meldet die OCR-Stufe nicht sichtbar: ${stage}`);
}
if (!importApi.validEntry({ date: "2026-09-01", start: "08:00", end: "16:00", title: "Arbeit" }) || importApi.validEntry({ date: "", start: "08:00", end: "16:00", title: "Arbeit" }) || importApi.validEntry({ date: "2026-09-01", start: "29:99", end: "16:00", title: "Arbeit" })) throw new Error("Importvorschau validiert vollständige Schichten nicht korrekt.");
for (const file of [{ name: "plan.heic", type: "image/heic", size: 1 }, { name: "plan.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 1 }, { name: "large.png", type: "image/png", size: 26 * 1024 * 1024 }]) {
  try { importApi.validateImportFile(file); throw new Error(`${file.name} wurde nicht abgelehnt.`); } catch (error) { if (!error.importMessage) throw error; }
}
const savedByActiveImportPath = importApi.saveEntries(storage, [], [{ date: "2026-09-03", start: "08:00", end: "16:00", break: 30, title: "Arbeit" }]);
if (savedByActiveImportPath.length !== 1 || JSON.parse(storage.getItem("timeflow-private-schedule-v1") || "[]")[0]?.date !== "2026-09-03") throw new Error("Der aktive Importpfad speichert bestätigte Daten nicht im privaten Dienstplanmodell.");
const mergedPlans = merge([{ date: "2026-09-01", start: "08:00", end: "16:00" }], [{ date: "2026-09-01", start: "09:00", end: "17:00" }, { date: "2026-09-02", start: "08:00", end: "16:00" }]);
if (mergedPlans.length !== 2 || mergedPlans[0].start !== "09:00") throw new Error("Mehrfach-Import: neue Pläne werden nicht ergänzt oder vorhandene Tage nicht aktualisiert.");
const weekly = parse("Woche 31.08 - 06.09\nMo 31\n-\nDi 1\nHotel Rezeption\n07:30 - 15:00\nMi 2\n07.30 – 15.00\nDo 3\n0730 bis 1500\nFr 4\n7 Uhr - 15 Uhr");
if (weekly.length !== 5) throw new Error(`Wochenplan: 5 Tage einschließlich freiem Montag erwartet, ${weekly.length} erkannt.`);
if (weekly[1].date.slice(5) !== "09-01" || weekly[1].start !== "07:30" || weekly[1].end !== "15:00") throw new Error("Wochenplan: Datum oder Zeit falsch erkannt.");
const table = parse("01.09.2026 | Frühschicht | 08:00 - 16:30\n2026-09-02 Spätschicht 12:00 bis 20:30");
if (table.length !== 2 || table[1].title !== "Spätschicht") throw new Error("Tabellenplan: Datum, Zeiten oder Schichtart falsch erkannt.");
const freeMarkers = parse("03.09.2026 F\n04.09.2026 A\n05.09.2026 frei");
if (freeMarkers.length !== 3 || freeMarkers.some((entry) => entry.title !== "Frei" || entry.start || entry.end)) throw new Error("Freie Tage: leeres Zeitfeld, A, F oder Frei werden nicht korrekt behandelt.");
const absences = parse("06.09.2026 -\n07.09.2026 OFF\n08.09.2026 U\n09.09.2026 Krank\n10.09.2026 Nachtschicht 22:00 - 06:00");
if (absences.length !== 5 || absences[2].title !== "Urlaub" || absences[3].title !== "Krank" || absences[4].start !== "22:00") throw new Error("Weitere Tabellenmarker oder Nachtschichten werden nicht korrekt erkannt.");
const layout = context.window.TimeFlowPrivateScheduleLayoutParser;
const word = (text, x, y) => ({ text, bbox: { x0: x, y0: y, x1: x + 45, y1: y + 24 } });
const positioned = { blocks: [{ paragraphs: [{ lines: [{ words: [word("31.08", 400, 20), word("-", 460, 20), word("06.09", 500, 20)] }, { words: [word("Mo", 20, 100), word("31", 25, 130)] }, { words: [word("Di", 20, 220), word("1", 25, 250), word("07:30", 250, 240), word("-", 310, 240), word("15:00", 340, 240)] }, { words: [word("Mi", 20, 340), word("2", 25, 370), word("07:30", 250, 360), word("15:00", 340, 360)] }, { words: [word("Sa", 20, 460), word("5", 25, 490)] }] }] }] };
const positionedResult = layout(positioned, 600);
if (positionedResult.length !== 7 || positionedResult[0].title !== "Frei" || positionedResult[0].sourceMarker !== "__EMPTY__" || positionedResult[1].date.slice(5) !== "09-01" || positionedResult[1].start !== "07:30" || positionedResult[5].title !== "Frei" || positionedResult[6].title !== "Frei") throw new Error("Bildlayout: vollständige Woche, freie Tage oder zeilenweise Zeiten wurden falsch zugeordnet.");
console.log("Privater Dienstplan-Import: Wochen-, Tabellen-, Datums- und Zeitformate werden erkannt.");

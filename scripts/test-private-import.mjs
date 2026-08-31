import { readFile } from "node:fs/promises";
import vm from "node:vm";

const code = await readFile(new URL("../js/private-schedule-import.js", import.meta.url), "utf8");
const context = { window: {}, document: { readyState: "loading", addEventListener() {} }, console, Date, JSON, String, Number, Array, Math };
vm.runInNewContext(code, context);
const parse = context.window.TimeFlowPrivateScheduleParser;
const weekly = parse("Woche 31.08 - 06.09\nMo 31\n-\nDi 1\nHotel Rezeption\n07:30 - 15:00\nMi 2\n07.30 – 15.00\nDo 3\n0730 bis 1500\nFr 4\n7 Uhr - 15 Uhr");
if (weekly.length !== 4) throw new Error(`Wochenplan: 4 Schichten erwartet, ${weekly.length} erkannt.`);
if (weekly[0].date.slice(5) !== "09-01" || weekly[0].start !== "07:30" || weekly[0].end !== "15:00") throw new Error("Wochenplan: Datum oder Zeit falsch erkannt.");
const table = parse("01.09.2026 | Frühschicht | 08:00 - 16:30\n2026-09-02 Spätschicht 12:00 bis 20:30");
if (table.length !== 2 || table[1].title !== "Spätschicht") throw new Error("Tabellenplan: Datum, Zeiten oder Schichtart falsch erkannt.");
console.log("Privater Dienstplan-Import: Wochen-, Tabellen-, Datums- und Zeitformate werden erkannt.");

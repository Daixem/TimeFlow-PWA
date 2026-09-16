import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../js/script.js", import.meta.url), "utf8");
const storage = new Map();
const element = () => ({ textContent: "", classList: { add() {}, remove() {}, toggle() {} }, style: { setProperty() {} }, setAttribute() {} });
const sandbox = {
  console, Date, JSON, Number, Math, Promise, CustomEvent: class { constructor(type) { this.type = type; } },
  setTimeout: (callback) => { callback(); return 1; }, clearTimeout() {}, setInterval() { return 1; }, clearInterval() {},
  document: { getElementById: element, addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, documentElement: { classList: { contains: () => false } }, body: { dataset: {}, insertAdjacentHTML() {} }, dispatchEvent() {} },
  window: { TimeFlowPlatform: { storage: { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, String(value)), removeItem: (key) => storage.delete(key) }, dialog: {} }, addEventListener() {}, setTimeout: (callback) => { callback(); return 1; }, clearTimeout() {}, setInterval() { return 1; }, clearInterval() {}, TimeFlowPrivateAccount: null },
  globalThis: null
};
sandbox.globalThis = sandbox.window;
const harness = `
  let __localWrites = 0, __toast = "";
  clockInLocal = () => { __localWrites += 1; };
  clockOutLocal = () => { __localWrites += 1; };
  updateWorkUi = () => {};
  startTimer = () => {};
  stopTimer = () => {};
  showToast = (message) => { __toast = message; };
  globalThis.__workTimeHarness = {
    setClient: (client) => { workTimeApi = client; workTimeReady = undefined; workTimeServerMode = undefined; },
    clockIn, ensureWorkTimeReady,
    localWrites: () => __localWrites,
    mode: () => workTimeServerMode,
    toast: () => __toast
  };
`;
vm.runInNewContext(`${source}\n${harness}`, sandbox, { filename: "script.js" });
const api = sandbox.window.__workTimeHarness;

async function expectNoFallback(label, error) {
  api.setClient({ isEnabled: async () => { throw error; } });
  const before = api.localWrites();
  await api.clockIn();
  if (api.localWrites() !== before || api.mode() !== "unavailable") throw new Error(`${label}: unavailable server incorrectly used legacy work-time.`);
  if (!api.toast().includes("keine lokale Ersatzbuchung")) throw new Error(`${label}: unavailable UI message missing.`);
}

api.setClient({ isEnabled: async () => false });
await api.clockIn();
if (api.localWrites() !== 1 || api.mode() !== "disabled") throw new Error("Explicit work_time_feature_disabled must be the only legacy-enabled mode.");

await expectNoFallback("network", Object.assign(new Error("network"), { network: true }));
for (const status of [500, 401, 403, 409]) await expectNoFallback(`HTTP ${status}`, Object.assign(new Error(String(status)), { status }));

api.setClient({ isEnabled: async () => true, getCurrent: async () => ({ state: {} }), writeChange: async () => { throw Object.assign(new Error("500"), { status: 500 }); } });
const beforeEnabledFailure = api.localWrites();
await api.clockIn();
if (api.mode() !== "enabled" || api.localWrites() !== beforeEnabledFailure) throw new Error("A failure after ENABLED detection must not switch to legacy.");

console.log("Work-time fail-open: only explicit feature disablement permits legacy; unavailable, auth, server and conflict failures never do.");

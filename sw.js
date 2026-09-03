const BUILD_VERSION = "__TIMEFLOW_BUILD__";
const CACHE_PREFIX = "timeflow-";
const CACHE_NAME = `${CACHE_PREFIX}app-${BUILD_VERSION}`;
const APP_SHELL = [
  "./", "index.html", "manifest.webmanifest?v=__TIMEFLOW_BUILD__",
  "css/style.css?v=__TIMEFLOW_BUILD__", "css/pwa.css?v=__TIMEFLOW_BUILD__", "css/sprint3.css?v=__TIMEFLOW_BUILD__", "css/sprint4.css?v=__TIMEFLOW_BUILD__", "css/sprint5.css?v=__TIMEFLOW_BUILD__", "css/sprint6.css?v=__TIMEFLOW_BUILD__", "css/sprint7.css?v=__TIMEFLOW_BUILD__", "css/sprint8.css?v=__TIMEFLOW_BUILD__", "css/sprint9.css?v=__TIMEFLOW_BUILD__", "css/sprint10.css?v=__TIMEFLOW_BUILD__", "css/sprint11.css?v=__TIMEFLOW_BUILD__", "css/sprint12.css?v=__TIMEFLOW_BUILD__", "css/stamp.css?v=__TIMEFLOW_BUILD__", "css/compat.css?v=__TIMEFLOW_BUILD__", "css/private-home.css?v=__TIMEFLOW_BUILD__", "css/private-schedule-import.css?v=__TIMEFLOW_BUILD__", "css/private-schedule-saved.css?v=__TIMEFLOW_BUILD__", "css/private-schedule-corrections.css?v=__TIMEFLOW_BUILD__", "css/private-schedule-learning.css?v=__TIMEFLOW_BUILD__", "css/private-schedule-private-view.css?v=__TIMEFLOW_BUILD__", "css/private-schedule-manual.css?v=__TIMEFLOW_BUILD__", "css/private-notifications.css?v=__TIMEFLOW_BUILD__", "css/private-clean.css?v=__TIMEFLOW_BUILD__", "css/private-account.css?v=__TIMEFLOW_BUILD__", "css/private-beta-access.css?v=__TIMEFLOW_BUILD__", "css/theme-personalization.css?v=__TIMEFLOW_BUILD__", "css/personalization-options.css?v=__TIMEFLOW_BUILD__", "css/font-language-options.css?v=__TIMEFLOW_BUILD__", "css/adaptive-ui-fixes.css?v=__TIMEFLOW_BUILD__", "css/support-feedback.css?v=__TIMEFLOW_BUILD__", "css/settings-organization.css?v=__TIMEFLOW_BUILD__", "css/private-beta-personalization.css?v=__TIMEFLOW_BUILD__",
  "js/platform.js?v=__TIMEFLOW_BUILD__", "js/shell.js?v=__TIMEFLOW_BUILD__", "js/script.js?v=__TIMEFLOW_BUILD__", "js/sprint3.js?v=__TIMEFLOW_BUILD__", "js/sprint4.js?v=__TIMEFLOW_BUILD__", "js/sprint5.js?v=__TIMEFLOW_BUILD__", "js/sprint6.js?v=__TIMEFLOW_BUILD__", "js/sprint7.js?v=__TIMEFLOW_BUILD__", "js/sprint8.js?v=__TIMEFLOW_BUILD__", "js/sprint9.js?v=__TIMEFLOW_BUILD__", "js/sprint10.js?v=__TIMEFLOW_BUILD__", "js/sprint11.js?v=__TIMEFLOW_BUILD__", "js/sprint12.js?v=__TIMEFLOW_BUILD__", "js/stamp.js?v=__TIMEFLOW_BUILD__", "js/private-home.js?v=__TIMEFLOW_BUILD__", "js/private-schedule-import.js?v=__TIMEFLOW_BUILD__", "js/private-clean.js?v=__TIMEFLOW_BUILD__", "js/private-account.js?v=__TIMEFLOW_BUILD__", "js/work-protection.js?v=__TIMEFLOW_BUILD__", "js/settings-organization.js?v=__TIMEFLOW_BUILD__", "js/support-feedback.js?v=__TIMEFLOW_BUILD__", "js/ui-localization.js?v=__TIMEFLOW_BUILD__", "js/private-reminders.js?v=__TIMEFLOW_BUILD__", "js/private-beta-legal.js?v=__TIMEFLOW_BUILD__", "js/private-beta-access.js?v=__TIMEFLOW_BUILD__", "js/private-beta-personalization.js?v=__TIMEFLOW_BUILD__",
  "assets/icons/timeflow-icon.svg", "assets/icons/timeflow-icon-192.png", "assets/icons/timeflow-icon-512.png", "assets/icons/timeflow-maskable-512.png"
];

self.addEventListener("install", (event) => {
  // `reload` is intentional: an HTTP cache (notably Safari's) must not seed a
  // freshly versioned app cache with files from the preceding deployment.
  const freshShell = APP_SHELL.map((url) => new Request(url, { cache: "reload" }));
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(freshShell)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key))))
    .then(() => self.clients.claim())
    .then(() => self.clients.matchAll({ type: "window" }))
    .then((clients) => clients.forEach((client) => client.postMessage({ type: "TIMEFLOW_UPDATED", version: BUILD_VERSION }))));
});

function offlineShell() {
  return caches.match("./").then((response) => response || caches.match("index.html"));
}

function cacheSuccessful(request, response) {
  if (!response || !(response.ok || response.type === "opaque")) return response;
  const copy = response.clone();
  return caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).then(() => response);
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  const scopeUrl = new URL(self.registration.scope);
  const inScope = requestUrl.origin === scopeUrl.origin && requestUrl.pathname.startsWith(scopeUrl.pathname);
  const relativePath = inScope ? requestUrl.pathname.slice(scopeUrl.pathname.length) : "";

  // Personenbezogene API-Antworten werden weder beantwortet noch im PWA-Cache gespeichert.
  if (!inScope || relativePath.startsWith("api/")) return;

  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request, { cache: "no-store" })
      .then((response) => cacheSuccessful("./", response))
      .catch(offlineShell));
    return;
  }

  if (["script", "style", "manifest"].includes(event.request.destination)) {
    event.respondWith(fetch(event.request, { cache: "no-store" })
      .then((response) => cacheSuccessful(event.request, response))
      .catch(() => caches.match(event.request, { ignoreSearch: true })));
    return;
  }

  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)
    .then((response) => cacheSuccessful(event.request, response))));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "./", self.location.href).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    const appClient = clients.find((client) => new URL(client.url).origin === new URL(targetUrl).origin);
    if (appClient) return appClient.focus();
    return self.clients.openWindow(targetUrl);
  }));
});

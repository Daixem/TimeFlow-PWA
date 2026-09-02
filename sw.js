const CACHE_NAME = "timeflow-v76-support-feedback";
const APP_SHELL = [
  "./", "index.html", "manifest.webmanifest?v=0040", "css/style.css?v=0040", "css/pwa.css?v=0040", "css/sprint3.css?v=0040", "css/sprint4.css?v=0040", "css/sprint5.css?v=0040", "css/sprint6.css?v=0040", "css/sprint7.css?v=0040", "css/sprint8.css?v=0040", "css/sprint9.css?v=0040-scroll2", "css/sprint10.css?v=0040", "css/sprint11.css?v=0040", "css/sprint12.css?v=0040-mobile2", "css/stamp.css?v=0040", "css/compat.css?v=0040-mobile2", "css/private-home.css?v=0040-home2", "css/private-schedule-import.css?v=0040-files2", "css/private-schedule-saved.css?v=0040-invite1", "css/private-schedule-corrections.css?v=0040-invite1", "css/private-schedule-learning.css?v=0040-invite1", "css/private-schedule-private-view.css?v=0040-invite1", "css/private-schedule-manual.css?v=0040-invite1", "css/private-notifications.css?v=0040-private2", "css/private-clean.css?v=0040-private2", "css/private-account.css?v=0040-invite1", "css/private-beta-access.css?v=0040-invite4", "css/theme-personalization.css?v=0040-theme1", "css/personalization-options.css?v=0040-options1", "css/font-language-options.css?v=0040-fonts1", "css/support-feedback.css?v=0040-support1", "css/settings-organization.css?v=0040-settings2",
  "js/platform.js?v=0040", "js/shell.js?v=0040-scroll1", "js/script.js?v=0040-privatefix1", "js/sprint3.js?v=0040", "js/sprint4.js?v=0040-profile2", "js/sprint5.js?v=0040", "js/sprint6.js?v=0040", "js/sprint7.js?v=0040-read1", "js/sprint8.js?v=0040-admin2", "js/sprint9.js?v=0040-read1", "js/sprint10.js?v=0040", "js/sprint11.js?v=0040", "js/sprint12.js?v=0040-scroll1", "js/stamp.js?v=0040", "js/private-home.js?v=0040-home19", "js/private-schedule-import.js?v=0040-files2", "js/private-clean.js?v=0040-private2", "js/private-account.js?v=0040-invite1", "js/work-protection.js?v=0040-legal2", "js/settings-organization.js?v=0040-settings3", "js/support-feedback.js?v=0040-support1",
  "js/private-reminders.js?v=0040-invite1",
  "js/private-beta-legal.js?v=0040-invite1",
  "js/private-beta-access.js?v=0040-invite4",
  "js/private-beta-personalization.js?v=0040-beta4",
  "css/private-beta-personalization.css?v=0040-beta2",
  "assets/icons/timeflow-icon.svg", "assets/icons/timeflow-icon-192.png",
  "assets/icons/timeflow-icon-512.png", "assets/icons/timeflow-maskable-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  const scopeUrl = new URL(self.registration.scope);
  const relativePath = requestUrl.origin === scopeUrl.origin && requestUrl.pathname.startsWith(scopeUrl.pathname)
    ? requestUrl.pathname.slice(scopeUrl.pathname.length)
    : "";
  // Personenbezogene API-Antworten dürfen niemals in den PWA-Cache gelangen.
  if (requestUrl.origin === scopeUrl.origin && relativePath.startsWith("api/")) return;
  if (event.request.mode === "navigate") {
    const networkResponse = fetch(event.request);
    event.respondWith(networkResponse.catch(() => caches.match("./")));
    event.waitUntil(networkResponse.then((response) => {
      if (response.ok) {
        const copy = response.clone();
        return caches.open(CACHE_NAME).then((cache) => cache.put("./", copy));
      }
      return undefined;
    }).catch(() => undefined));
    return;
  }
  if (["script", "style"].includes(event.request.destination)) {
    const networkResponse = fetch(event.request);
    event.respondWith(networkResponse.catch(() => caches.match(event.request)));
    event.waitUntil(networkResponse.then((response) => {
      if (response.ok || response.type === "opaque") {
        const copy = response.clone();
        return caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      }
      return undefined;
    }).catch(() => undefined));
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    if (response.ok || response.type === "opaque") {
      const copy = response.clone();
      return caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).then(() => response);
    }
    return response;
  }).catch(() => caches.match("./"))));
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

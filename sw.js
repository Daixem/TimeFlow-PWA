const CACHE_NAME = "timeflow-v19";
const APP_SHELL = [
  "./", "index.html", "manifest.webmanifest?v=0018", "css/style.css?v=0018", "css/pwa.css?v=0018", "css/sprint3.css?v=0018", "css/sprint4.css?v=0018", "css/sprint5.css?v=0018", "css/sprint6.css?v=0018", "css/sprint7.css?v=0018", "css/sprint8.css?v=0018", "css/sprint9.css?v=0018", "css/sprint10.css?v=0018", "css/sprint11.css?v=0018", "css/sprint12.css?v=0018", "css/stamp.css?v=0018",
  "js/script.js?v=0018", "js/sprint3.js?v=0018", "js/sprint4.js?v=0018", "js/sprint5.js?v=0018", "js/sprint6.js?v=0018", "js/sprint7.js?v=0018", "js/sprint8.js?v=0018", "js/sprint9.js?v=0018", "js/sprint10.js?v=0018", "js/sprint11.js?v=0018", "js/sprint12.js?v=0018", "js/stamp.js?v=0018",
  "assets/icons/timeflow-icon.svg", "assets/icons/timeflow-icon-192.png",
  "assets/icons/timeflow-icon-512.png", "assets/icons/timeflow-maskable-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
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

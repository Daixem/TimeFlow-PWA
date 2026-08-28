const CACHE_NAME = "timeflow-v13";
const APP_SHELL = [
  "./", "index.html", "manifest.webmanifest?v=0012", "css/style.css?v=0012", "css/pwa.css?v=0012", "css/sprint3.css?v=0012", "css/sprint4.css?v=0012", "css/sprint5.css?v=0012", "css/sprint6.css?v=0012", "css/sprint7.css?v=0012", "css/stamp.css?v=0012",
  "js/script.js?v=0012", "js/sprint3.js?v=0012", "js/sprint4.js?v=0012", "js/sprint5.js?v=0012", "js/sprint6.js?v=0012", "js/sprint7.js?v=0012", "js/stamp.js?v=0012",
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
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match("./")));
    return;
  }
  if (["script", "style"].includes(event.request.destination)) {
    event.respondWith(fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match(event.request)));
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    if (new URL(event.request.url).origin === self.location.origin) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
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

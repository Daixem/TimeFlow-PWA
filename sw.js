const CACHE_NAME = "timeflow-v10";
const APP_SHELL = [
  "./", "index.html", "manifest.webmanifest?v=0009", "css/style.css?v=0009", "css/pwa.css?v=0009", "css/sprint3.css?v=0009", "css/sprint4.css?v=0009", "css/stamp.css?v=0009",
  "js/script.js?v=0009", "js/sprint3.js?v=0009", "js/sprint4.js?v=0009", "js/stamp.js?v=0009",
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

const CACHE_NAME = "pt-tracker-v6";

// Cache the “app shell” (must include the start_url variant)
const APP_SHELL = [
  "./",
  "./?pwa=1",
  "./index.html",
  "./styles.css",
  "./script.js",
  "./manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache-first, but with a strong navigation fallback for offline cold starts
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const req = event.request;

  // If it’s a page navigation, ALWAYS try to serve the cached app shell
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return resp;
        })
        .catch(async () => {
          // Ignore query strings (Android often adds them)
          const cache = await caches.open(CACHE_NAME);

          // Prefer the explicit start_url if present
          const start = await cache.match("./?pwa=1", { ignoreSearch: true });
          if (start) return start;

          // Fall back to index.html
          const index = await cache.match("./index.html", { ignoreSearch: true });
          if (index) return index;

          // Last resort: try root
          return cache.match("./", { ignoreSearch: true });
        })
    );
    return;
  }

  // For everything else (css/js/images), cache-first
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return resp;
        });
    })
  );
});

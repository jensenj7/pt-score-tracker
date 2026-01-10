const CACHE_NAME = "pt-tracker-v5";

const RELATIVE_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./script.js",
  "./manifest.json"
];

function toAbsolute(url) {
  return new URL(url, self.location.href).toString();
}

self.addEventListener("install", event => {
  const shell = RELATIVE_SHELL.map(toAbsolute);

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(shell))
  );

  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  // Always try cache first
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return resp;
      }).catch(() => {
        // If it's a navigation request, fall back to cached index.html
        if (event.request.mode === "navigate") {
          return caches.match(toAbsolute("./index.html"));
        }
        return undefined;
      });
    })
  );
});

const CACHE_NAME = "pt-tracker-v3";

/* Install: cache everything the app actually loads */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return fetch("./")
        .then(() => cache.addAll([
          self.registration.scope,
        ]))
        .catch(() => {});
    })
  );
  self.skipWaiting();
});

/* Activate: remove old caches */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

/* Fetch: cache-first for same-origin requests */
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, copy);
          });
          return response;
        })
        .catch(() => {
          // Offline fallback: try index.html
          return caches.match("./index.html");
        });
    })
  );
});

/* ============================================================
 * LovedWords service worker
 * ------------------------------------------------------------
 * The app is a single HTML file plus icons. All user data lives
 * in IndexedDB and never touches the network, so the only job
 * here is keeping the shell available with no connection.
 *
 * Strategy:
 *   navigation  -> network-first, cache fallback
 *                  (so a deploy lands on the next online load,
 *                   but the app still opens on a plane / no signal)
 *   same-origin -> cache-first, revalidate in background
 *   cross-origin-> ignored entirely; the app makes no such calls
 *
 * Bump CACHE_VERSION on every deploy that changes index.html.
 * ============================================================ */
const CACHE_VERSION = "lovedwords-v4-2026-08-31";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      // addAll is atomic: one 404 aborts the whole install, which would
      // leave users on the previous worker. Add individually instead so a
      // missing icon can never block the shell from caching.
      Promise.all(
        SHELL.map((url) =>
          cache.add(new Request(url, { cache: "reload" })).catch(() => {})
        )
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: prefer fresh, fall back to the cached shell offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put("./index.html", copy));
          return res;
        })
        .catch(() =>
          caches.match("./index.html").then((r) => r || caches.match("./"))
        )
    );
    return;
  }

  // Everything else: cache-first, refresh in the background.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

// Lets the page trigger an immediate update rather than waiting a reload.
self.addEventListener("message", (e) => {
  if (e.data === "skipWaiting") self.skipWaiting();
});

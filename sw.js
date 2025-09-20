const CACHE_NAME = "soma-cache-v0.7.1";
const urlsToCache = [
  "./",
  "./index.html",
  "./styles.css",
  "./js/config.js",
  "./js/export.js",
  "./js/grid.js",
  "./js/interactions.js",
  "./js/pieces.js",
  "./js/puzzle.js",
  "./js/puzzles.js",
  "./js/solver.js",
  "./js/soma.js",
  "./js/trackball.js",
  "./js/ui.js",
  "./libs/three.module.js",
  "./media/icon.png",
  "./media/icon192.png",
  "./media/favicon.ico",
  "./fonts/InterDisplay-Bold.woff2",
  "./fonts/InterDisplay-Italic.woff2",
  "./fonts/InterDisplay-Regular.woff2",
  "./fonts/inter.css",
  "./fonts/monoid-bold.woff2",
  "./fonts/monoid-regular.woff2",
  "./fonts/monoid.css",
  "./extra-puzzles/puzzles.md",
];

// Install event: opens a cache and adds the core files to it.
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        console.log("Cache opened. Caching files...");

        for (const url of urlsToCache) {
          try {
            await cache.add(url);
          } catch (error) {
            console.error(`Failed to cache: ${url}`, error);
            // If one file fails, you might want the whole installation to fail.
            // Re-throwing the error will cause the service worker installation to fail.
            throw error;
          }
        }

        console.log("All files cached successfully.");
      } catch (error) {
        console.error("Service worker installation failed:", error);
      }
    })(),
  );
});

// Fetch event: serves assets from cache if available, otherwise fetches from network.
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return response
      if (response) {
        return response;
      }
      return fetch(event.request);
    }),
  );
});

// Activate event: cleans up old caches.
self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
});

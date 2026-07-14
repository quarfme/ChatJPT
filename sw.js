// ChatJPT service worker — bump CACHE_VERSION on every content update
const CACHE_VERSION = "chatjpt-v4";
const CORE = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(async (cache) => {
      await cache.addAll(CORE);
      // Pre-cache all audio listed in the manifest file
      try {
        const res = await fetch("./audio-list.json");
        const list = await res.json();
        await cache.addAll(list.map((f) => "./audio/" + f));
      } catch (err) { /* audio cached lazily on first play if list fetch fails */ }
      self.skipWaiting();
    })
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        // Cache new audio files on the fly
        if (e.request.url.includes("/audio/") && res.ok) {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});

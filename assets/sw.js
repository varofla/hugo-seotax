const cacheName = self.location.pathname
{{ if eq .Site.Params.serviceWorker "precache" }}
const pages = [
  {{ range .Site.AllPages -}}
  "{{ .RelPermalink }}",
  {{ end -}}
  {{ range $permalink, $ok := site.Store.Get "sw-precache" -}}
  "{{ $permalink }}",
  {{ end -}}
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(cacheName)
      .then((cache) => cache.addAll(pages))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", function (event) {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }

  if (request.cache === "only-if-cached" && request.mode !== "same-origin") {
    return;
  }

  /**
   * @param {Response} response
   * @returns {Promise<Response>}
   */
  function saveToCache(response) {
    if (cacheable(response)) {
      return caches
        .open(cacheName)
        .then((cache) => cache.put(request, response.clone()))
        .then(() => response);
    } else {
      return response;
    }
  }

  /**
   * @param {Error} error
   */
  async function serveFromCache(error) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    throw error;
  }

  /**
   * @param {Response} response
   * @returns {Boolean}
   */
  function cacheable(response) {
    return response.type === "basic" && response.ok && !response.headers.has("Content-Disposition")
  }

  event.respondWith(fetch(request).then(saveToCache).catch(serveFromCache));
});
{{ else }}
self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil((async function () {
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys.map((key) => caches.delete(key)));
    await self.registration.unregister();

    const clients = await self.clients.matchAll({ type: "window" });
    await Promise.all(
      clients.map((client) => {
        if ("navigate" in client) {
          return client.navigate(client.url);
        }
        return Promise.resolve();
      })
    );
  })());
});
{{ end }}

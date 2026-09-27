{{ if eq .Site.Params.serviceWorker "precache" }}
{{- $pages := slice -}}
{{- range .Site.AllPages -}}
  {{- $pages = $pages | append .RelPermalink -}}
{{- end -}}
{{- range $permalink, $_ := site.Store.Get "sw-precache" -}}
  {{- $pages = $pages | append $permalink -}}
{{- end -}}
{{- range slice "fonts/PretendardVariable.woff2" "fonts/icomoon.woff?jrhayr" "fuse.min.js" "highlightjs-cmake.min.js" "highlightjs-dts.min.js" "highlightjs-line-numbers.min.js" "highlightjs-protobuf.min.js" "mermaid.min.js" "katex/katex.min.js" "katex/auto-render.min.js" "katex/katex.min.css" "favicon.svg" -}}
  {{- $pages = $pages | append (. | relURL) -}}
{{- end -}}
const cachePrefix = "varofla-sw-";
const cacheVersion = "{{ now.UnixNano }}";
const precacheName = `${cachePrefix}precache-${cacheVersion}`;
const runtimeName = `${cachePrefix}runtime-${cacheVersion}`;
const runtimeLimit = 128;
const pages = {{ sort (uniq $pages) | jsonify | safeJS }};
const precacheURLs = new Set(pages.map((page) => new URL(page, self.location.origin).href));

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(precacheName)
      .then((cache) => cache.addAll(pages))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil((async function () {
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys
      .filter((key) => (key.startsWith(cachePrefix) && key !== precacheName && key !== runtimeName)
        || key === self.location.pathname)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
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

  if (new URL(request.url).origin !== self.location.origin) {
    return;
  }

  // A Hugo page has the same HTML regardless of its search parameters.
  const cacheRequest = request.mode === "navigate"
    ? new Request(new URL(request.url).origin + new URL(request.url).pathname)
    : request;

  event.respondWith((async function () {
    let response;
    try {
      response = await fetch(request);
    } catch (error) {
      const precache = await caches.open(precacheName);
      const runtime = await caches.open(runtimeName);
      const cachedResponse = await precache.match(cacheRequest) || await runtime.match(cacheRequest);
      if (cachedResponse) {
        return cachedResponse;
      }
      throw error;
    }

    if (response.type === "basic" && response.ok && !response.headers.has("Content-Disposition")) {
      try {
        const isPrecached = precacheURLs.has(cacheRequest.url);
        const cache = await caches.open(isPrecached ? precacheName : runtimeName);
        await cache.put(cacheRequest, response.clone());
        if (!isPrecached) {
          const requests = await cache.keys();
          await Promise.all(requests.slice(0, -runtimeLimit).map((oldRequest) => cache.delete(oldRequest)));
        }
      } catch (error) {
        // CacheStorage can fail when the browser's storage quota is full.
        // The successful network response must still reach the page.
        console.warn("Service worker cache write failed:", error);
      }
    }

    return response;
  })());
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

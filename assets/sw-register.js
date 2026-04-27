{{- $swJS := resources.Get "sw.js" | resources.ExecuteAsTemplate "sw.js" . -}}
if (navigator.serviceWorker) {
  let reloading = false;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) {
      return;
    }

    reloading = true;
    window.location.reload();
  });

  navigator.serviceWorker.register(
    "{{ $swJS.RelPermalink }}",
    { scope: "{{ "./" | relURL }}" }
  ).then((registration) => {
    if (registration.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }

    registration.addEventListener("updatefound", () => {
      const nextWorker = registration.installing;
      if (!nextWorker) {
        return;
      }

      nextWorker.addEventListener("statechange", () => {
        if (nextWorker.state === "installed" && navigator.serviceWorker.controller) {
          nextWorker.postMessage({ type: "SKIP_WAITING" });
        }
      });
    });
  }).catch((error) => {
    console.error("Service worker registration failed:", error);
  });
}

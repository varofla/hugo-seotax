(function () {
  "use strict";

  let zoomLoader = null;
  let zoomLoaderCheckTimer = null;
  let zoomLoaderShowTimer = null;

  function normalizeUrl(url) {
    if (!url) return "";

    try {
      return new URL(url, window.location.href).href;
    } catch (error) {
      return url;
    }
  }

  function ensureZoomLoader() {
    if (zoomLoader) return zoomLoader;

    zoomLoader = document.createElement("div");
    zoomLoader.className = "medium-zoom-loader";
    zoomLoader.setAttribute("aria-hidden", "true");
    document.body.appendChild(zoomLoader);

    return zoomLoader;
  }

  function clearZoomLoaderCheck() {
    if (!zoomLoaderCheckTimer) return;

    window.clearInterval(zoomLoaderCheckTimer);
    zoomLoaderCheckTimer = null;
  }

  function clearZoomLoaderShow() {
    if (!zoomLoaderShowTimer) return;

    window.clearTimeout(zoomLoaderShowTimer);
    zoomLoaderShowTimer = null;
  }

  function hideZoomLoader() {
    clearZoomLoaderCheck();
    clearZoomLoaderShow();
    document.body.classList.remove("medium-zoom-loading");
  }

  function scheduleZoomLoader() {
    clearZoomLoaderShow();

    zoomLoaderShowTimer = window.setTimeout(() => {
      ensureZoomLoader();
      document.body.classList.add("medium-zoom-loading");
      zoomLoaderShowTimer = null;
    }, 200);
  }

  function waitForZoomImage(target) {
    const zoomSrc = normalizeUrl(target?.getAttribute("data-zoom-src"));

    if (!zoomSrc) {
      hideZoomLoader();
      return;
    }

    clearZoomLoaderCheck();

    let attempts = 0;

    zoomLoaderCheckTimer = window.setInterval(() => {
      const hdImageLoaded = Array.from(document.querySelectorAll(".medium-zoom-image--opened")).some((img) => {
        const currentSrc = normalizeUrl(img.currentSrc || img.getAttribute("src"));

        return currentSrc === zoomSrc && img.complete;
      });

      if (hdImageLoaded || attempts >= 120) {
        hideZoomLoader();
      }

      attempts += 1;
    }, 50);
  }

  function setImageOrientation(img) {
    if (img.naturalWidth >= img.naturalHeight) {
      img.classList.add("landscape");
      img.classList.remove("portrait");
    } else {
      img.classList.add("portrait");
      img.classList.remove("landscape");
    }
  }

  function initImage() {
    document.querySelectorAll(".md-image img, .sc-image img").forEach((img) => {
      if (img.complete && img.naturalWidth && img.naturalHeight) {
        setImageOrientation(img);
      } else {
        img.addEventListener("load", () => setImageOrientation(img), { once: true });
      }
    });
  }

  function initImageZoom() {
    if (typeof mediumZoom === "undefined") return;

    const images = document.querySelectorAll(
      ".md-image img:not([data-no-zoom]):not(.no-zoom), .sc-image img:not([data-no-zoom]):not(.no-zoom)"
    );

    if (!images.length) return;

    const zoom = mediumZoom(images, {
      margin: 10,
      background: "rgba(0, 0, 0, 0.85)",
      scrollOffset: 40,
    });

    zoom.on("open", ({ target }) => {
      if (!target?.getAttribute("data-zoom-src")) {
        hideZoomLoader();
        return;
      }

      scheduleZoomLoader();
      waitForZoomImage(target);
    });

    zoom.on("close", hideZoomLoader);
    zoom.on("closed", hideZoomLoader);
  }

  function init() {
    initImage();
    initImageZoom();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

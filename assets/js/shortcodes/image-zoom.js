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

  function getImageLoadingContainer(img) {
    return img.closest(".md-image, .sc-image");
  }

  function showImageLoader(img) {
    const container = getImageLoadingContainer(img);

    if (!container) return;

    container.classList.add("is-loading");
  }

  function hideImageLoader(img) {
    const container = getImageLoadingContainer(img);

    if (!container) return;

    container.classList.remove("is-loading");
  }

  function initImageLoader(img) {
    if (!(img instanceof HTMLImageElement)) return;

    if (img.complete) {
      hideImageLoader(img);
      return;
    }

    showImageLoader(img);

    const handleDone = () => {
      hideImageLoader(img);
      img.removeEventListener("load", handleDone);
      img.removeEventListener("error", handleDone);
    };

    img.addEventListener("load", handleDone);
    img.addEventListener("error", handleDone);
  }

  function initImage() {
    document.querySelectorAll(".md-image img, .sc-image img").forEach((img) => {
      initImageLoader(img);

      if (img.complete && img.naturalWidth && img.naturalHeight) {
        setImageOrientation(img);
      } else {
        img.addEventListener("load", () => setImageOrientation(img), { once: true });
      }
    });
  }

  function getImageAspectRatio(img) {
    const width = Number(img.getAttribute("width")) || img.naturalWidth;
    const height = Number(img.getAttribute("height")) || img.naturalHeight;

    if (!width || !height) return 0;

    return width / height;
  }

  function getAutoRatioItems(columns) {
    const directItems = Array.from(columns.querySelectorAll(":scope > div"));

    if (directItems.length) return directItems;

    const list = columns.querySelector(":scope > ul");

    if (list) return Array.from(list.children);

    return [];
  }

  function getSingleColumnImage(item) {
    if (item.children.length !== 1) return null;

    const [child] = item.children;

    if (!child.matches(".sc-image, .md-image")) return null;

    const images = child.querySelectorAll("img");

    if (images.length !== 1) return null;

    return images[0];
  }

  function applyAutoImageColumnRatios(columns) {
    const items = getAutoRatioItems(columns);

    if (items.length < 2) return;

    const images = [];

    for (const item of items) {
      const img = getSingleColumnImage(item);

      if (!img) return;

      const ratio = getImageAspectRatio(img);

      if (!ratio) {
        if (!img.complete) {
          img.addEventListener("load", () => applyAutoImageColumnRatios(columns), { once: true });
        }

        return;
      }

      images.push({ item, ratio });
    }

    images.forEach(({ item, ratio }) => {
      item.style.flexGrow = String(ratio);
    });
  }

  function initAutoImageColumns() {
    document.querySelectorAll(".sc-columns--auto-image-ratio").forEach((columns) => {
      applyAutoImageColumnRatios(columns);
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
    initAutoImageColumns();
    initImageZoom();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

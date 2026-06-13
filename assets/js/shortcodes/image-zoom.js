(function () {
  "use strict";

  let zoomLoader = null;
  let zoomLoaderCheckTimer = null;
  let zoomLoaderShowTimer = null;
  let zoomWheelState = null;
  let zoomWheelSettleTimer = null;
  let zoomDragState = null;
  let suppressZoomClick = false;
  let isZoomNavigating = false;

  const CONTENT_ZOOM_SELECTOR =
    "#content-wrap .md-image img:not([data-no-zoom]):not(.no-zoom), #content-wrap .sc-image img:not([data-no-zoom]):not(.no-zoom)";
  const TOC_ZOOM_SELECTOR =
    ".toc-cover-wrap img:not([data-no-zoom]):not(.no-zoom)";
  const ALL_ZOOM_SELECTOR = `${CONTENT_ZOOM_SELECTOR}, ${TOC_ZOOM_SELECTOR}`;

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

  function isWheelZoomActive() {
    return !!(zoomWheelState && zoomWheelState.scale - zoomWheelState.baseScale > 0.001);
  }

  function clearZoomWheelSettle() {
    if (!zoomWheelSettleTimer) return;

    window.clearTimeout(zoomWheelSettleTimer);
    zoomWheelSettleTimer = null;
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
      syncWheelZoomTransforms();

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

  function getOpenedZoomImages() {
    return Array.from(document.querySelectorAll(".medium-zoom-image--opened"));
  }

  function getZoomSequenceImages() {
    const coverImages = Array.from(document.querySelectorAll(TOC_ZOOM_SELECTOR));
    const contentImages = Array.from(document.querySelectorAll(CONTENT_ZOOM_SELECTOR));

    return [...new Set([...coverImages, ...contentImages])];
  }

  function setOpenedZoomCursor(cursor) {
    getOpenedZoomImages().forEach((img) => {
      if (!(img instanceof HTMLElement)) return;

      img.style.cursor = cursor;
    });
  }

  function getZoomAnchorImage(event) {
    if (!event || typeof document.elementsFromPoint !== "function") return null;

    const elements = document.elementsFromPoint(event.clientX, event.clientY);

    return elements.find((el) => el instanceof HTMLImageElement && el.classList.contains("medium-zoom-image--opened")) || null;
  }

  function readZoomMatrix(img) {
    if (!(img instanceof HTMLElement)) return null;

    const transform = window.getComputedStyle(img).transform;

    if (!transform || transform === "none") return null;

    try {
      return new DOMMatrixReadOnly(transform);
    } catch (error) {
      return null;
    }
  }

  function getMaxWheelZoomScale() {
    if (!zoomWheelState) return 4;

    let maxScale = zoomWheelState.baseScale * 4;

    getOpenedZoomImages().forEach((img) => {
      const naturalWidth = img.naturalWidth || 0;
      const naturalHeight = img.naturalHeight || 0;

      if (zoomWheelState.baseWidth > 0 && naturalWidth > 0) {
        maxScale = Math.max(maxScale, naturalWidth / zoomWheelState.baseWidth);
      }

      if (zoomWheelState.baseHeight > 0 && naturalHeight > 0) {
        maxScale = Math.max(maxScale, naturalHeight / zoomWheelState.baseHeight);
      }
    });

    return Math.max(maxScale, zoomWheelState.baseScale);
  }

  function setOpenedZoomTransition(value) {
    getOpenedZoomImages().forEach((img) => {
      if (!(img instanceof HTMLElement)) return;

      if (value) {
        img.style.setProperty("transition", value, "important");
      } else {
        img.style.removeProperty("transition");
      }
    });
  }

  function applyWheelZoomTransition(enabled) {
    if (enabled) {
      setOpenedZoomTransition("transform 90ms cubic-bezier(0.22, 1, 0.36, 1)");
    } else {
      setOpenedZoomTransition(null);
    }
  }

  function scheduleWheelZoomTransitionReset() {
    clearZoomWheelSettle();

    zoomWheelSettleTimer = window.setTimeout(() => {
      applyWheelZoomTransition(false);
      zoomWheelSettleTimer = null;
    }, 120);
  }

  function syncWheelZoomTransforms() {
    if (!zoomWheelState) return;

    getOpenedZoomImages().forEach((img) => {
      if (!(img instanceof HTMLElement)) return;

      if (Math.abs(zoomWheelState.scale - zoomWheelState.baseScale) < 0.001) {
        img.style.transform = zoomWheelState.baseTransform;
        return;
      }

      const translateX = (
        zoomWheelState.left
        - zoomWheelState.baseLeft
        - zoomWheelState.baseWidth * 0.5 * (1 - zoomWheelState.scale)
      ) / zoomWheelState.scale;
      const translateY = (
        zoomWheelState.top
        - zoomWheelState.baseTop
        - zoomWheelState.baseHeight * 0.5 * (1 - zoomWheelState.scale)
      ) / zoomWheelState.scale;

      img.style.transform = `scale(${zoomWheelState.scale}) translate3d(${translateX}px, ${translateY}px, 0)`;
    });
  }

  function resetWheelZoomState() {
    clearZoomWheelSettle();
    applyWheelZoomTransition(false);
    setOpenedZoomCursor("");
    zoomWheelState = null;
  }

  function initWheelZoomState() {
    const openedImage = getOpenedZoomImages()[0];
    const matrix = readZoomMatrix(openedImage);
    const rect = openedImage?.getBoundingClientRect();

    if (!openedImage || !matrix || !rect) {
      zoomWheelState = null;
      return;
    }

    const styleLeft = Number.parseFloat(openedImage.style.left);
    const styleTop = Number.parseFloat(openedImage.style.top);
    const styleWidth = Number.parseFloat(openedImage.style.width);
    const styleHeight = Number.parseFloat(openedImage.style.height);

    if (![styleLeft, styleTop, styleWidth, styleHeight].every(Number.isFinite)) {
      zoomWheelState = null;
      return;
    }

    zoomWheelState = {
      baseTransform: openedImage.style.transform,
      baseScale: matrix.a,
      scale: matrix.a,
      baseLeft: styleLeft - window.pageXOffset,
      baseTop: styleTop - window.pageYOffset,
      baseWidth: styleWidth,
      baseHeight: styleHeight,
      openedLeft: rect.left,
      openedTop: rect.top,
      openedWidth: rect.width,
      openedHeight: rect.height,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };
  }

  function handleWheelZoom(event) {
    if (!zoomWheelState) return;

    const anchorImage = getZoomAnchorImage(event);

    if (!anchorImage) return;

    event.preventDefault();

    const intensity = Math.exp((-event.deltaY / 100) * 0.12);
    const nextScale = Math.min(
      getMaxWheelZoomScale(),
      Math.max(zoomWheelState.baseScale, zoomWheelState.scale * intensity)
    );

    if (!Number.isFinite(nextScale) || nextScale === zoomWheelState.scale) return;

    const { clientX, clientY } = event;
    const currentWidth = zoomWheelState.width;
    const currentHeight = zoomWheelState.height;

    if (!currentWidth || !currentHeight) return;

    const ratioX = (clientX - zoomWheelState.left) / currentWidth;
    const ratioY = (clientY - zoomWheelState.top) / currentHeight;
    const clampedRatioX = Math.min(1, Math.max(0, ratioX));
    const clampedRatioY = Math.min(1, Math.max(0, ratioY));
    const nextWidth = zoomWheelState.baseWidth * nextScale;
    const nextHeight = zoomWheelState.baseHeight * nextScale;

    let nextLeft = clientX - clampedRatioX * nextWidth;
    let nextTop = clientY - clampedRatioY * nextHeight;

    if (Math.abs(nextScale - zoomWheelState.baseScale) < 0.001) {
      nextLeft = zoomWheelState.openedLeft;
      nextTop = zoomWheelState.openedTop;
    }

    zoomWheelState.scale = nextScale;
    zoomWheelState.left = nextLeft;
    zoomWheelState.top = nextTop;
    zoomWheelState.width = Math.abs(nextScale - zoomWheelState.baseScale) < 0.001
      ? zoomWheelState.openedWidth
      : nextWidth;
    zoomWheelState.height = Math.abs(nextScale - zoomWheelState.baseScale) < 0.001
      ? zoomWheelState.openedHeight
      : nextHeight;

    applyWheelZoomTransition(true);
    syncWheelZoomTransforms();
    scheduleWheelZoomTransitionReset();
  }

  function resetDragState() {
    zoomDragState = null;
    setOpenedZoomCursor(isWheelZoomActive() ? "grab" : "");
  }

  function handleZoomPointerDown(event) {
    if (!isWheelZoomActive()) return;

    const target = event.target;

    if (!(target instanceof Element)) return;
    if (!target.closest(".medium-zoom-image--opened")) return;

    event.preventDefault();

    clearZoomWheelSettle();
    setOpenedZoomTransition("none");

    zoomDragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: zoomWheelState.left,
      startTop: zoomWheelState.top,
      moved: false,
    };

    suppressZoomClick = false;
    setOpenedZoomCursor("grabbing");
  }

  function handleZoomPointerMove(event) {
    if (!zoomDragState || !zoomWheelState) return;
    if (event.pointerId !== zoomDragState.pointerId) return;

    event.preventDefault();

    const deltaX = event.clientX - zoomDragState.startX;
    const deltaY = event.clientY - zoomDragState.startY;

    if (!zoomDragState.moved && Math.hypot(deltaX, deltaY) >= 3) {
      zoomDragState.moved = true;
      suppressZoomClick = true;
    }

    zoomWheelState.left = zoomDragState.startLeft + deltaX;
    zoomWheelState.top = zoomDragState.startTop + deltaY;

    syncWheelZoomTransforms();
  }

  function handleZoomPointerEnd(event) {
    if (!zoomDragState) return;
    if (event.pointerId !== zoomDragState.pointerId) return;

    event.preventDefault();
    setOpenedZoomTransition(null);
    resetDragState();
  }

  function handleZoomClickCapture(event) {
    if (!suppressZoomClick) return;

    const target = event.target;

    if (!(target instanceof Element)) return;
    if (!target.closest(".medium-zoom-image--opened")) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    suppressZoomClick = false;
  }

  function shouldIgnoreZoomKeyEvent(event) {
    if (event.defaultPrevented) return true;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return true;

    const target = event.target;

    if (!(target instanceof Element)) return false;

    return !!target.closest("input, textarea, select, [contenteditable=\"true\"]");
  }

  function navigateZoom(zoom, direction) {
    if (isZoomNavigating) return;

    const currentImage = zoom.getZoomedImage();

    if (!(currentImage instanceof HTMLImageElement)) return;

    const sequence = getZoomSequenceImages();
    const currentIndex = sequence.indexOf(currentImage);

    if (currentIndex === -1 || sequence.length < 2) return;

    const nextIndex = (currentIndex + direction + sequence.length) % sequence.length;
    const nextImage = sequence[nextIndex];

    if (!(nextImage instanceof HTMLImageElement) || nextImage === currentImage) return;

    isZoomNavigating = true;
    suppressZoomClick = false;
    resetDragState();
    resetWheelZoomState();

    Promise.resolve(typeof zoom.swap === "function"
      ? zoom.swap({ target: nextImage })
      : zoom.close().then(() => zoom.open({ target: nextImage })))
      .finally(() => {
        isZoomNavigating = false;
      });
  }

  function handleZoomKeyDown(event, zoom) {
    if (shouldIgnoreZoomKeyEvent(event)) return;
    if (!(zoom.getZoomedImage() instanceof HTMLImageElement)) return;

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      navigateZoom(zoom, -1);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      navigateZoom(zoom, 1);
    }
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

    const images = document.querySelectorAll(ALL_ZOOM_SELECTOR);

    if (!images.length) return;

    const zoom = mediumZoom(images, {
      margin: 10,
      background: "rgba(0, 0, 0, 0.85)",
      scrollOffset: 40,
    });

    document.addEventListener("wheel", handleWheelZoom, { passive: false });
    document.addEventListener("pointerdown", handleZoomPointerDown, { passive: false });
    document.addEventListener("pointermove", handleZoomPointerMove, { passive: false });
    document.addEventListener("pointerup", handleZoomPointerEnd, { passive: false });
    document.addEventListener("pointercancel", handleZoomPointerEnd, { passive: false });
    document.addEventListener("click", handleZoomClickCapture, true);
    document.addEventListener("keydown", (event) => handleZoomKeyDown(event, zoom));

    zoom.on("open", ({ target }) => {
      if (!target?.getAttribute("data-zoom-src")) {
        hideZoomLoader();
        return;
      }

      scheduleZoomLoader();
      waitForZoomImage(target);
    });

    zoom.on("opened", () => {
      initWheelZoomState();
      syncWheelZoomTransforms();
      setOpenedZoomCursor(isWheelZoomActive() ? "grab" : "");
    });

    zoom.on("close", () => {
      resetDragState();
      resetWheelZoomState();
    });
    zoom.on("close", hideZoomLoader);
    zoom.on("closed", () => {
      resetDragState();
      resetWheelZoomState();
      hideZoomLoader();
    });
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

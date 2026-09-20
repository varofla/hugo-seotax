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
  const WHEEL_ZOOM_EPSILON = 0.001;
  const WHEEL_ZOOM_STEP_INTENSITY = 0.06;
  const WHEEL_ZOOM_MAX_SCALE_MULTIPLIER = 4;
  const WHEEL_ZOOM_TRANSITION_RESET_DELAY_MS = 120;
  const WHEEL_ZOOM_TRANSITION_OVERRIDE = "none";

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

  function isWheelZoomAtBaseScale(scale = zoomWheelState?.scale ?? 0) {
    if (!zoomWheelState) return true;

    return Math.abs(scale - zoomWheelState.baseScale) < WHEEL_ZOOM_EPSILON;
  }

  function isWheelZoomActive() {
    return !!zoomWheelState && !isWheelZoomAtBaseScale();
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
      syncWheelZoomFrame();

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

  function forEachOpenedZoomImage(callback) {
    getOpenedZoomImages().forEach((img) => {
      if (!(img instanceof HTMLElement)) return;

      callback(img);
    });
  }

  function getZoomSequenceImages() {
    const coverImages = Array.from(document.querySelectorAll(TOC_ZOOM_SELECTOR));
    const contentImages = Array.from(document.querySelectorAll(CONTENT_ZOOM_SELECTOR));

    return [...new Set([...coverImages, ...contentImages])];
  }

  function setOpenedZoomCursor(cursor) {
    forEachOpenedZoomImage((img) => {
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

  function syncWheelZoomStateFromRect(img) {
    if (!zoomWheelState) return null;
    if (!(img instanceof HTMLElement)) return null;

    const rect = img.getBoundingClientRect();

    if (!rect.width || !rect.height) return null;
    Object.assign(zoomWheelState, {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    });

    return rect;
  }

  function isRoundedImage(img) {
    return img instanceof HTMLElement && img.classList.contains("rounded");
  }

  function getImageBorderRadius(img) {
    if (!isRoundedImage(img)) return 0;

    const radius = Number.parseFloat(window.getComputedStyle(img).borderTopLeftRadius);

    return Number.isFinite(radius) ? radius : 0;
  }

  function setOpenedZoomBorderRadius(radius) {
    forEachOpenedZoomImage((img) => {
      if (!isRoundedImage(img)) return;
      if (Number.isFinite(radius) && radius > 0) {
        img.style.setProperty("--medium-zoom-border-radius", `${radius}px`);
      } else {
        img.style.removeProperty("--medium-zoom-border-radius");
      }
    });
  }

  function getMaxWheelZoomScale() {
    if (!zoomWheelState) return 4;

    let maxScale = zoomWheelState.baseScale * WHEEL_ZOOM_MAX_SCALE_MULTIPLIER;

    forEachOpenedZoomImage((img) => {
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
    forEachOpenedZoomImage((img) => {
      if (value) {
        img.style.setProperty("transition", value, "important");
      } else {
        img.style.removeProperty("transition");
      }
    });
  }

  function setWheelZoomTransitionOverride(enabled) {
    setOpenedZoomTransition(enabled ? WHEEL_ZOOM_TRANSITION_OVERRIDE : null);
  }

  function scheduleWheelZoomTransitionCleanup() {
    clearZoomWheelSettle();

    zoomWheelSettleTimer = window.setTimeout(() => {
      setWheelZoomTransitionOverride(false);
      zoomWheelSettleTimer = null;
    }, WHEEL_ZOOM_TRANSITION_RESET_DELAY_MS);
  }

  function getWheelZoomFrame() {
    if (!zoomWheelState) return null;

    if (isWheelZoomAtBaseScale()) {
      return {
        left: zoomWheelState.baseDocLeft,
        top: zoomWheelState.baseDocTop,
        width: zoomWheelState.baseWidth,
        height: zoomWheelState.baseHeight,
      };
    }

    return {
      left: zoomWheelState.left + window.pageXOffset,
      top: zoomWheelState.top + window.pageYOffset,
      width: zoomWheelState.width,
      height: zoomWheelState.height,
    };
  }

  function syncOpenedZoomBorderRadius() {
    if (!zoomWheelState || zoomWheelState.baseBorderRadius <= 0 || zoomWheelState.baseWidth <= 0) {
      setOpenedZoomBorderRadius(0);
      return;
    }

    setOpenedZoomBorderRadius(
      zoomWheelState.baseBorderRadius * (zoomWheelState.width / zoomWheelState.baseWidth)
    );
  }

  function syncWheelZoomFrame() {
    const frame = getWheelZoomFrame();

    if (!frame || !zoomWheelState) return;

    forEachOpenedZoomImage((img) => {
      img.style.left = `${frame.left}px`;
      img.style.top = `${frame.top}px`;
      img.style.width = `${frame.width}px`;
      img.style.height = `${frame.height}px`;
      img.style.transform = zoomWheelState.baseTransform;
    });

    syncOpenedZoomBorderRadius();
  }

  function resetWheelZoomState() {
    clearZoomWheelSettle();
    setWheelZoomTransitionOverride(false);
    setOpenedZoomCursor("");
    zoomWheelState = null;
  }

  function createWheelZoomState(openedImage, rect, matrix, styleLeft, styleTop, styleWidth, styleHeight) {
    return {
      baseTransform: openedImage.style.transform,
      baseScale: matrix.a,
      scale: matrix.a,
      baseDocLeft: styleLeft,
      baseDocTop: styleTop,
      baseBorderRadius: getImageBorderRadius(openedImage),
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

    zoomWheelState = createWheelZoomState(
      openedImage,
      rect,
      matrix,
      styleLeft,
      styleTop,
      styleWidth,
      styleHeight
    );
  }

  function getNextWheelZoomScale(deltaY) {
    if (!zoomWheelState) return 0;

    const intensity = Math.exp((-deltaY / 100) * WHEEL_ZOOM_STEP_INTENSITY);

    return Math.min(
      getMaxWheelZoomScale(),
      Math.max(zoomWheelState.baseScale, zoomWheelState.scale * intensity)
    );
  }

  function updateWheelZoomTarget(nextScale, clientX, clientY, currentRect) {
    if (!zoomWheelState) return;

    const currentWidth = currentRect.width;
    const currentHeight = currentRect.height;

    if (!currentWidth || !currentHeight) return;

    const ratioX = (clientX - currentRect.left) / currentWidth;
    const ratioY = (clientY - currentRect.top) / currentHeight;
    const clampedRatioX = Math.min(1, Math.max(0, ratioX));
    const clampedRatioY = Math.min(1, Math.max(0, ratioY));
    const nextWidth = zoomWheelState.baseWidth * nextScale;
    const nextHeight = zoomWheelState.baseHeight * nextScale;
    const resetToBaseScale = isWheelZoomAtBaseScale(nextScale);

    zoomWheelState.scale = nextScale;
    zoomWheelState.left = resetToBaseScale
      ? zoomWheelState.openedLeft
      : clientX - clampedRatioX * nextWidth;
    zoomWheelState.top = resetToBaseScale
      ? zoomWheelState.openedTop
      : clientY - clampedRatioY * nextHeight;
    zoomWheelState.width = resetToBaseScale ? zoomWheelState.openedWidth : nextWidth;
    zoomWheelState.height = resetToBaseScale ? zoomWheelState.openedHeight : nextHeight;
  }

  function handleWheelZoom(event) {
    if (!zoomWheelState) return;

    const anchorImage = getZoomAnchorImage(event);

    if (!anchorImage) return;

    event.preventDefault();
    clearZoomWheelSettle();

    const currentRect = syncWheelZoomStateFromRect(anchorImage);

    if (!currentRect) return;

    const nextScale = getNextWheelZoomScale(event.deltaY);

    if (!Number.isFinite(nextScale) || nextScale === zoomWheelState.scale) return;

    const { clientX, clientY } = event;
    setWheelZoomTransitionOverride(true);
    updateWheelZoomTarget(nextScale, clientX, clientY, currentRect);
    syncWheelZoomFrame();
    scheduleWheelZoomTransitionCleanup();
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

    syncWheelZoomStateFromRect(target);

    clearZoomWheelSettle();
    setWheelZoomTransitionOverride(true);

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

    syncWheelZoomFrame();
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
      syncWheelZoomFrame();
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

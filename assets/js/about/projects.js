(function () {
  "use strict";

  const previewStates = new WeakMap();
  const mobileProjectMedia = window.matchMedia("(max-width: 40rem)");

  function restorePreview(project) {
    const state = previewStates.get(project);
    if (!state) return;

    state.requestId += 1;
    state.activePhoto = null;
    state.shownSrc = "";
    state.previewLayers.forEach((layer) => layer.classList.remove("is-visible"));
    state.activeLayer = null;
    state.heroPhoto.classList.remove("is-previewing");
  }

  function settleActiveLayer(state) {
    if (!state.activeLayer) return;

    state.activeLayer.style.transition = "none";
    state.activeLayer.classList.add("is-visible");
    state.activeLayer.getBoundingClientRect();
    state.activeLayer.style.removeProperty("transition");

    state.previewLayers.forEach((layer) => {
      if (layer !== state.activeLayer) layer.classList.remove("is-visible");
    });
  }

  function showPreview(project, photo) {
    const state = previewStates.get(project);
    const previewSrc = photo.dataset.projectPreviewSrc;

    if (!state || !previewSrc) return;

    state.activePhoto = photo;
    if (state.shownSrc === previewSrc && state.activeLayer) return;

    const requestId = ++state.requestId;
    const preload = new Image();

    preload.onload = () => {
      if (state.requestId !== requestId || state.activePhoto !== photo) return;

      settleActiveLayer(state);

      const previousLayer = state.activeLayer;
      const nextLayer = previousLayer === state.previewLayers[0]
        ? state.previewLayers[1]
        : state.previewLayers[0];

      nextLayer.classList.remove("is-visible");
      nextLayer.src = previewSrc;
      nextLayer.style.zIndex = "2";
      if (previousLayer) previousLayer.style.zIndex = "1";

      // Flush the hidden state so cached images still transition.
      nextLayer.getBoundingClientRect();
      nextLayer.classList.add("is-visible");

      state.activeLayer = nextLayer;
      state.shownSrc = previewSrc;
      state.heroPhoto.classList.add("is-previewing");

      if (previousLayer) {
        let finished = false;
        const finishTransition = () => {
          if (finished) return;
          finished = true;
          if (state.activeLayer === nextLayer) {
            previousLayer.classList.remove("is-visible");
          }
        };

        nextLayer.addEventListener("transitionend", finishTransition, { once: true });
        window.setTimeout(finishTransition, 320);
      }
    };

    preload.src = previewSrc;
  }

  function markSelectedPhoto(project, photo) {
    const state = previewStates.get(project);
    if (!state) return;

    state.photos.forEach((candidate) => {
      const isSelected = candidate === photo;
      candidate.classList.toggle("is-selected", isSelected);
      candidate.setAttribute("aria-pressed", String(isSelected));
    });
  }

  function activateMobilePhoto(project, photo) {
    if (!mobileProjectMedia.matches) return;

    markSelectedPhoto(project, photo);
    showPreview(project, photo);
  }

  function resetToOriginal(project) {
    markSelectedPhoto(project, null);
    restorePreview(project);
  }

  function initGalleryClipping(gallery, photos) {
    let animationFrame = 0;

    const updateClipping = () => {
      animationFrame = 0;

      const galleryRect = gallery.getBoundingClientRect();
      const galleryStyle = window.getComputedStyle(gallery);
      const paddingTop = parseFloat(galleryStyle.paddingTop) || 0;
      const paddingRight = parseFloat(galleryStyle.paddingRight) || 0;
      const paddingBottom = parseFloat(galleryStyle.paddingBottom) || 0;
      const paddingLeft = parseFloat(galleryStyle.paddingLeft) || 0;
      const viewportTop = galleryRect.top + gallery.clientTop + paddingTop;
      const viewportRight = galleryRect.left + gallery.clientLeft
        + gallery.clientWidth - paddingRight;
      const viewportBottom = galleryRect.top + gallery.clientTop
        + gallery.clientHeight - paddingBottom;
      const viewportLeft = galleryRect.left + gallery.clientLeft + paddingLeft;

      photos.forEach((photo) => {
        const photoRect = photo.getBoundingClientRect();
        const intersectsViewport = photoRect.right > viewportLeft
          && photoRect.left < viewportRight
          && photoRect.bottom > viewportTop
          && photoRect.top < viewportBottom;

        if (!intersectsViewport) {
          photo.style.removeProperty("clip-path");
          return;
        }

        const top = Math.max(0, viewportTop - photoRect.top);
        const right = Math.max(0, photoRect.right - viewportRight);
        const bottom = Math.max(0, photoRect.bottom - viewportBottom);
        const left = Math.max(0, viewportLeft - photoRect.left);
        const isClipped = top > 0.5 || right > 0.5 || bottom > 0.5 || left > 0.5;

        if (isClipped) {
          photo.style.clipPath = `inset(${top.toFixed(2)}px ${right.toFixed(2)}px ${bottom.toFixed(2)}px ${left.toFixed(2)}px round 8px)`;
        } else {
          photo.style.removeProperty("clip-path");
        }
      });
    };

    const scheduleClippingUpdate = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(updateClipping);
    };

    gallery.addEventListener("scroll", scheduleClippingUpdate, { passive: true });
    window.addEventListener("resize", scheduleClippingUpdate, { passive: true });

    if ("ResizeObserver" in window) {
      const resizeObserver = new ResizeObserver(scheduleClippingUpdate);
      resizeObserver.observe(gallery);
      const images = gallery.querySelector(".about-project-gallery__images");
      if (images) resizeObserver.observe(images);
    }

    scheduleClippingUpdate();
  }

  function initProject(project) {
    const heroPhoto = project.querySelector(".about-project-photo--hero");
    const heroImage = heroPhoto?.querySelector(":scope > img");
    const gallery = project.querySelector(".about-project-gallery");

    if (!(heroPhoto instanceof HTMLElement)
      || !(heroImage instanceof HTMLImageElement)
      || !(gallery instanceof HTMLElement)) return;

    const previewLayers = [document.createElement("img"), document.createElement("img")];
    previewLayers.forEach((layer) => {
      layer.className = "about-project-photo__preview";
      layer.alt = "";
      layer.setAttribute("aria-hidden", "true");
      layer.decoding = "async";
      heroPhoto.appendChild(layer);
    });

    const photos = [...gallery.querySelectorAll("[data-project-preview-src]")];

    initGalleryClipping(gallery, photos);

    previewStates.set(project, {
      heroPhoto,
      previewLayers,
      photos,
      activeLayer: null,
      activePhoto: null,
      shownSrc: "",
      requestId: 0,
    });

    photos.forEach((photo) => {
      photo.addEventListener("focus", () => {
        if (mobileProjectMedia.matches) {
          activateMobilePhoto(project, photo);
        } else if (photo.dataset.projectPreviewSrc) {
          showPreview(project, photo);
        }
      });
      photo.addEventListener("click", () => activateMobilePhoto(project, photo));
      photo.addEventListener("pointerenter", (event) => {
        if (event.pointerType === "mouse" && photo.dataset.projectPreviewSrc) {
          showPreview(project, photo);
        }
      });
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      const clickedThumbnail = target instanceof Element
        && target.closest(".about-project-photo--thumbnail");
      if (mobileProjectMedia.matches && !clickedThumbnail) {
        resetToOriginal(project);
      }
    });

    gallery.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "mouse" && !mobileProjectMedia.matches) {
        restorePreview(project);
      }
    });
    gallery.addEventListener("focusout", (event) => {
      if (!mobileProjectMedia.matches
        && (!(event.relatedTarget instanceof Node) || !gallery.contains(event.relatedTarget))) {
        restorePreview(project);
      }
    });

    mobileProjectMedia.addEventListener("change", (event) => {
      if (!event.matches) {
        resetToOriginal(project);
      }
    });
  }

  function init() {
    document.querySelectorAll("[data-about-project]").forEach(initProject);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

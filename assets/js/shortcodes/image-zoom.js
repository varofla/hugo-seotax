(function () {
  "use strict";

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

    mediumZoom(images, {
      margin: 10,
      background: "rgba(0, 0, 0, 0.85)",
      scrollOffset: 40,
    });
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
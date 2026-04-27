(function() {
  'use strict';

  function setupNoticeTrack(track) {
    if (!track || track.dataset.marqueeReady === 'true') {
      return;
    }

    const sourceGroup = track.querySelector('.menu-panel-notice-group');
    if (!sourceGroup) {
      return;
    }

    const clone = sourceGroup.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);
    track.dataset.marqueeReady = 'true';
  }

  function initMenuNoticeMarquee() {
    document.querySelectorAll('[data-menu-notice-track]').forEach(setupNoticeTrack);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMenuNoticeMarquee, { once: true });
  } else {
    initMenuNoticeMarquee();
  }
})();

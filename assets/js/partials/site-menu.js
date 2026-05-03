(function() {
  'use strict';

  const STORAGE_KEY = 'siteMenu.scrollTop';
  const SELECTORS = {
    menu: '[data-site-menu]',
    menuControl: '#menu-control',
    menuScrollRegion: '[data-menu-scroll-region]',
    menuToggle: '[data-menu-toggle]',
    menuDismiss: '[data-menu-dismiss]',
    noticeTrack: '[data-menu-notice-track]',
    noticeGroup: '.site-menu-notice__group',
    noticeClone: '[data-menu-notice-clone]',
  };

  let pageScrollTop = 0;

  function getMenuControl() {
    return document.querySelector(SELECTORS.menuControl);
  }

  function getMenuElement() {
    return document.querySelector(SELECTORS.menu);
  }

  function getMenuScrollRegion() {
    return document.querySelector(SELECTORS.menuScrollRegion);
  }

  function getMenuBreakpointValue() {
    return getComputedStyle(document.documentElement)
      .getPropertyValue('--menu-breakpoint')
      .trim() || '77.4rem';
  }

  function isMobileViewport() {
    return window.matchMedia(`(max-width: ${getMenuBreakpointValue()})`).matches;
  }

  function rememberPageScroll() {
    pageScrollTop = window.pageYOffset || document.documentElement.scrollTop || 0;
  }

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function restorePageScroll() {
    window.requestAnimationFrame(() => {
      window.scrollTo(0, pageScrollTop);
    });
  }

  function setMenuOpen(nextState) {
    const menuControl = getMenuControl();
    if (!menuControl || !isMobileViewport()) {
      return;
    }

    rememberPageScroll();
    menuControl.checked = Boolean(nextState);
    restorePageScroll();
  }

  function toggleMenu() {
    const menuControl = getMenuControl();
    if (!menuControl || !isMobileViewport()) {
      return;
    }

    setMenuOpen(!menuControl.checked);
  }

  function persistMenuScroll() {
    const menuScrollRegion = getMenuScrollRegion();
    if (!menuScrollRegion) {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, String(menuScrollRegion.scrollTop));
    } catch (error) {
      // Ignore storage failures such as private browsing restrictions.
    }
  }

  function restoreMenuScroll() {
    const menuScrollRegion = getMenuScrollRegion();
    if (!menuScrollRegion) {
      return;
    }

    try {
      const savedScrollTop = window.localStorage.getItem(STORAGE_KEY);
      if (savedScrollTop === null) {
        return;
      }

      menuScrollRegion.scrollTop = Number(savedScrollTop) || 0;
    } catch (error) {
      // Ignore storage failures such as private browsing restrictions.
    }
  }

  function syncNoticeTrack(track) {
    if (!track) {
      return;
    }

    track.querySelectorAll(SELECTORS.noticeClone).forEach((clone) => clone.remove());
    track.classList.remove('is-animated');

    const sourceGroup = track.querySelector(SELECTORS.noticeGroup);
    const viewport = track.parentElement;
    if (!sourceGroup || !viewport) {
      return;
    }

    if (prefersReducedMotion() || sourceGroup.scrollWidth <= viewport.clientWidth) {
      return;
    }

    const clone = sourceGroup.cloneNode(true);
    clone.dataset.menuNoticeClone = 'true';
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);
    track.classList.add('is-animated');
  }

  function syncNoticeTracks() {
    document.querySelectorAll(SELECTORS.noticeTrack).forEach(syncNoticeTrack);
  }

  function bindMenuToggleEvents() {
    document.querySelectorAll(SELECTORS.menuToggle).forEach((toggle) => {
      toggle.addEventListener('click', (event) => {
        event.preventDefault();
        toggleMenu();
      });
    });

    document.querySelectorAll(SELECTORS.menuDismiss).forEach((dismiss) => {
      dismiss.addEventListener('click', (event) => {
        event.preventDefault();
        setMenuOpen(false);
      });
    });

    document.addEventListener('click', (event) => {
      const menuControl = getMenuControl();
      const menuElement = getMenuElement();
      if (!menuControl || !menuControl.checked || !isMobileViewport()) {
        return;
      }

      if (event.target.closest(SELECTORS.menuToggle) || event.target.closest(SELECTORS.menuDismiss)) {
        return;
      }

      if (menuElement && menuElement.contains(event.target)) {
        return;
      }

      setMenuOpen(false);
    });

    document.addEventListener('keydown', (event) => {
      const menuControl = getMenuControl();
      if (!menuControl || !menuControl.checked || !isMobileViewport()) {
        return;
      }

      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    });
  }

  function bindMenuScrollPersistence() {
    const menuScrollRegion = getMenuScrollRegion();
    if (!menuScrollRegion) {
      return;
    }

    restoreMenuScroll();
    menuScrollRegion.addEventListener('scroll', persistMenuScroll, { passive: true });
    window.addEventListener('pagehide', persistMenuScroll);
  }

  function bindResizeHandler() {
    let resizeTimer;

    window.addEventListener('resize', () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        const menuControl = getMenuControl();
        if (menuControl && !isMobileViewport()) {
          menuControl.checked = false;
        }

        syncNoticeTracks();
      }, 150);
    });
  }

  function initSiteMenu() {
    if (!getMenuElement()) {
      return;
    }

    bindMenuToggleEvents();
    bindMenuScrollPersistence();
    bindResizeHandler();
    syncNoticeTracks();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSiteMenu, { once: true });
  } else {
    initSiteMenu();
  }
})();

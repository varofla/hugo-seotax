(function() {
  'use strict';

  const STORAGE_KEY = 'siteMenu.scrollTop';
  const POST_VIEW_SCROLL_STORAGE_KEY = 'postView.mainWrapScrollTop';
  const POST_VIEW_RELOAD_RESTORING_CLASS = 'post-view-reload-restoring';
  const POST_VIEW_RELOAD_REVEALING_CLASS = 'post-view-reload-revealing';
  const SELECTORS = {
    menu: '[data-site-menu]',
    menuControl: '#menu-control',
    menuScrollRegion: '[data-menu-scroll-region]',
    mainWrap: '.main-wrap',
    menuToggle: '[data-menu-toggle]',
    menuDismiss: '[data-menu-dismiss]',
    noticeTrack: '[data-menu-notice-track]',
    noticeGroup: '.site-menu-notice__group',
    noticeClone: '[data-menu-notice-clone]',
  };

  let pageScrollTop = 0;
  let activeMenuTrigger = null;

  function getMenuControl() {
    return document.querySelector(SELECTORS.menuControl);
  }

  function getMenuElement() {
    return document.querySelector(SELECTORS.menu);
  }

  function getMenuScrollRegion() {
    return document.querySelector(SELECTORS.menuScrollRegion);
  }

  function getMainWrap() {
    return document.querySelector(SELECTORS.mainWrap);
  }

  function isPostViewPage() {
    return document.body?.classList.contains('site-kind-page')
      && document.body?.classList.contains('site-type-posts');
  }

  function usesMainWrapScroll() {
    const mainWrap = getMainWrap();
    if (!mainWrap) {
      return false;
    }

    return ['auto', 'scroll'].includes(window.getComputedStyle(mainWrap).overflowY);
  }

  function getPostViewScrollStorageKey() {
    return `${POST_VIEW_SCROLL_STORAGE_KEY}:${window.location.pathname}`;
  }

  function getNavigationType() {
    const navigationEntry = window.performance?.getEntriesByType?.('navigation')?.[0];
    return navigationEntry?.type || 'navigate';
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

  function syncMenuA11y(isOpen) {
    const menuElement = getMenuElement();
    const isMobile = isMobileViewport();

    document.querySelectorAll(SELECTORS.menuToggle).forEach((toggle) => {
      toggle.setAttribute('aria-expanded', String(isMobile && isOpen));
      toggle.setAttribute('aria-label', isMobile && isOpen ? '메뉴 닫기' : '메뉴 열기');
      toggle.setAttribute('title', isMobile && isOpen ? '메뉴 닫기' : '메뉴 열기');
    });

    if (menuElement) {
      menuElement.setAttribute('aria-hidden', String(isMobile && !isOpen));
      menuElement.inert = isMobile && !isOpen;
    }

    document.body.classList.toggle('mobile-menu-open', isMobile && isOpen);
  }

  function setMenuOpen(nextState, options = {}) {
    const menuControl = getMenuControl();
    if (!menuControl || !isMobileViewport()) {
      return;
    }

    const wasOpen = menuControl.checked;
    rememberPageScroll();
    menuControl.checked = Boolean(nextState);
    syncMenuA11y(menuControl.checked);
    restorePageScroll();

    if (menuControl.checked) {
      activeMenuTrigger = options.trigger || document.activeElement;
      document.dispatchEvent(new CustomEvent('mobile:panel-open', {
        detail: { panel: 'menu' }
      }));

      window.requestAnimationFrame(() => {
        getMenuElement()?.focus({ preventScroll: true });
      });
    } else if (wasOpen) {
      if (options.restoreFocus !== false) {
        activeMenuTrigger?.focus?.({ preventScroll: true });
      }
      activeMenuTrigger = null;
    }
  }

  function toggleMenu() {
    const menuControl = getMenuControl();
    if (!menuControl || !isMobileViewport()) {
      return;
    }

    setMenuOpen(!menuControl.checked, { trigger: document.activeElement });
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

  function persistPostViewScroll() {
    if (!isPostViewPage() || !usesMainWrapScroll()) {
      return;
    }

    const mainWrap = getMainWrap();
    if (!mainWrap) {
      return;
    }

    try {
      window.sessionStorage.setItem(getPostViewScrollStorageKey(), String(mainWrap.scrollTop));
    } catch (error) {
      // Ignore storage failures such as private browsing restrictions.
    }
  }

  function restorePostViewScrollOnReload() {
    if (!isPostViewPage() || !usesMainWrapScroll()) {
      document.documentElement.classList.remove(POST_VIEW_RELOAD_RESTORING_CLASS, POST_VIEW_RELOAD_REVEALING_CLASS);
      return;
    }

    if (getNavigationType() !== 'reload') {
      document.documentElement.classList.remove(POST_VIEW_RELOAD_RESTORING_CLASS, POST_VIEW_RELOAD_REVEALING_CLASS);
      return;
    }

    let savedScrollTop;

    try {
      savedScrollTop = window.sessionStorage.getItem(getPostViewScrollStorageKey());
    } catch (error) {
      document.documentElement.classList.remove(POST_VIEW_RELOAD_RESTORING_CLASS, POST_VIEW_RELOAD_REVEALING_CLASS);
      return;
    }

    if (savedScrollTop === null) {
      document.documentElement.classList.remove(POST_VIEW_RELOAD_RESTORING_CLASS, POST_VIEW_RELOAD_REVEALING_CLASS);
      return;
    }

    const nextScrollTop = Number(savedScrollTop) || 0;
    const applyScroll = () => {
      const mainWrap = getMainWrap();
      if (!mainWrap) {
        return;
      }

      mainWrap.scrollTop = nextScrollTop;
    };
    const finishRestore = () => {
      document.documentElement.classList.remove(POST_VIEW_RELOAD_RESTORING_CLASS);
      document.documentElement.classList.add(POST_VIEW_RELOAD_REVEALING_CLASS);
      window.setTimeout(() => {
        document.documentElement.classList.remove(POST_VIEW_RELOAD_REVEALING_CLASS);
      }, 220);
    };

    window.requestAnimationFrame(() => {
      applyScroll();
      window.requestAnimationFrame(() => {
        applyScroll();
        finishRestore();
      });
    });

    window.addEventListener('load', () => {
      applyScroll();
      finishRestore();
    }, { once: true });
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

    document.addEventListener('mobile:panel-open', (event) => {
      if (event.detail?.panel !== 'menu') {
        setMenuOpen(false, { restoreFocus: false });
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

  function bindPostViewScrollPersistence() {
    if (!isPostViewPage() || !usesMainWrapScroll()) {
      return;
    }

    const mainWrap = getMainWrap();
    if (!mainWrap) {
      return;
    }

    restorePostViewScrollOnReload();
    mainWrap.addEventListener('scroll', persistPostViewScroll, { passive: true });
    window.addEventListener('pagehide', persistPostViewScroll);
    window.addEventListener('beforeunload', persistPostViewScroll);
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

        syncMenuA11y(Boolean(menuControl?.checked));

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
    bindPostViewScrollPersistence();
    bindResizeHandler();
    syncMenuA11y(Boolean(getMenuControl()?.checked));
    syncNoticeTracks();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSiteMenu, { once: true });
  } else {
    initSiteMenu();
  }
})();

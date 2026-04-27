(function() {
  'use strict';

  const STORAGE_KEY = 'menu.scrollTop';

  function getMenuContent() {
    return document.querySelector('.site-menu .menu-content');
  }

  function restoreScrollPosition() {
    const menuContent = getMenuContent();
    if (!menuContent) return;

    const savedScrollTop = window.localStorage.getItem(STORAGE_KEY);
    if (savedScrollTop === null) return;

    menuContent.scrollTop = Number(savedScrollTop) || 0;
  }

  function persistScrollPosition() {
    const menuContent = getMenuContent();
    if (!menuContent) return;

    window.localStorage.setItem(STORAGE_KEY, String(menuContent.scrollTop));
  }

  function initMenuState() {
    restoreScrollPosition();
    window.addEventListener('beforeunload', persistScrollPosition);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMenuState, { once: true });
  } else {
    initMenuState();
  }
})();

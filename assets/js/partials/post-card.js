(function() {
  'use strict';

  const CARD_SELECTOR = '[data-post-item][data-post-item-url]';
  const INTERACTIVE_SELECTOR = 'a, button, input, select, textarea, label, summary, [role="button"]';
  const TITLE_LINK_SELECTOR = '.post-title-link';
  const LINK_SELECTOR = 'a[href]';
  const STORAGE_KEY = 'postView.enterTransition';
  const POST_VIEW_EXIT_CLASS = 'post-view-exit-pending';
  const POST_VIEW_ENTER_CLASS = 'post-view-enter-pending';
  const POST_VIEW_TYPE_CLASS = 'site-type-posts';
  const TOC_DESKTOP_MEDIA_QUERY = '(min-width: 1255px)';
  const EXIT_TRANSITION_DURATION = 220;
  const RETURN_TRANSITION_TTL = 10000;
  const HISTORY_BASE_FLAG = '__postViewHistoryBase';
  const HISTORY_TRAP_FLAG = '__postViewHistoryTrap';
  const HISTORY_PREV_POST_FLAG = '__postViewPreviousIsPost';
  let hasBoundHistoryPopState = false;

  function normalizePath(path) {
    const normalized = (path || '/').replace(/\/+$/, '');
    return normalized || '/';
  }

  function isModifiedEvent(event) {
    return event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
  }

  function isDesktopTocViewport() {
    return window.matchMedia(TOC_DESKTOP_MEDIA_QUERY).matches;
  }

  function normalizeTransitionPath(pathname) {
    return normalizePath(pathname || window.location.pathname);
  }

  function isPostViewPage() {
    return document.body?.classList.contains(POST_VIEW_TYPE_CLASS);
  }

  function cloneHistoryState(state) {
    return state && typeof state === 'object' ? { ...state } : {};
  }

  function getPostsSectionRoot() {
    return normalizePath(window.sitePostViewConfig?.postsSectionRoot || '/');
  }

  function isSameOrigin(url) {
    return url.origin === window.location.origin;
  }

  function parseUrl(href) {
    try {
      return new URL(href, window.location.href);
    } catch (error) {
      return null;
    }
  }

  function isHashOnlyNavigation(url) {
    return normalizePath(url.pathname) === normalizePath(window.location.pathname) && Boolean(url.hash);
  }

  function isNonHttpNavigation(href) {
    return /^(mailto:|tel:|javascript:)/i.test(href);
  }

  function isPostDestination(url) {
    const destinationPath = normalizePath(url.pathname);
    const postsSectionRoot = getPostsSectionRoot();

    if (destinationPath === postsSectionRoot) {
      return false;
    }

    return destinationPath.startsWith(postsSectionRoot + '/');
  }

  function detectPreviousHistoryIsPost() {
    if (!document.referrer) {
      return false;
    }

    const referrerUrl = parseUrl(document.referrer);
    if (!referrerUrl || !isSameOrigin(referrerUrl)) {
      return false;
    }

    return isPostDestination(referrerUrl);
  }

  function readPendingPostTransition() {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }

      const data = JSON.parse(raw);
      if (!data || !data.pathname || !data.source) {
        return null;
      }

      if (data.expiresAt && Date.now() > data.expiresAt) {
        window.sessionStorage.removeItem(STORAGE_KEY);
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  }

  function clearPendingPostTransition() {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      // Ignore storage cleanup failures.
    }
  }

  function writePendingPostTransition(source, pathname) {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        pathname: normalizeTransitionPath(pathname),
        source,
        expiresAt: Date.now() + RETURN_TRANSITION_TTL
      }));
    } catch (error) {
      // Ignore storage failures.
    }
  }

  function canAnimatePostExit() {
    if (!isPostViewPage()) {
      return false;
    }

    if (!isDesktopTocViewport() || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return false;
    }

    const tocPanel = document.querySelector('.site-toc');
    const siteMenu = document.querySelector('.site-menu');
    return Boolean(tocPanel && siteMenu);
  }

  function shouldAnimatePostExit(anchor, href) {
    if (!isPostViewPage() || !href) {
      return false;
    }

    if (!canAnimatePostExit()) {
      return false;
    }

    if (anchor.target && anchor.target.toLowerCase() !== '_self') {
      return false;
    }

    if (anchor.hasAttribute('download') || anchor.getAttribute('data-no-post-exit-transition') !== null) {
      return false;
    }

    if (isNonHttpNavigation(href)) {
      return false;
    }

    let url;
    url = parseUrl(href);
    if (!url) {
      return false;
    }

    if (!isSameOrigin(url) || isHashOnlyNavigation(url) || isPostDestination(url)) {
      return false;
    }

    return true;
  }

  function shouldPreparePostEntry(anchor, href) {
    if (!href || isPostViewPage()) {
      return false;
    }

    if (anchor.target && anchor.target.toLowerCase() !== '_self') {
      return false;
    }

    if (anchor.hasAttribute('download')) {
      return false;
    }

    if (isNonHttpNavigation(href)) {
      return false;
    }

    const url = parseUrl(href);
    if (!url) {
      return false;
    }

    if (!isSameOrigin(url) || isHashOnlyNavigation(url)) {
      return false;
    }

    return isPostDestination(url);
  }

  function continueHistoryBack() {
    window.setTimeout(() => {
      window.history.back();
    }, 0);
  }

  function bindPostHistoryPopState() {
    if (hasBoundHistoryPopState) {
      return;
    }

    window.addEventListener('popstate', handlePostHistoryPopState);
    hasBoundHistoryPopState = true;
  }

  function triggerPostExitTransition(onComplete) {
    const root = document.documentElement;

    if (root.classList.contains(POST_VIEW_EXIT_CLASS)) {
      return;
    }

    root.classList.add(POST_VIEW_EXIT_CLASS);

    window.setTimeout(() => {
      onComplete();
    }, EXIT_TRANSITION_DURATION);
  }

  function handlePostHistoryPopState(event) {
    if (!isPostViewPage()) {
      return;
    }

    if (!event.state || !event.state[HISTORY_BASE_FLAG]) {
      return;
    }

    if (event.state[HISTORY_PREV_POST_FLAG]) {
      continueHistoryBack();
      return;
    }

    writePendingPostTransition('post-return');

    if (canAnimatePostExit()) {
      triggerPostExitTransition(continueHistoryBack);
      return;
    }

    continueHistoryBack();
  }

  function setupPostHistoryExitTrap() {
    if (!isPostViewPage() || !window.history?.pushState || !window.history?.replaceState) {
      return;
    }

    if (window.history.length <= 1) {
      return;
    }

    const currentState = cloneHistoryState(window.history.state);
    if (currentState[HISTORY_TRAP_FLAG]) {
      bindPostHistoryPopState();
      return;
    }

    const hasPreviousPostFlag = Object.prototype.hasOwnProperty.call(currentState, HISTORY_PREV_POST_FLAG);
    const previousIsPost = hasPreviousPostFlag
      ? Boolean(currentState[HISTORY_PREV_POST_FLAG])
      : detectPreviousHistoryIsPost();

    const baseState = {
      ...currentState,
      [HISTORY_BASE_FLAG]: true,
      [HISTORY_PREV_POST_FLAG]: previousIsPost
    };

    const trapState = {
      ...baseState,
      [HISTORY_TRAP_FLAG]: true
    };

    window.history.replaceState(baseState, '', window.location.href);
    window.history.pushState(trapState, '', window.location.href);
    bindPostHistoryPopState();
  }

  function persistPostViewTransition(href) {
    if (!href) {
      return;
    }

    try {
      const url = new URL(href, window.location.origin);
      writePendingPostTransition('post-card', url.pathname);
    } catch (error) {
      // Ignore invalid URLs and storage failures.
    }
  }

  function navigateToCard(card) {
    const href = card?.dataset?.postItemUrl;
    if (href) {
      persistPostViewTransition(href);
      window.location.href = href;
    }
  }

  function settlePendingPostViewTransition() {
    const root = document.documentElement;
    if (!root.classList.contains('post-view-enter-pending')) {
      return;
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        root.classList.remove('post-view-enter-pending');
      });
    });
  }

  function resetPostExitTransitionState() {
    document.documentElement.classList.remove(POST_VIEW_EXIT_CLASS);
  }

  function maybeAnimatePostReturnFromCache() {
    if (!isPostViewPage() || !canAnimatePostExit()) {
      return;
    }

    const pendingTransition = readPendingPostTransition();
    if (!pendingTransition || pendingTransition.source !== 'post-return') {
      return;
    }

    if (normalizeTransitionPath(pendingTransition.pathname) !== normalizeTransitionPath(window.location.pathname)) {
      return;
    }

    clearPendingPostTransition();

    const root = document.documentElement;
    root.classList.add(POST_VIEW_ENTER_CLASS);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        root.classList.remove(POST_VIEW_ENTER_CLASS);
      });
    });
  }

  function handlePostEntryPreparation(event) {
    const link = event.target.closest(LINK_SELECTOR);
    if (!link || isModifiedEvent(event)) {
      return;
    }

    const href = link.getAttribute('href');
    if (!shouldPreparePostEntry(link, href)) {
      return;
    }

    const url = parseUrl(href);
    if (!url) {
      return;
    }

    writePendingPostTransition('post-card', url.pathname);
  }

  function handlePostExitNavigation(event) {
    const link = event.target.closest(LINK_SELECTOR);
    if (!link || !isPostViewPage()) {
      return;
    }

    if (isModifiedEvent(event)) {
      return;
    }

    const href = link.getAttribute('href');
    if (!shouldAnimatePostExit(link, href)) {
      return;
    }

    event.preventDefault();
    writePendingPostTransition('post-return');
    triggerPostExitTransition(() => {
      window.location.href = href;
    });
  }

  document.addEventListener('click', function(event) {
    handlePostEntryPreparation(event);
    handlePostExitNavigation(event);

    const card = event.target.closest(CARD_SELECTOR);
    if (!card) {
      return;
    }

    if (isModifiedEvent(event)) {
      return;
    }

    const interactiveTarget = event.target.closest(INTERACTIVE_SELECTOR);
    if (interactiveTarget) {
      const titleLink = interactiveTarget.closest(TITLE_LINK_SELECTOR);
      if (titleLink) {
        persistPostViewTransition(titleLink.getAttribute('href'));
      }
      return;
    }

    navigateToCard(card);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      resetPostExitTransitionState();
      settlePendingPostViewTransition();
      setupPostHistoryExitTrap();
    }, { once: true });
  } else {
    resetPostExitTransitionState();
    settlePendingPostViewTransition();
    setupPostHistoryExitTrap();
  }

  window.addEventListener('pageshow', function() {
    resetPostExitTransitionState();
    maybeAnimatePostReturnFromCache();
    setupPostHistoryExitTrap();
  });
})();

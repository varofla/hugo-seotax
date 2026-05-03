(function() {
  'use strict';

  const CARD_SELECTOR = '[data-post-item][data-post-item-url]';
  const INTERACTIVE_SELECTOR = 'a, button, input, select, textarea, label, summary, [role="button"]';
  const TITLE_LINK_SELECTOR = '.post-title-link';
  const LINK_SELECTOR = 'a[href]';
  const POST_VIEW_EXIT_CLASS = 'post-view-exit-pending';
  const POST_VIEW_ENTER_CLASS = 'post-view-enter-pending';
  const POST_VIEW_TYPE_CLASS = 'site-type-posts';
  const ABOUT_VIEW_TYPE_CLASS = 'site-type-about';
  const EXIT_TRANSITION_FALLBACK = 500;
  const ENTER_TRANSITION_CLEANUP_DELAY = 600;
  const RETURN_TRANSITION_TTL = 10000;
  const HISTORY_BASE_FLAG = '__postViewHistoryBase';
  const HISTORY_TRAP_FLAG = '__postViewHistoryTrap';
  const HISTORY_PREV_POST_FLAG = '__postViewPreviousIsPost';

  const sitePostViewConfig = window.sitePostViewConfig || {};
  const transitionConfig = sitePostViewConfig.transition || {};
  const STORAGE_KEY = transitionConfig.storageKey || 'postView.enterTransition';
  const TOC_DESKTOP_MEDIA_QUERY = transitionConfig.desktopMediaQuery || '(min-width: 1255px)';
  const SUPPORTED_SOURCES = new Set(transitionConfig.supportedSources || ['post-card', 'post-return']);

  let hasBoundHistoryPopState = false;

  function normalizePath(path) {
    const normalized = (path || '/').replace(/\/+$/, '');
    return normalized || '/';
  }

  function normalizeTransitionPath(pathname) {
    return normalizePath(pathname || window.location.pathname);
  }

  function isModifiedEvent(event) {
    return event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
  }

  function isDesktopTocViewport() {
    return window.matchMedia(TOC_DESKTOP_MEDIA_QUERY).matches;
  }

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function isPostViewPage() {
    return document.body?.classList.contains(POST_VIEW_TYPE_CLASS);
  }

  function isAboutViewPage() {
    return document.body?.classList.contains(ABOUT_VIEW_TYPE_CLASS);
  }

  function isCollapsedMenuPage() {
    return isPostViewPage() || isAboutViewPage();
  }

  function isAboutDestination(url) {
    const aboutPath = normalizePath(sitePostViewConfig.aboutPath || '/about');
    return normalizePath(url.pathname) === aboutPath;
  }

  function hasMenuPanel() {
    return Boolean(document.querySelector('.site-menu'));
  }

  function hasSideTocConfigured() {
    return Boolean(sitePostViewConfig.hasSideToc);
  }

  function hasPostPanels() {
    return Boolean(document.querySelector('.site-menu') && document.querySelector('.site-toc'));
  }

  function cloneHistoryState(state) {
    return state && typeof state === 'object' ? { ...state } : {};
  }

  function getPostsSectionRoot() {
    return normalizePath(sitePostViewConfig.postsSectionRoot || '/');
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

  function getNavigationType() {
    const navigationEntry = window.performance?.getEntriesByType?.('navigation')?.[0];
    return navigationEntry?.type || 'navigate';
  }

  function shouldAnimateEntryFromReferrer() {
    if (!isCollapsedMenuPage()) {
      return false;
    }

    if (!document.referrer) {
      return false;
    }

    if (getNavigationType() !== 'navigate') {
      return false;
    }

    const referrerUrl = parseUrl(document.referrer);
    const currentUrl = parseUrl(window.location.href);
    if (!referrerUrl || !currentUrl) {
      return false;
    }

    if (!isSameOrigin(referrerUrl)) {
      return false;
    }

    if (normalizePath(referrerUrl.pathname) === normalizePath(currentUrl.pathname)) {
      return false;
    }

    if (isPostDestination(referrerUrl) || isAboutDestination(referrerUrl)) {
      return false;
    }

    return true;
  }

  function parseTransitionData(raw) {
    if (!raw) {
      return null;
    }

    try {
      const data = JSON.parse(raw);
      if (!data || !data.pathname || !SUPPORTED_SOURCES.has(data.source)) {
        return null;
      }

      if (data.expiresAt && Date.now() > data.expiresAt) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  }

  function getBootstrapTransition() {
    return parseTransitionData(transitionConfig.pendingTransition ? JSON.stringify(transitionConfig.pendingTransition) : null);
  }

  function setBootstrapTransition(data) {
    transitionConfig.pendingTransition = data || null;
    sitePostViewConfig.transition = transitionConfig;
    window.sitePostViewConfig = sitePostViewConfig;
  }

  function readStoredTransition() {
    try {
      return parseTransitionData(window.sessionStorage.getItem(STORAGE_KEY));
    } catch (error) {
      return null;
    }
  }

  function getPendingPostTransition() {
    const bootstrapped = getBootstrapTransition();
    if (bootstrapped) {
      return bootstrapped;
    }

    const stored = readStoredTransition();
    if (stored) {
      setBootstrapTransition(stored);
      return stored;
    }

    return null;
  }

  function clearPendingPostTransition() {
    setBootstrapTransition(null);

    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      // Ignore storage cleanup failures.
    }
  }

  function cachePendingPostTransition(data) {
    setBootstrapTransition(data);

    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      // Ignore storage failures.
    }
  }

  function writePendingPostTransition(source, pathname) {
    if (!SUPPORTED_SOURCES.has(source)) {
      return;
    }

    cachePendingPostTransition({
      pathname: normalizeTransitionPath(pathname),
      source,
      expiresAt: Date.now() + RETURN_TRANSITION_TTL
    });
  }

  function findMatchingPendingTransition(pathname = window.location.pathname, sources = null) {
    const data = getPendingPostTransition();
    if (!data) {
      return null;
    }

    if (sources && !sources.includes(data.source)) {
      return null;
    }

    if (normalizeTransitionPath(data.pathname) !== normalizeTransitionPath(pathname)) {
      return null;
    }

    return data;
  }

  function canAnimatePostEntry() {
    if (isAboutViewPage()) {
      return hasMenuPanel() && isDesktopTocViewport() && !prefersReducedMotion();
    }
    return isPostViewPage()
      && hasSideTocConfigured()
      && hasPostPanels()
      && isDesktopTocViewport()
      && !prefersReducedMotion();
  }

  function canAnimatePostExit() {
    if (isAboutViewPage()) {
      return hasMenuPanel() && isDesktopTocViewport() && !prefersReducedMotion();
    }
    return isPostViewPage()
      && hasPostPanels()
      && isDesktopTocViewport()
      && !prefersReducedMotion();
  }

  function shouldAnimatePostExit(anchor, href) {
    if (!isCollapsedMenuPage() || !href) {
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

    const url = parseUrl(href);
    if (!url) {
      return false;
    }

    // Don't animate if destination is also a collapsed-menu page (post or about)
    if (!isSameOrigin(url) || isHashOnlyNavigation(url) || isPostDestination(url) || isAboutDestination(url)) {
      return false;
    }

    return true;
  }

  function shouldPreparePostEntry(anchor, href) {
    if (!href || isCollapsedMenuPage()) {
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

    return isPostDestination(url) || isAboutDestination(url);
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

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      onComplete();
    };

    // Wait for the menu's width transition to complete before navigating.
    // A fixed timeout previously caused jitter on cached/fast-loading pages
    // because the new page could load before the CSS transition finished.
    const menu = document.querySelector('.site-menu');
    if (menu) {
      const onTransitionEnd = (e) => {
        if (e.propertyName === 'width') {
          menu.removeEventListener('transitionend', onTransitionEnd);
          finish();
        }
      };
      menu.addEventListener('transitionend', onTransitionEnd);
    }

    // Fallback in case transitionend never fires (e.g. element removed).
    window.setTimeout(finish, EXIT_TRANSITION_FALLBACK);
  }

  function playPostEntryTransition(options = {}) {
    const { allowReferrerFallback = true } = options;
    const pendingTransition = findMatchingPendingTransition(window.location.pathname, ['post-card', 'post-return']);
    const shouldUseReferrerFallback = allowReferrerFallback && !pendingTransition && shouldAnimateEntryFromReferrer();
    if (!pendingTransition && !shouldUseReferrerFallback) {
      return false;
    }

    if (!canAnimatePostEntry()) {
      return false;
    }

    if (pendingTransition) {
      clearPendingPostTransition();
    }

    const root = document.documentElement;

    // The inline <head> script adds this class before first paint. The CSS
    // animation starts automatically — no JS timing needed. This fallback
    // handles edge cases where the class wasn't set (e.g. bfcache restore).
    if (!root.classList.contains(POST_VIEW_ENTER_CLASS)) {
      root.classList.add(POST_VIEW_ENTER_CLASS);
    }

    // Remove the class after the animation finishes. This is cleanup only:
    // the animation's final state matches the base CSS, so there is no
    // visual change when the class is removed.
    setTimeout(() => {
      root.classList.remove(POST_VIEW_ENTER_CLASS);
    }, ENTER_TRANSITION_CLEANUP_DELAY);

    return true;
  }

  function handlePostHistoryPopState(event) {
    if (!isCollapsedMenuPage()) {
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
    if (!isCollapsedMenuPage() || !window.history?.pushState || !window.history?.replaceState) {
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

    const url = parseUrl(href);
    if (!url) {
      return;
    }

    writePendingPostTransition('post-card', url.pathname);
  }

  function navigateToCard(card) {
    const href = card?.dataset?.postItemUrl;
    if (!href) {
      return;
    }

    persistPostViewTransition(href);
    window.location.href = href;
  }

  function resetPostExitTransitionState() {
    document.documentElement.classList.remove(POST_VIEW_EXIT_CLASS);
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
    if (!link || !isCollapsedMenuPage()) {
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

  resetPostExitTransitionState();

  function onDomReady() {
    playPostEntryTransition();
    setupPostHistoryExitTrap();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onDomReady, { once: true });
  } else {
    onDomReady();
  }

  window.addEventListener('pageshow', function() {
    resetPostExitTransitionState();
    playPostEntryTransition({ allowReferrerFallback: false });
    setupPostHistoryExitTrap();
  });
})();

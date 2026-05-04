const easeInOut = t => t < 0.5
  ? 16 * t * t * t * t * t
  : 1 - Math.pow(-2 * t + 2, 5) / 2;

const HEADER_OFFSET = 80;
const HIGHLIGHT_DURATION = 2000;
const SCROLL_DURATION = 500;
const INITIAL_SCROLL_DELAY = 80;
const TOP_TARGET_ID = 'post-top';
let activeScrollAnimation = null;

function getHashFromLink(link) {
  const href = link.getAttribute('href');
  if (!href || !href.startsWith('#')) return null;

  return href;
}

function getTargetFromHash(hash) {
  if (!hash || hash === '#') return null;

  const id = decodeURIComponent(hash.slice(1));
  return document.getElementById(id);
}

function isTopTarget(target) {
  return Boolean(target && target.id === TOP_TARGET_ID);
}

function flashTocLink(targetId) {
  if (!targetId) return;

  const tocLink = Array.from(document.querySelectorAll('#TableOfContents a')).find(link => {
    const hash = getHashFromLink(link);
    if (!hash) return false;

    return decodeURIComponent(hash.slice(1)) === targetId;
  });
  if (!tocLink) return;

  tocLink.classList.add('toc-flash');

  window.setTimeout(() => {
    tocLink.classList.remove('toc-flash');
  }, HIGHLIGHT_DURATION);
}

function highlightHeading(el) {
  if (!el) return;

  const prevTransition = el.style.transition;
  const prevColor = el.style.color;
  const prevFontWeight = el.style.fontWeight;

  el.style.transition = 'color 0.3s ease';
  el.style.color = 'var(--color-link)';
  el.style.fontWeight = 'bold';

  setTimeout(() => {
    el.style.color = prevColor;
    el.style.fontWeight = prevFontWeight;
    el.style.transition = prevTransition;
  }, HIGHLIGHT_DURATION);
}

function cancelActiveScrollAnimation() {
  if (!activeScrollAnimation) return;

  cancelAnimationFrame(activeScrollAnimation.frameId);
  activeScrollAnimation = null;
}

function smoothScrollToTarget(target, hash) {
  cancelActiveScrollAnimation();

  const start = window.scrollY;
  const end = isTopTarget(target)
    ? 0
    : target.getBoundingClientRect().top + start - HEADER_OFFSET;
  const animation = {
    frameId: null,
    hash,
    startTime: null
  };

  activeScrollAnimation = animation;

  function scrollStep(timestamp) {
    if (activeScrollAnimation !== animation) return;
    if (!animation.startTime) animation.startTime = timestamp;

    const progress = timestamp - animation.startTime;
    const percent = easeInOut(Math.min(progress / SCROLL_DURATION, 1));

    window.scrollTo(0, start + (end - start) * percent);

    if (progress < SCROLL_DURATION) {
      animation.frameId = requestAnimationFrame(scrollStep);
      return;
    }

    activeScrollAnimation = null;

    if (hash) {
      history.replaceState(null, '', hash);
    }

    highlightHeading(target);
    flashTocLink(target.id);
  }

  animation.frameId = requestAnimationFrame(scrollStep);
}

function jumpToTarget(target, hash) {
  cancelActiveScrollAnimation();

  const end = isTopTarget(target)
    ? 0
    : target.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
  window.scrollTo(0, end);

  if (hash) {
    history.replaceState(null, '', hash);
  }

  highlightHeading(target);
  flashTocLink(target.id);
}

function scrollToHash(hash, options = {}) {
  const target = getTargetFromHash(hash);
  if (!target) return false;

  if (options.instant) {
    jumpToTarget(target, hash);
  } else {
    smoothScrollToTarget(target, hash);
  }

  return true;
}

document.querySelectorAll('#TableOfContents a, .markdown a.anchor').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const hash = getHashFromLink(this);
    const shouldJumpInstantly = Boolean(
      hash &&
      activeScrollAnimation &&
      activeScrollAnimation.hash === hash
    );
    if (!scrollToHash(hash, { instant: shouldJumpInstantly })) return;

    e.preventDefault();
  });
});

window.addEventListener('load', () => {
  if (!window.location.hash) return;

  window.setTimeout(() => {
    scrollToHash(window.location.hash, { instant: true });
  }, INITIAL_SCROLL_DELAY);
});

window.addEventListener('hashchange', () => {
  scrollToHash(window.location.hash);
});

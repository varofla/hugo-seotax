const easeInOut = t => t < 0.5
  ? 16 * t * t * t * t * t
  : 1 - Math.pow(-2 * t + 2, 5) / 2;

const HEADER_OFFSET = 80;
const HIGHLIGHT_DURATION = 2000;
const SCROLL_DURATION = 500;
const INITIAL_SCROLL_DELAY = 80;

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

function smoothScrollToTarget(target, hash) {
  const start = window.scrollY;
  const end = target.getBoundingClientRect().top + start - HEADER_OFFSET;
  let startTime = null;

  function scrollStep(timestamp) {
    if (!startTime) startTime = timestamp;

    const progress = timestamp - startTime;
    const percent = easeInOut(Math.min(progress / SCROLL_DURATION, 1));

    window.scrollTo(0, start + (end - start) * percent);

    if (progress < SCROLL_DURATION) {
      requestAnimationFrame(scrollStep);
      return;
    }

    if (hash) {
      history.replaceState(null, '', hash);
    }

    highlightHeading(target);
    flashTocLink(target.id);
  }

  requestAnimationFrame(scrollStep);
}

function jumpToTarget(target, hash) {
  const end = target.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
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
    if (!scrollToHash(hash)) return;

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

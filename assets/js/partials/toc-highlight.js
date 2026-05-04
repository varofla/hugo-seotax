document.addEventListener('DOMContentLoaded', function() {
  const config = document.querySelector('#toc-config');
  if (!config) return;
  const TOP_TARGET_ID = 'post-top';
  let activeTocId = null;

  function getHeadings() {
    const start = parseInt(config.dataset.start) || 2;
    const end = parseInt(config.dataset.end) || 3;
    const selectors = Array.from({ length: end - start + 1 }, (_, i) => `h${start + i}[id]`);
    const headings = Array.from(document.querySelectorAll(selectors.join(', ')));
    const topTarget = document.getElementById('post-top');

    return topTarget ? [topTarget, ...headings] : headings;
  }

  function getVisibleToc() {
    const toc = document.querySelector('.site-toc');
    if (toc && window.getComputedStyle(toc).visibility === 'visible') {
      return toc.querySelector('#TableOfContents');
    }
    return document.querySelector('#TableOfContents');
  }

  function scrollActiveTocLinkIntoView(link) {
    const tocPanel = link.closest('.site-toc');
    if (!tocPanel) return;
    if (tocPanel.clientHeight === 0) return;

    const panelRect = tocPanel.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    const edgePadding = 24;
    const isAbove = linkRect.top < panelRect.top + edgePadding;
    const isBelow = linkRect.bottom > panelRect.bottom - edgePadding;

    if (!isAbove && !isBelow) return;

    const targetScrollTop = tocPanel.scrollTop +
      (linkRect.top - panelRect.top) -
      ((panelRect.height - linkRect.height) / 2);

    tocPanel.scrollTo({
      top: Math.max(0, targetScrollTop),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth'
    });
  }

  const mainWrap = document.querySelector('.main-wrap');
  const mainWrapScrolls = mainWrap &&
    ['auto', 'scroll'].includes(window.getComputedStyle(mainWrap).overflowY);
  const scrollEl = mainWrapScrolls ? mainWrap : window;

  // A heading is considered "active" when it has scrolled to within THRESHOLD px
  // of the top of the scroll container. Using a fixed offset avoids the problem
  // of the IntersectionObserver's rootMargin causing close headings to be skipped.
  const THRESHOLD = 100;

  function updateActiveHeading() {
    const headings = getHeadings();
    const toc = getVisibleToc();
    if (!headings.length || !toc) return;

    const containerTop = mainWrapScrolls
      ? mainWrap.getBoundingClientRect().top
      : 0;

    // Walk headings in DOM order; the last one at or above the threshold wins.
    let active = null;
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top - containerTop <= THRESHOLD) {
        active = heading;
      } else {
        break;
      }
    }

    const tocLinks = toc.querySelectorAll('a');
    tocLinks.forEach(link => link.classList.remove('active', 'toc-flash'));

    if (active) {
      const id = active.getAttribute('id');
      const link = toc.querySelector(`a[href="#${CSS.escape(id)}"]`);
      if (link) {
        link.classList.add('active');

        if (activeTocId !== id) {
          activeTocId = id;
          scrollActiveTocLinkIntoView(link);
        }
      }
    } else {
      activeTocId = null;
    }
  }

  scrollEl.addEventListener('scroll', updateActiveHeading, { passive: true });
  updateActiveHeading();

  document.addEventListener('toc:opened', () => {
    const toc = getVisibleToc();
    const activeLink = toc ? toc.querySelector('a.active') : null;
    if (activeLink) {
      scrollActiveTocLinkIntoView(activeLink);
    }
  });

  // When .main-wrap is the scroll container, the browser's default anchor scroll
  // targets the window and does nothing. Intercept TOC link clicks and use
  // scrollIntoView(), which scrolls the nearest scrollable ancestor (.main-wrap).
  if (mainWrapScrolls) {
    document.querySelectorAll('#TableOfContents a[href^="#"]').forEach(link => {
      link.addEventListener('click', function(e) {
        const targetId = decodeURIComponent(this.getAttribute('href').slice(1));
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          e.preventDefault();
          if (targetId === TOP_TARGET_ID) {
            mainWrap.scrollTo({ top: 0, behavior: 'smooth' });
            return;
          }

          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }
});

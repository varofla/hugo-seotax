document.addEventListener('DOMContentLoaded', function() {
  const config = document.querySelector('#toc-config');
  if (!config) return;
  let activeTocId = null;
  const mobileLocation = document.querySelector('[data-mobile-location]');
  const mobileLocationButton = mobileLocation?.closest('[data-toc-toggle]');

  function syncMobileLocation(link) {
    if (!mobileLocation) return;

    const fallback = mobileLocationButton?.dataset.defaultLabel || mobileLocation.textContent.trim();
    const label = link?.textContent?.trim() || fallback;
    mobileLocation.textContent = label;

    if (mobileLocationButton) {
      const isOpen = mobileLocationButton.getAttribute('aria-expanded') === 'true';
      mobileLocationButton.setAttribute('aria-label', `${isOpen ? '목차 닫기' : '목차 열기'}: ${label}`);
      mobileLocationButton.setAttribute('title', label);
    }
  }

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
  function usesMainWrapScroll() {
    return Boolean(mainWrap) &&
      ['auto', 'scroll'].includes(window.getComputedStyle(mainWrap).overflowY);
  }

  // A heading is considered "active" when it has scrolled to within THRESHOLD px
  // of the top of the scroll container. Using a fixed offset avoids the problem
  // of the IntersectionObserver's rootMargin causing close headings to be skipped.
  const THRESHOLD = 100;

  function updateActiveHeading() {
    const headings = getHeadings();
    const toc = getVisibleToc();
    if (!headings.length || !toc) return;

    const containerTop = usesMainWrapScroll()
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
        syncMobileLocation(link);

        if (activeTocId !== id) {
          activeTocId = id;
          scrollActiveTocLinkIntoView(link);
        }
      }
    } else {
      activeTocId = null;
      syncMobileLocation(null);
    }
  }

  window.addEventListener('scroll', updateActiveHeading, { passive: true });
  mainWrap?.addEventListener('scroll', updateActiveHeading, { passive: true });
  window.addEventListener('resize', updateActiveHeading, { passive: true });
  updateActiveHeading();

  document.addEventListener('toc:opened', () => {
    const toc = getVisibleToc();
    const activeLink = toc ? toc.querySelector('a.active') : null;
    if (activeLink) {
      scrollActiveTocLinkIntoView(activeLink);
    }
  });
});

(function() {
  'use strict';

  const SELECTORS = {
    control: '#toc-control',
    panel: '[data-site-toc]',
    toggle: '[data-toc-toggle]',
    overlay: '#toc-overlay'
  };

  let scrollPosition = 0;
  let activeTrigger = null;

  function getMenuBreakpointValue() {
    return getComputedStyle(document.documentElement)
      .getPropertyValue('--menu-breakpoint')
      .trim() || '77.4rem';
  }

  function isMobileViewport() {
    return window.matchMedia(`(max-width: ${getMenuBreakpointValue()})`).matches;
  }

  function getElements() {
    return {
      control: document.querySelector(SELECTORS.control),
      panel: document.querySelector(SELECTORS.panel),
      overlay: document.querySelector(SELECTORS.overlay)
    };
  }

  function syncA11y(isOpen) {
    const { panel } = getElements();
    const isMobile = isMobileViewport();

    document.querySelectorAll(SELECTORS.toggle).forEach((toggle) => {
      const currentLabel = toggle.querySelector('[data-mobile-location]')?.textContent?.trim();
      toggle.setAttribute('aria-expanded', String(isMobile && isOpen));
      toggle.setAttribute('aria-label', `${isMobile && isOpen ? '목차 닫기' : '목차 열기'}: ${currentLabel || toggle.dataset.defaultLabel || '현재 글'}`);
    });

    if (panel) {
      panel.setAttribute('aria-hidden', String(isMobile && !isOpen));
      panel.inert = isMobile && !isOpen;
    }

    document.body.classList.toggle('mobile-toc-open', isMobile && isOpen);
  }

  function setTocOpen(nextState, options = {}) {
    const { control, panel, overlay } = getElements();
    if (!control || !panel || !isMobileViewport()) return;

    const wasOpen = control.checked;
    scrollPosition = window.pageYOffset || document.documentElement.scrollTop || 0;
    control.checked = Boolean(nextState);
    panel.classList.toggle('overlay-mode', control.checked);
    overlay?.classList.toggle('active', control.checked);
    syncA11y(control.checked);

    window.requestAnimationFrame(() => window.scrollTo(0, scrollPosition));

    if (control.checked) {
      activeTrigger = options.trigger || document.activeElement;
      document.dispatchEvent(new CustomEvent('mobile:panel-open', {
        detail: { panel: 'toc' }
      }));
      document.dispatchEvent(new CustomEvent('toc:opened'));
      window.requestAnimationFrame(() => {
        panel.querySelector('a.active, #TableOfContents a')?.focus({ preventScroll: true });
      });
    } else if (wasOpen) {
      if (options.restoreFocus !== false) {
        activeTrigger?.focus?.({ preventScroll: true });
      }
      activeTrigger = null;
    }
  }

  function createOverlay() {
    const { panel } = getElements();
    if (!panel || document.querySelector(SELECTORS.overlay)) return;

    const overlay = document.createElement('div');
    overlay.id = 'toc-overlay';
    overlay.className = 'toc-overlay';
    overlay.addEventListener('click', () => setTocOpen(false));
    document.body.appendChild(overlay);
  }

  function init() {
    const { control, panel } = getElements();
    if (!control || !panel) return;

    createOverlay();

    document.querySelectorAll(SELECTORS.toggle).forEach((toggle) => {
      toggle.addEventListener('click', (event) => {
        event.preventDefault();
        setTocOpen(!control.checked, { trigger: event.currentTarget });
      });
    });

    panel.addEventListener('click', (event) => {
      if (event.target.closest('#TableOfContents a[href^="#"]')) {
        setTocOpen(false);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && control.checked) {
        setTocOpen(false);
      }
    });

    document.addEventListener('mobile:panel-open', (event) => {
      if (event.detail?.panel !== 'toc') {
        setTocOpen(false, { restoreFocus: false });
      }
    });

    let resizeTimer;
    window.addEventListener('resize', () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (!isMobileViewport()) {
          control.checked = false;
          panel.classList.remove('overlay-mode');
          document.querySelector(SELECTORS.overlay)?.classList.remove('active');
        }
        syncA11y(control.checked);
      }, 150);
    });

    syncA11y(control.checked);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

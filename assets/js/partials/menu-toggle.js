(function() {
  'use strict';

  const menuBreakpoint = 256 + 768 * 1.3;
  let scrollPosition = 0;

  function toggleMenu(forceState) {
    const menuControl = document.getElementById('menu-control');
    if (!menuControl || window.innerWidth > menuBreakpoint) {
      return;
    }

    scrollPosition = window.pageYOffset || document.documentElement.scrollTop;

    if (forceState !== undefined) {
      menuControl.checked = forceState;
    } else {
      menuControl.checked = !menuControl.checked;
    }

    requestAnimationFrame(() => {
      window.scrollTo(0, scrollPosition);
    });
  }

  // Initialize on DOM ready
  function init() {
    const menuControl = document.getElementById('menu-control');
    const menuPanel = document.querySelector('.site-menu');

    const menuLabel = document.querySelector('label[for="menu-control"]');
    if (menuLabel) {
      menuLabel.addEventListener('click', (e) => {
        e.preventDefault();
        toggleMenu();
      });
    }

    // Handle menu overlay clicks - using event delegation
    document.addEventListener('click', (e) => {
      const isDesktop = window.innerWidth > menuBreakpoint;
      const isMenuOpen = menuControl && menuControl.checked;

      if (isDesktop || !isMenuOpen) {
        return;
      }

      const isClickInsideMenu = menuPanel && menuPanel.contains(e.target);
      const isMenuToggleButton = e.target.closest('.menu-toggle-button, label[for="menu-control"]');

      if (!isClickInsideMenu && !isMenuToggleButton) {
        toggleMenu(false);
      }
    });

    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
      const isDesktop = window.innerWidth > menuBreakpoint;

      if (!isDesktop && (e.key === 'Escape')) {
        const isMenuOpen = menuControl && menuControl.checked;

        if (isMenuOpen) {
          toggleMenu(false);
        }
      }
    });

    // Handle window resize
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (window.innerWidth > menuBreakpoint) {
          if (menuControl) menuControl.checked = false;
        }
      }, 250);
    });
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

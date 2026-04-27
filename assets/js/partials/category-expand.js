(function() {
  'use strict';

  const SELECTORS = {
    menuCategories: '[data-menu-categories]',
    categoryGroup: '[data-category-group]',
    parentItem: '[data-category-item="parent"]',
    childItem: '[data-category-item="child"]',
  };

  /**
   * Get category1/category2 for the current page.
   * Checks URL search params first, then falls back to the post's category link.
   * @returns {object} category1 and category2 strings (nullable)
   */
  function getCurrentCategory() {
    const currentUrl = new URL(window.location.href);

    // Search page: /search/?category1=...&category2=...
    const category1 = currentUrl.searchParams.get('category1');
    const category2 = currentUrl.searchParams.get('category2');
    if (category1 || category2) {
      return { category1, category2 };
    }

    // Post page: extract from the category link in the content header
    const categoryLink = document.querySelector('.content-category-link');
    if (categoryLink) {
      try {
        const linkUrl = new URL(categoryLink.getAttribute('href'), window.location.origin);
        return {
          category1: linkUrl.searchParams.get('category1'),
          category2: linkUrl.searchParams.get('category2'),
        };
      } catch (e) {
        // ignore malformed href
      }
    }

    return { category1: null, category2: null };
  }

  function initCategoryExpand() {
    const { category1, category2 } = getCurrentCategory();
    const menuCategories = document.querySelector(SELECTORS.menuCategories);
    if (!menuCategories) return;

    // Open and activate the current parent category group.
    if (category1) {
      const parentGroup = menuCategories.querySelector(
        `${SELECTORS.categoryGroup}[data-category1="${CSS.escape(category1)}"]`
      );
      if (parentGroup) {
        parentGroup.classList.add('is-open');
        const parentRow = parentGroup.querySelector(SELECTORS.parentItem);
        if (parentRow) parentRow.classList.add('is-active');
      }
    }

    // Activate the current child category item.
    if (category1 && category2) {
      const childItem = menuCategories.querySelector(
        `${SELECTORS.childItem}[data-category1="${CSS.escape(category1)}"][data-category2="${CSS.escape(category2)}"]`
      );
      if (childItem) childItem.classList.add('is-active');
    }

    setupActiveHoverState(menuCategories);
  }

  function setupActiveHoverState(menuCategories) {
    let suppressedElements = [];

    function clearSuppressed() {
      suppressedElements.forEach((element) => {
        element.classList.remove('is-suppressed');
      });
      suppressedElements = [];
    }

    function suppress(element) {
      if (!element || element.classList.contains('is-suppressed')) return;
      element.classList.add('is-suppressed');
      suppressedElements.push(element);
    }

    function getActiveParent() {
      return menuCategories.querySelector(`${SELECTORS.parentItem}.is-active`);
    }

    function getActiveChild() {
      return menuCategories.querySelector(`${SELECTORS.childItem}.is-active`);
    }

    function applySuppression(hoverTarget) {
      clearSuppressed();
      if (!hoverTarget) return;

      const activeParent = getActiveParent();
      const activeChild = getActiveChild();

      if (hoverTarget.matches(SELECTORS.childItem)) {
        const hoveredGroup = hoverTarget.closest(SELECTORS.categoryGroup);
        const activeParentGroup = activeParent ? activeParent.closest(SELECTORS.categoryGroup) : null;

        if (activeChild && activeChild !== hoverTarget) {
          suppress(activeChild);
        }

        if (activeParent && activeParentGroup && activeParentGroup !== hoveredGroup) {
          suppress(activeParent);
        }

        return;
      }

      if (hoverTarget.matches(SELECTORS.parentItem)) {
        if (activeParent && activeParent !== hoverTarget) {
          suppress(activeParent);
        }

        if (activeChild) {
          suppress(activeChild);
        }
      }
    }

    menuCategories.addEventListener('pointerover', (event) => {
      const hoverTarget = event.target.closest(`${SELECTORS.parentItem}, ${SELECTORS.childItem}`);
      if (!hoverTarget || !menuCategories.contains(hoverTarget)) return;
      applySuppression(hoverTarget);
    });

    menuCategories.addEventListener('pointerleave', () => {
      clearSuppressed();
    });

    menuCategories.addEventListener('focusin', (event) => {
      const hoverTarget = event.target.closest(`${SELECTORS.parentItem}, ${SELECTORS.childItem}`);
      if (!hoverTarget || !menuCategories.contains(hoverTarget)) return;
      applySuppression(hoverTarget);
    });

    menuCategories.addEventListener('focusout', () => {
      window.requestAnimationFrame(() => {
        const activeElement = document.activeElement;
        const focusTarget = activeElement && activeElement.closest
          ? activeElement.closest(`${SELECTORS.parentItem}, ${SELECTORS.childItem}`)
          : null;

        if (focusTarget && menuCategories.contains(focusTarget)) {
          applySuppression(focusTarget);
          return;
        }

        clearSuppressed();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCategoryExpand, { once: true });
  } else {
    initCategoryExpand();
  }
})();

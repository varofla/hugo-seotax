(function() {
  'use strict';

  const SELECTORS = {
    menuCategories: '[data-menu-categories]',
    categoryGroup: '[data-category-group]',
    parentItem: '[data-category-item="parent"]',
    childItem: '[data-category-item="child"]',
    categoryToggle: '[data-category-toggle]',
  };

  const CATEGORY_BASE = (function() {
    const a = document.createElement('a');
    a.href = '{{ "category/" | relURL }}';
    return a.pathname;
  })();

  function urlize(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  /**
   * Get category slugs for the current page.
   * - Category pages: parsed from URL path (already slugified).
   * - Post pages: read original names from data attr, convert to slug.
   * @returns {object} category1 and category2 slugs (nullable)
   */
  function getCurrentCategory() {
    const pathname = window.location.pathname;

    // Path-based category pages: /category/dev-boards/ or /category/dev-boards/arduino/
    if (pathname.startsWith(CATEGORY_BASE) && pathname.length > CATEGORY_BASE.length) {
      const relative = pathname.slice(CATEGORY_BASE.length).replace(/\/$/, '');
      const parts = relative.split('/').filter(Boolean);
      if (parts.length > 0) {
        return {
          category1: parts[0] || null,
          category2: parts[1] || null,
        };
      }
    }

    // Post page: use rendered category metadata in the content header
    const categoryMeta = document.querySelector('[data-current-category]');
    if (categoryMeta) {
      const c1 = categoryMeta.dataset.category1 || null;
      const c2 = categoryMeta.dataset.category2 || null;
      return {
        category1: c1 ? urlize(c1) : null,
        category2: c2 ? urlize(c2) : null,
      };
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
        `${SELECTORS.categoryGroup}[data-category1-slug="${CSS.escape(category1)}"]`
      );
      if (parentGroup) {
        parentGroup.classList.add('is-open');
        syncGroupToggleState(parentGroup);
        const parentRow = parentGroup.querySelector(SELECTORS.parentItem);
        if (parentRow) parentRow.classList.add('is-active');
      }
    }

    // Activate the current child category item.
    if (category1 && category2) {
      const childItem = menuCategories.querySelector(
        `${SELECTORS.childItem}[data-category1-slug="${CSS.escape(category1)}"][data-category2-slug="${CSS.escape(category2)}"]`
      );
      if (childItem) childItem.classList.add('is-active');
    }

    setupCategoryToggle(menuCategories);
    setupActiveHoverState(menuCategories);
  }

  function syncGroupToggleState(categoryGroup) {
    const toggle = categoryGroup.querySelector(SELECTORS.categoryToggle);
    if (!toggle) return;

    const isOpen = categoryGroup.classList.contains('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute(
      'aria-label',
      `${categoryGroup.dataset.category1} 하위 카테고리 ${isOpen ? '접기' : '펼치기'}`
    );
  }

  function toggleCategoryGroup(categoryGroup) {
    categoryGroup.classList.toggle('is-open');
    syncGroupToggleState(categoryGroup);
  }

  function setupCategoryToggle(menuCategories) {
    menuCategories.querySelectorAll(SELECTORS.categoryGroup).forEach((categoryGroup) => {
      syncGroupToggleState(categoryGroup);
    });

    menuCategories.addEventListener('click', (event) => {
      const toggle = event.target.closest(SELECTORS.categoryToggle);
      if (!toggle || !menuCategories.contains(toggle)) return;

      const categoryGroup = toggle.closest(SELECTORS.categoryGroup);
      if (!categoryGroup) return;

      event.preventDefault();
      event.stopPropagation();
      toggleCategoryGroup(categoryGroup);

      // Pointer clicks shouldn't leave the parent row in a persistent focus-within state.
      if (typeof toggle.blur === 'function') {
        toggle.blur();
      }
    });

    menuCategories.addEventListener('keydown', (event) => {
      const toggle = event.target.closest(SELECTORS.categoryToggle);
      if (!toggle || !menuCategories.contains(toggle)) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;

      const categoryGroup = toggle.closest(SELECTORS.categoryGroup);
      if (!categoryGroup) return;

      event.preventDefault();
      event.stopPropagation();
      toggleCategoryGroup(categoryGroup);
    });
  }

  function setupActiveHoverState(menuCategories) {
    let suppressedElements = [];
    let linkedHoverParents = [];

    function clearSuppressed() {
      suppressedElements.forEach((element) => {
        element.classList.remove('is-suppressed');
      });
      suppressedElements = [];
    }

    function clearLinkedHoverParents() {
      linkedHoverParents.forEach((element) => {
        element.classList.remove('is-hover-linked');
      });
      linkedHoverParents = [];
    }

    function suppress(element) {
      if (!element || element.classList.contains('is-suppressed')) return;
      element.classList.add('is-suppressed');
      suppressedElements.push(element);
    }

    function linkHoverParent(element) {
      if (!element || element.classList.contains('is-hover-linked')) return;
      element.classList.add('is-hover-linked');
      linkedHoverParents.push(element);
    }

    function getActiveParent() {
      return menuCategories.querySelector(`${SELECTORS.parentItem}.is-active`);
    }

    function getActiveChild() {
      return menuCategories.querySelector(`${SELECTORS.childItem}.is-active`);
    }

    function applySuppression(hoverTarget) {
      clearSuppressed();
      clearLinkedHoverParents();
      if (!hoverTarget) return;

      const activeParent = getActiveParent();
      const activeChild = getActiveChild();

      if (hoverTarget.matches(SELECTORS.childItem)) {
        const hoveredGroup = hoverTarget.closest(SELECTORS.categoryGroup);
        const activeParentGroup = activeParent ? activeParent.closest(SELECTORS.categoryGroup) : null;
        const hoveredParent = hoveredGroup ? hoveredGroup.querySelector(SELECTORS.parentItem) : null;

        if (activeChild && activeChild !== hoverTarget) {
          suppress(activeChild);
        }

        if (hoveredParent) {
          linkHoverParent(hoveredParent);
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
      clearLinkedHoverParents();
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
        clearLinkedHoverParents();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCategoryExpand, { once: true });
  } else {
    initCategoryExpand();
  }
})();

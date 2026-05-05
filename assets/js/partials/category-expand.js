(function() {
  'use strict';

  const SELECTORS = {
    menuCategories: '[data-menu-categories]',
    categoryGroup: '[data-category-group]',
    parentItem: '[data-category-item="parent"]',
    childItem: '[data-category-item="child"]',
    categoryToggle: '[data-category-toggle]',
    categoryChildrenShell: '[data-category-children-shell]',
  };

  /**
   * Get category slugs for the current page from rendered metadata.
   * @returns {object} category1 and category2 slugs (nullable)
   */
  function getCurrentCategory() {
    const categoryMeta = document.querySelector('[data-current-category]');
    if (categoryMeta) {
      const c1 = categoryMeta.dataset.category1Slug || null;
      const c2 = categoryMeta.dataset.category2Slug || null;
      return {
        category1: c1,
        category2: c2,
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
    const childrenShell = categoryGroup.querySelector(SELECTORS.categoryChildrenShell);
    const isOpen = categoryGroup.classList.contains('is-open');

    if (!toggle) return;
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute(
      'aria-label',
      `${categoryGroup.dataset.category1} 하위 카테고리 ${isOpen ? '접기' : '펼치기'}`
    );

    if (childrenShell) {
      childrenShell.setAttribute('aria-hidden', String(!isOpen));
      childrenShell.toggleAttribute('inert', !isOpen);
    }
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
    let currentTarget = null;
    let currentLinkedParent = null;

    function clearInteractionState() {
      menuCategories.classList.remove('is-interacting');

      if (currentTarget) {
        currentTarget.classList.remove('is-interaction-current');
        currentTarget = null;
      }

      if (currentLinkedParent) {
        currentLinkedParent.classList.remove('is-interaction-linked');
        currentLinkedParent = null;
      }
    }

    function applyInteractionState(target) {
      clearInteractionState();
      if (!target) return;

      menuCategories.classList.add('is-interacting');
      currentTarget = target;
      currentTarget.classList.add('is-interaction-current');

      if (target.matches(SELECTORS.childItem)) {
        const hoveredGroup = target.closest(SELECTORS.categoryGroup);
        const linkedParent = hoveredGroup ? hoveredGroup.querySelector(SELECTORS.parentItem) : null;
        if (linkedParent) {
          currentLinkedParent = linkedParent;
          currentLinkedParent.classList.add('is-interaction-linked');
        }
      }
    }

    menuCategories.addEventListener('pointerover', (event) => {
      const target = event.target.closest(`${SELECTORS.parentItem}, ${SELECTORS.childItem}`);
      if (!target || !menuCategories.contains(target)) {
        clearInteractionState();
        return;
      }
      if (target === currentTarget) return;
      applyInteractionState(target);
    });

    menuCategories.addEventListener('pointermove', (event) => {
      const target = event.target.closest(`${SELECTORS.parentItem}, ${SELECTORS.childItem}`);
      if (target && menuCategories.contains(target)) return;
      clearInteractionState();
    });

    menuCategories.addEventListener('pointerleave', () => {
      clearInteractionState();
    });

    menuCategories.addEventListener('focusin', (event) => {
      const target = event.target.closest(`${SELECTORS.parentItem}, ${SELECTORS.childItem}`);
      if (!target || !menuCategories.contains(target) || target === currentTarget) return;
      applyInteractionState(target);
    });

    menuCategories.addEventListener('focusout', () => {
      window.requestAnimationFrame(() => {
        const activeElement = document.activeElement;
        const target = activeElement && activeElement.closest
          ? activeElement.closest(`${SELECTORS.parentItem}, ${SELECTORS.childItem}`)
          : null;

        if (target && menuCategories.contains(target)) {
          if (target !== currentTarget) {
            applyInteractionState(target);
          }
          return;
        }

        clearInteractionState();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCategoryExpand, { once: true });
  } else {
    initCategoryExpand();
  }
})();

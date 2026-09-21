(async function () {
  'use strict';

  const SEARCH_PATH = '{{ "search/" | relURL }}';
  const {createElement, composeUrl, getUrlState, sortResultIds} = window.siteSearch.utils;
  const TEXT = {
    searchAction: '검색',
    searchClose: '닫기',
    searchPlaceholder: '검색어를 입력해주세요',
    searchMore: '전체 %d개 결과 보기',
    categoriesParentSubtitle: '상위 카테고리',
    categoriesChildSubtitle: '하위 카테고리',
    tagsTermsTitle: '태그',
    tagsOpCheckbox: '모두 일치',
    noResults: '조건에 맞는 결과가 없습니다.'
  };

  const searchInput = document.querySelector('#search-input');
  const menuSearch = document.querySelector('.menu-search');
  const mobileSearch = document.querySelector('.mobile-search');
  let modalSearchInput;
  let modalSearchResults;
  let searchOverlay;
  let searchModal;
  let modalFiltersRow;
  let modalSearchState = createInitialModalState();
  let modalDraftFilters = createEmptyDraftFilters();
  let modalSearchReady = false;
  let activeDropdown = null;
  let activeDropdownIndex = -1;
  let activeSearchTrigger = null;

  if (!searchInput && !menuSearch && !mobileSearch) {
    return;
  }

  if (menuSearch) {
    menuSearch.addEventListener('click', openSearchModal);
    menuSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openSearchModal();
      }
    });
  }

  if (mobileSearch) {
    mobileSearch.addEventListener('click', openSearchModal);
    mobileSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openSearchModal();
      }
    });
  }

  document.addEventListener('keypress', focusSearchFieldOnKeyPress);

  function createInitialModalState() {
    const state = getUrlState();

    return {
      query: state.query,
      category1: state.category1,
      category2: state.category2,
      tags: state.tags,
      tagsOp: state.tagsOp,
      sort: state.sort
    };
  }

  function createEmptyDraftFilters() {
    return {
      category1: '',
      category2: '',
      tags: ''
    };
  }

  function openSearchModal() {
    if (!searchModal) {
      createSearchModal();
    }

    activeSearchTrigger = document.activeElement;
    document.dispatchEvent(new CustomEvent('mobile:panel-open', {
      detail: { panel: 'search' }
    }));

    modalSearchState = createInitialModalState();
    modalDraftFilters = createEmptyDraftFilters();
    syncModalControlsFromState();

    searchOverlay.classList.add('active');
    searchModal.classList.add('active');
    searchModal.setAttribute('aria-hidden', 'false');
    mobileSearch?.setAttribute('aria-expanded', 'true');
    document.body.classList.add('mobile-search-open');
    modalSearchInput.focus();

    loadSearchResources();
  }

  function closeSearchModal(options = {}) {
    if (!searchModal) return;

    searchOverlay.classList.remove('active');
    searchModal.classList.remove('active');
    searchModal.setAttribute('aria-hidden', 'true');
    mobileSearch?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('mobile-search-open');
    activeDropdown = null;
    activeDropdownIndex = -1;
    hideAllDropdowns();
    clearModalResults();

    if (options.restoreFocus !== false) {
      activeSearchTrigger?.focus?.({preventScroll: true});
    }
    activeSearchTrigger = null;
  }

  function createSearchModal() {
    searchOverlay = createElement('div', {className: 'search-overlay'});
    searchOverlay.addEventListener('click', closeSearchModal);

    searchModal = createElement('div', {
      className: 'search-modal',
      attrs: {
        id: 'search-modal',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': TEXT.searchAction,
        'aria-hidden': 'true'
      }
    });

    const modalHeader = createElement('div', {className: 'search-modal-header'});
    const modalTitle = createElement('h3', {
      className: 'search-modal-title',
      text: TEXT.searchAction
    });
    modalHeader.appendChild(modalTitle);

    const closeButton = createElement('button', {
      className: 'search-modal-close',
      html: '<i class="icon-xmark"></i>',
      attrs: {'aria-label': TEXT.searchClose}
    });
    closeButton.addEventListener('click', closeSearchModal);
    modalHeader.appendChild(closeButton);
    searchModal.appendChild(modalHeader);

    const modalInputContainer = createElement('div', {className: 'search-modal-input-container'});

    modalSearchInput = createElement('input', {
      className: 'search-modal-input',
      id: 'search-modal-input',
      attrs: {type: 'text', maxLength: 64, placeholder: TEXT.searchPlaceholder, 'aria-label': TEXT.searchAction}
    });
    modalSearchInput.addEventListener('input', () => {
      modalSearchState.query = modalSearchInput.value.trim();
      renderModalPreview();
    });
    modalSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeSearchModal();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        window.location.href = buildModalSearchUrl();
      }
    });
    modalInputContainer.appendChild(modalSearchInput);

    const modalSearchButton = createElement('button', {
      className: 'search-modal-button',
      html: '<i class="icon-search"></i>',
      attrs: {'aria-label': TEXT.searchAction}
    });
    modalSearchButton.addEventListener('click', () => {
      window.location.href = buildModalSearchUrl();
    });
    modalInputContainer.appendChild(modalSearchButton);
    searchModal.appendChild(modalInputContainer);

    const searchFilter = createElement('div', {
      className: 'search-filter search-filter-modal'
    });
    modalFiltersRow = createElement('div', {
      className: 'search-taxonomies-row search-taxonomies-row-modal'
    });

    const categoriesFilter = createElement('div', {className: 'search-categories-filter'});
    categoriesFilter.appendChild(createCategoryFilter('category1'));
    categoriesFilter.appendChild(createCategoryFilter('category2', true));
    modalFiltersRow.appendChild(categoriesFilter);

    const tagsFilter = createElement('div', {className: 'search-tags-filter'});
    tagsFilter.appendChild(createTagsFilter());
    tagsFilter.appendChild(createTagsOpCheckbox());
    modalFiltersRow.appendChild(tagsFilter);

    searchFilter.appendChild(modalFiltersRow);
    searchModal.appendChild(searchFilter);

    modalSearchResults = createElement('ul', {className: 'search-modal-results'});
    searchModal.appendChild(modalSearchResults);

    const modalFooter = createElement('div', {
      className: 'search-modal-footer',
      styles: {display: 'none'}
    });
    searchModal.appendChild(modalFooter);

    document.body.appendChild(searchOverlay);
    document.body.appendChild(searchModal);

    setupModalFilterEvents();
    syncModalControlsFromState();

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && searchModal.classList.contains('active')) {
        closeSearchModal();
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-filter-modal')) {
        hideAllDropdowns();
      }
    });

    document.addEventListener('mobile:panel-open', (event) => {
      if (event.detail?.panel !== 'search' && searchModal.classList.contains('active')) {
        closeSearchModal({restoreFocus: false});
      }
    });
  }

  function createCategoryFilter(type, disabled = false) {
    const isCategory2 = (type === 'category2');
    const filterLabel = isCategory2 ? TEXT.categoriesChildSubtitle : TEXT.categoriesParentSubtitle;
    const inputId = `search-modal-filter-${type}`;

    const taxonomyFilter = createElement('div', {className: 'taxonomy-filter'});
    taxonomyFilter.appendChild(createElement('label', {
      text: filterLabel,
      attrs: {for: inputId}
    }));

    const inputWrapper = createElement('div', {className: 'taxonomy-input-wrapper'});
    const input = createElement('input', {
      id: inputId,
      className: 'search-filter-input',
      attrs: {type: 'text', placeholder: filterLabel, autocomplete: 'off'}
    });
    if (disabled) input.disabled = true;
    inputWrapper.appendChild(input);

    const dropdown = createElement('div', {
      id: `${inputId}-dropdown`,
      className: 'search-filter-dropdown hidden'
    });
    inputWrapper.appendChild(dropdown);
    taxonomyFilter.appendChild(inputWrapper);

    taxonomyFilter.appendChild(createElement('div', {
      id: `${inputId}-chips`,
      className: 'search-filter-chips'
    }));

    return taxonomyFilter;
  }

  function createTagsFilter() {
    const taxonomyFilter = createElement('div', {
      className: 'taxonomy-filter taxonomy-filter-wide'
    });
    const inputId = 'search-modal-filter-tags';

    taxonomyFilter.appendChild(createElement('label', {
      text: TEXT.tagsTermsTitle,
      attrs: {for: inputId}
    }));

    const inputWrapper = createElement('div', {className: 'taxonomy-input-wrapper'});
    inputWrapper.appendChild(createElement('input', {
      id: inputId,
      className: 'search-filter-input',
      attrs: {type: 'text', placeholder: TEXT.tagsTermsTitle, autocomplete: 'off'}
    }));

    inputWrapper.appendChild(createElement('div', {
      id: `${inputId}-dropdown`,
      className: 'search-filter-dropdown hidden'
    }));
    taxonomyFilter.appendChild(inputWrapper);

    taxonomyFilter.appendChild(createElement('div', {
      id: `${inputId}-chips`,
      className: 'search-filter-chips search-filter-chips-wrap'
    }));

    return taxonomyFilter;
  }

  function createTagsOpCheckbox() {
    const taxonomyFilter = createElement('div', {className: 'taxonomy-filter tags-op-checkbox'});
    const label = createElement('label', {className: 'tags-op-label'});
    const checkbox = createElement('input', {
      id: 'search-modal-filter-tagsOp',
      attrs: {type: 'checkbox'}
    });

    label.appendChild(checkbox);
    label.appendChild(createElement('span', {text: TEXT.tagsOpCheckbox}));
    taxonomyFilter.appendChild(label);

    return taxonomyFilter;
  }

  function setupModalFilterEvents() {
    const category1Input = document.querySelector('#search-modal-filter-category1');
    const category2Input = document.querySelector('#search-modal-filter-category2');
    const tagsInput = document.querySelector('#search-modal-filter-tags');
    const tagsOpCheckbox = document.querySelector('#search-modal-filter-tagsOp');

    setupTaxonomyAutocomplete(category1Input, 'category1');
    setupTaxonomyAutocomplete(category2Input, 'category2');
    setupTaxonomyAutocomplete(tagsInput, 'tags');

    tagsOpCheckbox.addEventListener('change', () => {
      modalSearchState.tagsOp = tagsOpCheckbox.checked ? 'and' : 'or';
      renderModalPreview();
    });
  }

  function setupTaxonomyAutocomplete(input, type) {
    const dropdown = document.querySelector(`#${input.id}-dropdown`);

    input.addEventListener('input', () => {
      modalDraftFilters[type] = input.value.trim().toLowerCase();
      renderTaxonomyDropdown(type, modalDraftFilters[type]);
      renderModalPreview();
    });

    input.addEventListener('focus', () => {
      modalDraftFilters[type] = input.value.trim().toLowerCase();
      renderTaxonomyDropdown(type, modalDraftFilters[type]);
    });

    input.addEventListener('keydown', (e) => {
      if (!activeDropdown || activeDropdown !== dropdown || activeDropdown.classList.contains('hidden')) {
        return;
      }

      const items = activeDropdown.querySelectorAll('.search-filter-dropdown-item');
      if (items.length === 0) {
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          activeDropdownIndex = (activeDropdownIndex + 1) % items.length;
          updateActiveDropdownItem(items, activeDropdownIndex);
          break;
        case 'ArrowUp':
          e.preventDefault();
          activeDropdownIndex = (activeDropdownIndex - 1 + items.length) % items.length;
          updateActiveDropdownItem(items, activeDropdownIndex);
          break;
        case 'Enter':
          e.preventDefault();
          items[Math.max(activeDropdownIndex, 0)].click();
          break;
        case 'Escape':
          e.preventDefault();
          hideAllDropdowns();
          break;
      }
    });
  }

  function updateActiveDropdownItem(items, index) {
    items.forEach((item, itemIndex) => {
      if (itemIndex === index) {
        item.classList.add('active');
        item.scrollIntoView({block: 'nearest'});
      } else {
        item.classList.remove('active');
      }
    });
  }

  function syncModalControlsFromState() {
    if (!searchModal) return;

    modalSearchInput.value = modalSearchState.query;
    document.querySelector('#search-modal-filter-category1').value = '';
    document.querySelector('#search-modal-filter-category2').value = '';
    document.querySelector('#search-modal-filter-tags').value = '';
    document.querySelector('#search-modal-filter-tagsOp').checked = (modalSearchState.tagsOp === 'and');
    modalFiltersRow.classList.remove('hidden');

    const category2Input = document.querySelector('#search-modal-filter-category2');
    category2Input.disabled = !modalSearchState.category1;

    renderSelectedChips();
  }

  function renderSelectedChips() {
    if (!searchModal || !window.siteSearch.categories || !window.siteSearch.tags) {
      return;
    }

    const category1Chips = document.querySelector('#search-modal-filter-category1-chips');
    const category2Chips = document.querySelector('#search-modal-filter-category2-chips');
    const tagsChips = document.querySelector('#search-modal-filter-tags-chips');

    category1Chips.replaceChildren();
    category2Chips.replaceChildren();
    tagsChips.replaceChildren();

    if (modalSearchState.category1) {
      const category1 = window.siteSearch.categories[modalSearchState.category1.toLowerCase()];
      if (category1?.A?.name) {
        category1Chips.appendChild(createFilterChip(category1.A.name, modalSearchState.category1, 'category1'));
      }
    }

    if (modalSearchState.category1 && modalSearchState.category2) {
      const category1 = window.siteSearch.categories[modalSearchState.category1.toLowerCase()];
      const category2 = category1?.[modalSearchState.category2.toLowerCase()];
      if (category2?.name) {
        category2Chips.appendChild(createFilterChip(category2.name, modalSearchState.category2, 'category2'));
      }
    }

    modalSearchState.tags.forEach((tagKey) => {
      const tag = window.siteSearch.tags[tagKey.toLowerCase()];
      if (tag?.name) {
        tagsChips.appendChild(createFilterChip(tag.name, tagKey, 'tags'));
      }
    });
  }

  function createFilterChip(name, key, type) {
    const chip = createElement('div', {
      className: 'search-filter-chip',
      dataset: {key, name}
    });

    chip.appendChild(createElement('span', {
      className: 'chip-name',
      text: name
    }));

    chip.appendChild(createElement('button', {
      className: 'chip-remove',
      html: '&times;',
      attrs: {type: 'button', 'aria-label': `${name} 제거`}
    }));

    chip.addEventListener('click', (e) => {
      e.preventDefault();
      handleChipRemove(type, key);
    });

    return chip;
  }

  function handleChipRemove(type, key) {
    if (type === 'category1') {
      modalSearchState.category1 = '';
      modalSearchState.category2 = '';
      const category2Input = document.querySelector('#search-modal-filter-category2');
      category2Input.disabled = true;
      category2Input.value = '';
    } else if (type === 'category2') {
      modalSearchState.category2 = '';
    } else if (type === 'tags') {
      modalSearchState.tags = modalSearchState.tags.filter((tag) => tag !== key);
    }

    renderSelectedChips();
    renderModalPreview();
  }

  function loadSearchResources() {
    modalSearchReady = false;
    modalSearchInput.required = true;

    Promise.all([
      window.siteSearch.initIndex(),
      window.siteSearch.initCategories(),
      window.siteSearch.initTags()
    ]).then(() => {
      modalSearchReady = true;
      modalSearchInput.required = false;
      renderSelectedChips();
      renderModalPreview();
    }).catch(() => {
      modalSearchReady = false;
      modalSearchInput.required = false;
      clearModalResults();
      modalSearchResults.appendChild(createElement('li', {
        className: 'search-result-empty',
        text: '검색을 불러오지 못했습니다. 잠시 후 다시 열어주세요.'
      }));
    });
  }

  function buildModalSearchUrl() {
    const params = new URLSearchParams();
    if (modalSearchState.query) params.set('query', modalSearchState.query);
    if (modalSearchState.category1) params.set('category1', modalSearchState.category1);
    if (modalSearchState.category2) params.set('category2', modalSearchState.category2);
    if (modalSearchState.tags.length > 0) {
      params.set('tags', modalSearchState.tags.join(','));
      params.set('tagsOp', modalSearchState.tagsOp);
    }
    if (modalSearchState.sort !== window.siteSearch.defaultSort) {
      params.set('sort', modalSearchState.sort);
    }

    return composeUrl(SEARCH_PATH, params);
  }

  function focusSearchFieldOnKeyPress(event) {
    if (event.target.value !== undefined) {
      return;
    }

    if (searchModal && searchModal.classList.contains('active')) {
      return;
    }

    const characterPressed = String.fromCharCode(event.charCode);
    if (!isHotkey(characterPressed)) {
      return;
    }

    openSearchModal();
    event.preventDefault();
  }

  function isHotkey(character) {
    if (searchInput) {
      const dataHotkeys = searchInput.getAttribute('data-hotkeys') || '';
      return dataHotkeys.indexOf(character) >= 0;
    }
    return false;
  }

  function clearModalResults() {
    if (modalSearchResults) {
      modalSearchResults.replaceChildren();
    }

    if (searchModal) {
      const modalFooter = searchModal.querySelector('.search-modal-footer');
      if (modalFooter) {
        modalFooter.style.display = 'none';
        modalFooter.replaceChildren();
      }
    }
  }

  function hideAllDropdowns() {
    searchModal?.querySelectorAll('.search-filter-dropdown').forEach((dropdown) => {
      dropdown.classList.add('hidden');
    });
    activeDropdown = null;
    activeDropdownIndex = -1;
  }

  function renderTaxonomyDropdown(type, query) {
    if (!modalSearchReady) {
      return;
    }

    const dropdown = document.querySelector(`#search-modal-filter-${type}-dropdown`);
    const matches = getDropdownMatches(type, query);

    hideAllDropdowns();

    if (matches.length === 0) {
      return;
    }

    const fragment = document.createDocumentFragment();
    matches.forEach((item) => {
      const option = createElement('div', {
        className: 'search-filter-dropdown-item',
        dataset: {key: item.key, name: item.name}
      });

      option.appendChild(createElement('span', {
        className: 'dropdown-item-name',
        text: item.name
      }));

      option.appendChild(createElement('span', {
        className: 'dropdown-item-count',
        text: `(${item.count})`
      }));

      option.addEventListener('click', () => {
        applyDropdownSelection(type, item);
      });

      fragment.appendChild(option);
    });

    dropdown.replaceChildren(fragment);
    dropdown.classList.remove('hidden');
    activeDropdown = dropdown;
    activeDropdownIndex = -1;
  }

  function getDropdownMatches(type, query) {
    const filteredIds = getFilteredResultIds({
      includeCategory1: type !== 'category1',
      includeCategory2: type !== 'category2',
      includeTags: type !== 'tags'
    });

    if (type === 'category1') {
      return filterCategory1Options(query, filteredIds);
    }

    if (type === 'category2') {
      return filterCategory2Options(query, filteredIds);
    }

    return filterTagOptions(query, filteredIds);
  }

  function applyDropdownSelection(type, item) {
    if (type === 'category1') {
      modalSearchState.category1 = item.name;
      modalSearchState.category2 = '';
      const category2Input = document.querySelector('#search-modal-filter-category2');
      category2Input.disabled = false;
      category2Input.value = '';
    } else if (type === 'category2') {
      modalSearchState.category2 = item.name;
    } else if (!modalSearchState.tags.includes(item.name)) {
      modalSearchState.tags = [...modalSearchState.tags, item.name];
    }

    const input = document.querySelector(`#search-modal-filter-${type}`);
    input.value = '';
    modalDraftFilters[type] = '';

    hideAllDropdowns();
    renderSelectedChips();
    renderModalPreview();
  }

  function filterCategory1Options(query, ids) {
    const matches = [];

    Object.entries(window.siteSearch.categories).forEach(([key, category]) => {
      const name = category?.A?.name;
      if (!name) return;

      const count = intersectCount(ids, category.A.ids);
      if (count > 0 && name.toLowerCase().includes(query)) {
        matches.push({key, name, count});
      }
    });

    return matches.sort((a, b) => a.name.localeCompare(b.name));
  }

  function filterCategory2Options(query, ids) {
    if (!modalSearchState.category1) {
      return [];
    }

    const parent = window.siteSearch.categories[modalSearchState.category1.toLowerCase()];
    if (!parent) {
      return [];
    }

    const matches = [];
    Object.entries(parent).forEach(([key, category]) => {
      if (key === 'A' || !category?.name) return;

      const count = intersectCount(ids, category.ids);
      if (count > 0 && category.name.toLowerCase().includes(query)) {
        matches.push({key, name: category.name, count});
      }
    });

    return matches.sort((a, b) => a.name.localeCompare(b.name));
  }

  function filterTagOptions(query, ids) {
    const selectedTags = new Set(modalSearchState.tags.map((tag) => tag.toLowerCase()));
    const matches = [];

    Object.entries(window.siteSearch.tags).forEach(([key, tag]) => {
      if (selectedTags.has(key) || !tag?.name) return;

      const count = intersectCount(ids, tag.ids);
      if (count > 0 && tag.name.toLowerCase().includes(query)) {
        matches.push({key, name: tag.name, count});
      }
    });

    return matches.sort((a, b) => a.name.localeCompare(b.name));
  }

  function intersectCount(sourceIds, targetIds) {
    const targetSet = new Set(targetIds);
    let count = 0;

    sourceIds.forEach((id) => {
      if (targetSet.has(id)) {
        count += 1;
      }
    });

    return count;
  }

  function getAllIds() {
    return Array.from({length: window.siteSearch.total || 0}, (_, index) => index);
  }

  function getFilteredResultIds(options = {}) {
    const {
      includeCategory1 = true,
      includeCategory2 = true,
      includeTags = true
    } = options;

    let ids;
    let orderedIds = [];
    let resultScores = new Map();

    if (modalSearchState.query) {
      const searchHits = window.siteSearch.index.search(modalSearchState.query);
      orderedIds = searchHits.map((result) => result.item.id);
      resultScores = new Map(searchHits.map((result) => [result.item.id, result.score]));
      ids = new Set(orderedIds);
    } else {
      orderedIds = getAllIds();
      ids = new Set(orderedIds);
    }

    if (includeCategory1 && modalSearchState.category1) {
      const category1 = window.siteSearch.categories[modalSearchState.category1.toLowerCase()];
      const categoryIds = new Set(category1?.A?.ids || []);
      ids = new Set([...ids].filter((id) => categoryIds.has(id)));
    }

    if (includeCategory2 && modalSearchState.category1 && modalSearchState.category2) {
      const parent = window.siteSearch.categories[modalSearchState.category1.toLowerCase()];
      const category2 = parent?.[modalSearchState.category2.toLowerCase()];
      const categoryIds = new Set(category2?.ids || []);
      ids = new Set([...ids].filter((id) => categoryIds.has(id)));
    }

    if (includeTags && modalSearchState.tags.length > 0) {
      ids = filterIdsByTags(ids);
    }

    if (includeCategory1 && modalDraftFilters.category1) {
      ids = applyDraftCategory1Filter(ids, modalDraftFilters.category1);
    }

    if (includeCategory2 && modalDraftFilters.category2) {
      ids = applyDraftCategory2Filter(ids, modalDraftFilters.category2);
    }

    if (includeTags && modalDraftFilters.tags) {
      ids = applyDraftTagFilter(ids, modalDraftFilters.tags);
    }

    const filteredIds = orderedIds.filter((id) => ids.has(id));
    return sortResultIds(filteredIds, modalSearchState, resultScores);
  }

  function applyDraftCategory1Filter(sourceIds, query) {
    const matchingIds = new Set();

    Object.values(window.siteSearch.categories).forEach((category) => {
      const name = category?.A?.name?.toLowerCase();
      if (!name || !name.includes(query)) return;

      category.A.ids.forEach((id) => matchingIds.add(id));
    });

    return new Set([...sourceIds].filter((id) => matchingIds.has(id)));
  }

  function applyDraftCategory2Filter(sourceIds, query) {
    const matchingIds = new Set();

    if (modalSearchState.category1) {
      const parent = window.siteSearch.categories[modalSearchState.category1.toLowerCase()];
      Object.entries(parent || {}).forEach(([key, category]) => {
        if (key === 'A') return;
        const name = category?.name?.toLowerCase();
        if (!name || !name.includes(query)) return;

        category.ids.forEach((id) => matchingIds.add(id));
      });
    } else {
      Object.values(window.siteSearch.categories).forEach((parent) => {
        Object.entries(parent || {}).forEach(([key, category]) => {
          if (key === 'A') return;
          const name = category?.name?.toLowerCase();
          if (!name || !name.includes(query)) return;

          category.ids.forEach((id) => matchingIds.add(id));
        });
      });
    }

    return new Set([...sourceIds].filter((id) => matchingIds.has(id)));
  }

  function applyDraftTagFilter(sourceIds, query) {
    const matchingIds = new Set();

    Object.values(window.siteSearch.tags).forEach((tag) => {
      const name = tag?.name?.toLowerCase();
      if (!name || !name.includes(query)) return;

      tag.ids.forEach((id) => matchingIds.add(id));
    });

    return new Set([...sourceIds].filter((id) => matchingIds.has(id)));
  }

  function filterIdsByTags(sourceIds) {
    const sourceList = Array.isArray(sourceIds) ? sourceIds : [...sourceIds];
    const tagIds = modalSearchState.tags
      .map((tag) => window.siteSearch.tags[tag.toLowerCase()]?.ids || []);

    if (modalSearchState.tagsOp === 'or') {
      const union = new Set();
      tagIds.forEach((ids) => ids.forEach((id) => union.add(id)));
      return new Set(sourceList.filter((id) => union.has(id)));
    }

    if (tagIds.length === 0) {
      return new Set(sourceList);
    }

    let intersection = new Set(tagIds[0]);
    tagIds.slice(1).forEach((ids) => {
      const current = new Set(ids);
      intersection = new Set([...intersection].filter((id) => current.has(id)));
    });

    return new Set(sourceList.filter((id) => intersection.has(id)));
  }

  function renderModalPreview() {
    clearModalResults();

    if (!modalSearchReady) {
      return;
    }

    const ids = getFilteredResultIds();
    const hasActiveFilters = Boolean(
      modalSearchState.query || modalSearchState.category1 || modalSearchState.category2 || modalSearchState.tags.length > 0
    );

    if (!hasActiveFilters) {
      modalSearchResults.appendChild(createElement('li', {
        className: 'search-result-empty',
        text: '검색어를 입력하거나 카테고리와 태그를 선택하세요.'
      }));
      return;
    }

    if (ids.length === 0) {
      const emptyItem = createElement('li', {className: 'search-result-item search-result-empty'});
      emptyItem.appendChild(createElement('div', {
        className: 'search-result-content',
        text: TEXT.noResults
      }));
      modalSearchResults.appendChild(emptyItem);
      updateModalFooter(0);
      return;
    }

    const pages = window.siteSearch.pages || [];
    const previewPages = ids.slice(0, 10).map((id) => pages[id]).filter(Boolean);
    const fragment = document.createDocumentFragment();

    previewPages.forEach((page) => {
      const li = createElement('li', {className: 'search-result-item'});
      const a = createElement('a', {attrs: {href: page.href}});
      a.appendChild(createElement('div', {
        className: 'search-result-title',
        text: page.title
      }));

      if (page.content) {
        const truncated = page.content.length > 150
          ? `${page.content.substring(0, 150)}...`
          : page.content;
        a.appendChild(createElement('div', {
          className: 'search-result-content',
          text: truncated
        }));
      }

      li.appendChild(a);
      fragment.appendChild(li);
    });

    modalSearchResults.appendChild(fragment);
    updateModalFooter(ids.length);
  }

  function updateModalFooter(count) {
    const modalFooter = searchModal.querySelector('.search-modal-footer');
    modalFooter.replaceChildren();

    if (count === 0) {
      modalFooter.style.display = 'none';
      return;
    }

    modalFooter.style.display = 'block';
    const moreDiv = createElement('div', {className: 'search-more'});
    const link = createElement('a', {
      text: TEXT.searchMore.replace('%d', count),
      attrs: {href: buildModalSearchUrl()}
    });

    moreDiv.appendChild(link);
    modalFooter.appendChild(moreDiv);
  }
})();

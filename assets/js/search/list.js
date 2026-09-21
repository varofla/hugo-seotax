document.addEventListener('DOMContentLoaded', function() {
  const SEARCH_PATH = '{{ "search/" | relURL }}';
  const {
    composeUrl,
    createElement,
    getUrlState,
    sortResultIds
  } = window.siteSearch.utils;
  const currentPath = window.location.pathname;
  const isSearchPage = currentPath.startsWith(SEARCH_PATH);

  if (!isSearchPage) {
    return;
  }

  let params = new URLSearchParams(window.location.search);
  let state = getUrlState();
  let liveSearchFrame = null;
  let taxonomyOutsideClickBound = false;
  let isQueryComposing = false;
  let resultScores = new Map();

  const TEXT = {
    searchAction: '검색',
    searchInputPlaceholder: '검색어를 입력해주세요',
    searchResultsTitle: '검색',
    searchCountLabel: '"%q" 검색 결과 %s개',
    searchCountLabelNoQuery: '검색 결과 %s개',
    searchTagsTitle: '검색 태그',
    listCountLabel: '글 %s개',
    categoriesParentSubtitle: '상위 카테고리',
    categoriesChildSubtitle: '하위 카테고리',
    tagsTermsTitle: '태그',
    tagsOpCheckbox: '모두 일치',
    postPrevLink: '이전',
    postNextLink: '다음'
  };

  const searchData = document.querySelector('#search-data');
  const searchResults = document.querySelector('#search-results');
  const noResults = document.querySelector('#search-no-results');
  const listHeader = document.querySelector('#list-header');
  const searchFilterHost = document.querySelector('#search-filter-host');
  const searchActionPath = SEARCH_PATH;
  const browseActionPath = SEARCH_PATH;

  initializeSearchData().then(() => {
    renderSearchPage(state, {replaceUrl: false});
  });

  function initializeSearchData() {
    return Promise.all([
      window.siteSearch.initIndex(),
      window.siteSearch.initCategories(),
      window.siteSearch.initTags()
    ]);
  }

  /**
   * Determine type of search based on current state.
   * @param {Object} state - Current search state
   * @returns {'search'|'category1'|'category2'|'tags'|'combined'|'none'} - Search type
   */
  function getSearchType(state) {
    const hasQuery = (state.query.length > 0);
    const hasCategory1 = (state.category1.length > 0);
    const hasCategory2 = (state.category2.length > 0);
    const hasTags = (state.tags.length > 0);
    const hasCategoryFilters = hasCategory1 || hasCategory2;

    if (hasQuery) {
      if (hasCategoryFilters || hasTags) return 'combined';
      else return 'search';
    } else {
      if (hasCategoryFilters && hasTags) return 'combined';
      if (hasCategory1) return hasCategory2 ? 'category2' : 'category1';
      else if (hasTags) return 'tags';
      else return 'search';
    }
  }

  function buildSearchParamsFromState(searchState) {
    const nextParams = new URLSearchParams();

    if (searchState.query) nextParams.set('query', searchState.query);
    if (searchState.category1) nextParams.set('category1', searchState.category1);
    if (searchState.category2) nextParams.set('category2', searchState.category2);
    if (searchState.tags.length > 0) {
      nextParams.set('tags', searchState.tags.join(','));
      nextParams.set('tagsOp', searchState.tagsOp);
    }
    if (searchState.page > 1) nextParams.set('page', searchState.page);
    if (searchState.pageSize !== 10) nextParams.set('pageSize', searchState.pageSize);

    return nextParams;
  }

  function buildSearchUrlFromState(searchState) {
    return composeUrl(searchActionPath, buildSearchParamsFromState(searchState));
  }

  function collectStateFromControls({preservePage = false} = {}) {
    const queryInput = document.querySelector('#search-query-input');
    const category1Chip = document.querySelector('#filter-category1-chips .search-filter-chip');
    const category2Chip = document.querySelector('#filter-category2-chips .search-filter-chip');
    const tagChips = document.querySelectorAll('#filter-tags-chips .search-filter-chip');
    const tagsOpCheckbox = document.querySelector('#filter-tagsOp');

    return {
      query: queryInput?.value.trim() || '',
      category1: category1Chip?.dataset.name || '',
      category2: category1Chip ? (category2Chip?.dataset.name || '') : '',
      tags: Array.from(tagChips).map((chip) => chip.dataset.name),
      tagsOp: tagsOpCheckbox?.checked ? 'and' : 'or',
      page: preservePage ? state.page : 1,
      pageSize: state.pageSize
    };
  }

  function runSearch(searchState, appendHeader = false) {
    resultScores = new Map();

    switch (getSearchType(searchState)) {
      case 'category1':
        return searchCategory1(searchState, appendHeader);
      case 'category2':
        return searchCategory2(searchState, appendHeader);
      case 'tags':
        return searchTags(searchState, appendHeader);
      case 'combined':
        return searchCombined(searchState, appendHeader);
      case 'search':
      default:
        return searchQuery(searchState, appendHeader);
    }
  }

  function renderSearchPage(nextState, options = {}) {
    const {
      replaceUrl = true,
      refreshControls = true,
      focusQuery = false,
      selectionStart = null,
      selectionEnd = null
    } = options;

    state = nextState;
    params = buildSearchParamsFromState(state);

    const ids = runSearch(state, false);

    if (refreshControls) {
      clearHeader();
      createSearchResultsHeader(ids.size, state.query);
      createSearchFilter();
    } else {
      clearHeader({preserveFilters: true});
      createSearchResultsHeader(ids.size, state.query);
    }

    displayResults(ids, state);

    if (replaceUrl) {
      window.history.replaceState(window.history.state, '', buildSearchUrlFromState(state));
    }

    if (focusQuery) {
      const queryInput = document.querySelector('#search-query-input');
      if (queryInput) {
        queryInput.focus();
        if (selectionStart !== null && selectionEnd !== null) {
          queryInput.setSelectionRange(selectionStart, selectionEnd);
        }
      }
    }
  }

  /**
   * Clear list header and taxonomy section.
   */
  function clearHeader(options = {}) {
    const {preserveFilters = false} = options;

    if (!isSearchPage || !listHeader) {
      return;
    }

    listHeader.replaceChildren();
    if (!preserveFilters) {
      searchFilterHost?.replaceChildren();
    }

    const section = document.querySelector('#taxonomy-section');
    section?.classList.add('hidden');
    section?.replaceChildren();
  }

  /**
   * Create header contents (title, icon, and result count)
   * and append to list header.
   * @param {string} titleText - Header title text
   * @param {number} pageCount - The number of results
   * @param {string} [query=''] - Search query (optional)
   */
  function createListHeader(titleText, pageCount, query = '', countLabelOverride = '') {
    const fragment = document.createDocumentFragment();


    const title = createElement('h1');
    title.textContent = titleText || '';
    fragment.appendChild(title);

    const countLabel = countLabelOverride || (query ? TEXT.searchCountLabel.replace('%q', query) : TEXT.listCountLabel);
    const listCount = `<em class="list-count">${pageCount}</em>`;
    fragment.appendChild(createElement('p', {
      className: 'list-header-count',
      html: countLabel.replace('%s', listCount)
    }));

    listHeader.appendChild(fragment);
  }

  function createSearchResultsHeader(pageCount, query = '') {
    const countLabel = query
      ? TEXT.searchCountLabel.replace('%q', query)
      : TEXT.searchCountLabelNoQuery;

    createListHeader(
      TEXT.searchResultsTitle,
      pageCount,
      query,
      countLabel
    );
  }

  /**
   * Create a taxonomy section with category or tag chips
   * and append to list header.
   * @param {string} labelText - Section label text
   * @param {Object[]} taxonomies - Array of taxonomy objects to display
   */
  function createTaxonomySection(labelText, taxonomies) {
    const fragment = document.createDocumentFragment();
    const section = document.querySelector('#taxonomy-section');
    if (!section) return;

    section.classList.remove('hidden');
    const label = createElement('h2', {text: labelText});
    const chips = createElement('div', {className: 'taxonomy-chips'});
    taxonomies.forEach(taxonomy => {
      chips.appendChild(createTaxonomyChip(taxonomy));
    });

    fragment.appendChild(label);
    fragment.appendChild(chips);
    section.appendChild(fragment);
  }

  /**
   * Create a single taxonomy chip element with link and count.
   * @param {Object} options - Chip configuration
   * @param {string} options.text - Chip text
   * @param {string} options.icon - Font Awesome icon class
   * @param {string} options.href - Link URL
   * @param {number} options.pageCount - The number of pages in this taxonomy
   * @returns {HTMLElement} Created chip element
   */
  function createTaxonomyChip({text, icon, href, pageCount}) {
    const chip = createElement('div', {className: 'taxonomy-chip'});

    const a = createElement('a', {className: 'taxonomy-link', attrs: {href: href}});
    const countLabel = `<span class="taxonomy-count">(${pageCount})</span>`;
    a.appendChild(createElement('span', {
      className: 'taxonomy-name',
      html: `<i class="${icon}"></i> ${text} ${countLabel}`
    }));

    chip.appendChild(a);
    return chip;
  }

  /**
   * Create a query filter with input and button.
   * @param {string} [options.queryValue=''] - Initial query value
   * @returns {DocumentFragment} Query filter element
   */
  function createQueryFilter(queryValue = '') {
    const queryRow = createElement('div', {className: 'search-query-row'});
    const inputWrapper = createElement('div', {className: 'query-input-wrapper'});

    const queryInput = createElement('input', {
      id: 'search-query-input',
      className: 'search-query-input',
      attrs: {type: 'text', maxLength: 64, placeholder: TEXT.searchInputPlaceholder, 'aria-label': TEXT.searchAction, value: queryValue}
    });
    inputWrapper.appendChild(queryInput);

    const queryButton = createElement('button', {
      className: 'search-query-button',
      attrs: {type: 'button', 'aria-label': TEXT.searchAction}
    });
    const queryButtonIcon = createElement('i', {className: 'icon-search'});
    queryButton.appendChild(queryButtonIcon);
    inputWrapper.appendChild(queryButton);
    queryRow.appendChild(inputWrapper);

    return queryRow;
  }

  /**
   * Setup event listeners for query row in search filter.
   */
  function setupQueryFilterEvents() {
    const queryInput = document.querySelector('#search-query-input');
    const queryButton = document.querySelector('.search-query-button');

    const performSearch = () => {
      cancelLiveSearchFrame();

      renderSearchPage(collectStateFromControls({preservePage: false}), {
        replaceUrl: true,
        refreshControls: false,
        focusQuery: true,
        selectionStart: queryInput.selectionStart,
        selectionEnd: queryInput.selectionEnd
      });
    };

    queryInput.addEventListener('compositionstart', function() {
      isQueryComposing = true;
    });

    queryInput.addEventListener('compositionend', function() {
      isQueryComposing = false;
      const selectionStart = this.selectionStart;
      const selectionEnd = this.selectionEnd;

      scheduleLiveSearch(() => {
        renderSearchPage(collectStateFromControls({preservePage: false}), {
          replaceUrl: false,
          refreshControls: false,
          focusQuery: true,
          selectionStart,
          selectionEnd
        });
      });
    });

    queryInput.addEventListener('input', function() {
      if (isQueryComposing) {
        return;
      }

      const selectionStart = this.selectionStart;
      const selectionEnd = this.selectionEnd;

      scheduleLiveSearch(() => {
        renderSearchPage(collectStateFromControls({preservePage: false}), {
          replaceUrl: false,
          refreshControls: false,
          focusQuery: true,
          selectionStart,
          selectionEnd
        });
      });
    });

    queryInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        performSearch();
      }
    });

    queryButton.addEventListener('click', performSearch);
  }

  function cancelLiveSearchFrame() {
    if (liveSearchFrame !== null) {
      window.cancelAnimationFrame(liveSearchFrame);
      liveSearchFrame = null;
    }
  }

  function scheduleLiveSearch(callback) {
    cancelLiveSearchFrame();
    liveSearchFrame = window.requestAnimationFrame(() => {
      liveSearchFrame = null;
      callback();
    });
  }

  /**
   * Create a category filter.
   * @param {string} type - Filter type ('category1' or 'category2')
   * @param {boolean} [disabled=false] - Whether input should be disabled
   * @returns {HTMLElement} Taxonomy filter element
   */
  function createCategoryFilter(type, disabled = false) {
    const isCategory2 = (type === 'category2');
    const filterLabel = isCategory2 ? TEXT.categoriesChildSubtitle : TEXT.categoriesParentSubtitle;

    const taxonomyFilter = createElement('div', {className: 'taxonomy-filter'});
    taxonomyFilter.appendChild(createElement('label', {
      text: filterLabel,
      attrs: {for: `filter-${type}`}
    }));

    const inputWrapper = createElement('div', {className: 'taxonomy-input-wrapper'});

    const input = createElement('input', {
      id: `filter-${type}`,
      className: 'search-filter-input',
      attrs: {type: 'text', placeholder: filterLabel, autocomplete: 'off'}
    });
    if (disabled) input.disabled = true;
    inputWrapper.appendChild(input);

    const dropdown = createElement('div', {
      id: `filter-${type}-dropdown`,
      className: 'search-filter-dropdown hidden'
    });
    inputWrapper.appendChild(dropdown);

    taxonomyFilter.appendChild(inputWrapper);

    const selected = createElement('div', {
      id: `filter-${type}-chips`,
      className: 'search-filter-chips'
    });
    taxonomyFilter.appendChild(selected);

    return taxonomyFilter;
  }

  /**
   * Create a tags filter.
   * @returns {HTMLElement} Taxonomy filter element
   */
  function createTagsFilter() {
    const taxonomyFilter = createElement('div', {className: 'taxonomy-filter taxonomy-filter-wide'});

    const filterLabel = TEXT.tagsTermsTitle;
    taxonomyFilter.appendChild(createElement('label', {
      text: filterLabel,
      attrs: {for: 'filter-tags'}
    }));

    const inputWrapper = createElement('div', {className: 'taxonomy-input-wrapper'});

    const input = createElement('input', {
      id: 'filter-tags',
      className: 'search-filter-input',
      attrs: {type: 'text', placeholder: filterLabel, autocomplete: 'off'}
    });
    inputWrapper.appendChild(input);

    const dropdown = createElement('div', {
      id: 'filter-tags-dropdown',
      className: 'search-filter-dropdown hidden'
    });
    inputWrapper.appendChild(dropdown);

    taxonomyFilter.appendChild(inputWrapper);

    const selected = createElement('div', {
      id: 'filter-tags-chips',
      className: 'search-filter-chips search-filter-chips-wrap'
    });
    taxonomyFilter.appendChild(selected);

    return taxonomyFilter;
  }

  /**
   * Create tags operation checkbox.
   * @returns {HTMLElement} Taxonomy filter element
   */
  function createTagsOpCheckbox() {
    const taxonomyFilter = createElement('div', {className: 'taxonomy-filter tags-op-checkbox'});
    const label = createElement('label', {className: 'tags-op-label'});

    const checkbox = createElement('input', {
      id: 'filter-tagsOp',
      attrs: {type: 'checkbox'}
    });
    checkbox.checked = (state.tagsOp === 'and');
    label.appendChild(checkbox);

    label.appendChild(createElement('span', {
      text: TEXT.tagsOpCheckbox
    }));

    taxonomyFilter.appendChild(label);
    return taxonomyFilter;
  }

  /**
   * Create a search filter without taxonomy filters and append to list header. (deprecated)
   */
  function createSimpleSearchBar() {
    const fragment = document.createDocumentFragment();
    const searchFilter = createElement('div', {className: 'search-filter'});
    const queryFilter = createQueryFilter();

    searchFilter.appendChild(queryFilter);
    fragment.appendChild(searchFilter);
    searchFilterHost?.appendChild(fragment);

    setupQueryFilterEvents();
  }

  /**
   * Create a search filter with taxonomy filters and append to dedicated host.
   * @param {Set.<number>} ids - Set of post IDs from search results
   */
  function createSearchFilter() {
    const fragment = document.createDocumentFragment();
    const searchFilter = createElement('div', {className: 'search-filter'});

    const queryFilter = createQueryFilter(state.query);
    searchFilter.appendChild(queryFilter);

    const taxonomiesRow = createElement('div', {className: 'search-taxonomies-row'});

    const categoriesFilter = createElement('div', {className: 'search-categories-filter'});
    categoriesFilter.appendChild(createCategoryFilter('category1'));
    categoriesFilter.appendChild(createCategoryFilter('category2', true));
    taxonomiesRow.appendChild(categoriesFilter);

    const tagsFilter = createElement('div', {className: 'search-tags-filter'});
    tagsFilter.appendChild(createTagsFilter());
    tagsFilter.appendChild(createTagsOpCheckbox());
    taxonomiesRow.appendChild(tagsFilter);

    searchFilter.appendChild(taxonomiesRow);
    fragment.appendChild(searchFilter);
    searchFilterHost?.appendChild(fragment);

    setupQueryFilterEvents();
    setupTaxonomyFilterEvents();
    initFiltersFromState();
  }

  /**
   * Setup event listeners for taxonomy filter inputs and dropdowns.
   */
  function setupTaxonomyFilterEvents() {
    const category1Input = document.querySelector('#filter-category1');
    const category1Dropdown = document.querySelector('#filter-category1-dropdown');
    const category2Input = document.querySelector('#filter-category2');
    const category2Dropdown = document.querySelector('#filter-category2-dropdown');
    const tagsInput = document.querySelector('#filter-tags');
    const tagsDropdown = document.querySelector('#filter-tags-dropdown');

    let activeIndex = -1;
    let activeDropdown = null;

    category1Input.addEventListener('input', function() {
      const query = this.value.trim().toLowerCase();
      const matches = filterCategories1(query, getLiveSearchIds());

      if (matches.length > 0) {
        renderDropdownFilter(category1Dropdown, matches, 'category1');
        category1Dropdown.classList.remove('hidden');
        activeDropdown = category1Dropdown;
        activeIndex = -1;
      } else {
        category1Dropdown.classList.add('hidden');
        activeDropdown = null;
        activeIndex = -1;
      }
    });

    category1Input.addEventListener('focus', function() {
      // Close other dropdowns
      category2Dropdown.classList.add('hidden');
      tagsDropdown.classList.add('hidden');

      const query = this.value.trim().toLowerCase();
      const matches = filterCategories1(query, getLiveSearchIds());
      if (matches.length > 0) {
        renderDropdownFilter(category1Dropdown, matches, 'category1');
        category1Dropdown.classList.remove('hidden');
        activeDropdown = category1Dropdown;
      }
    });

    category2Input.addEventListener('input', function() {
      const query = this.value.trim().toLowerCase();
      const matches = filterCategories2(query, getLiveSearchIds());

      if (matches.length > 0) {
        renderDropdownFilter(category2Dropdown, matches, 'category2');
        category2Dropdown.classList.remove('hidden');
        activeDropdown = category2Dropdown;
        activeIndex = -1;
      } else {
        category2Dropdown.classList.add('hidden');
        activeDropdown = null;
        activeIndex = -1;
      }
    });

    category2Input.addEventListener('focus', function() {
      if (this.disabled) return;

      // Close other dropdowns
      category1Dropdown.classList.add('hidden');
      tagsDropdown.classList.add('hidden');

      const query = this.value.trim().toLowerCase();
      const matches = filterCategories2(query, getLiveSearchIds());
      if (matches.length > 0) {
        renderDropdownFilter(category2Dropdown, matches, 'category2');
        category2Dropdown.classList.remove('hidden');
        activeDropdown = category2Dropdown;
      }
    });

    tagsInput.addEventListener('input', function() {
      const query = this.value.trim().toLowerCase();
      const matches = filterTags(query, getLiveSearchIds());

      if (matches.length > 0) {
        renderDropdownFilter(tagsDropdown, matches, 'tags');
        tagsDropdown.classList.remove('hidden');
        activeDropdown = tagsDropdown;
        activeIndex = -1;
      } else {
        tagsDropdown.classList.add('hidden');
        activeDropdown = null;
        activeIndex = -1;
      }
    });

    tagsInput.addEventListener('focus', function() {
      // Close other dropdowns
      category1Dropdown.classList.add('hidden');
      category2Dropdown.classList.add('hidden');

      const query = this.value.trim().toLowerCase();
      const matches = filterTags(query, getLiveSearchIds());
      if (matches.length > 0) {
        renderDropdownFilter(tagsDropdown, matches, 'tags');
        tagsDropdown.classList.remove('hidden');
        activeDropdown = tagsDropdown;
      }
    });

    // Keyboard navigation for all inputs
    [category1Input, category2Input, tagsInput].forEach(input => {
      input.addEventListener('keydown', function(e) {
        if (!activeDropdown || activeDropdown.classList.contains('hidden')) {
          return;
        }

        const items = activeDropdown.querySelectorAll('.search-filter-dropdown-item');
        if (items.length === 0) return;

        switch(e.key) {
          case 'ArrowDown':
            e.preventDefault();
            activeIndex = (activeIndex + 1) % items.length;
            updateActiveItem(items, activeIndex);
            break;
          case 'ArrowUp':
            e.preventDefault();
            activeIndex = (activeIndex - 1 + items.length) % items.length;
            updateActiveItem(items, activeIndex);
            break;
          case 'Enter':
            e.preventDefault();
            if (items.length > 0) {
              if (activeIndex >= 0 && activeIndex < items.length) {
                items[activeIndex].click();
              } else {
                // Select first item if no item is active
                items[0].click();
              }
            }
            break;
          case 'Escape':
            e.preventDefault();
            activeDropdown.classList.add('hidden');
            activeDropdown = null;
            activeIndex = -1;
            break;
        }
      });
    });

    bindTaxonomyOutsideClick();
    
    // TagsOp checkbox change listener
    const tagsOpCheckbox = document.querySelector('#filter-tagsOp');
    tagsOpCheckbox.addEventListener('change', function() {
      renderSearchPage(collectStateFromControls({preservePage: false}), {
        replaceUrl: false,
        refreshControls: false
      });
    });

    /**
     * Update active item styling in dropdown
     */
    function updateActiveItem(items, index) {
      items.forEach((item, i) => {
        if (i === index) {
          item.classList.add('active');
          item.scrollIntoView({block: 'nearest'});
        } else {
          item.classList.remove('active');
        }
      });
    }
  }

  function getLiveSearchIds() {
    return runSearch(collectStateFromControls({preservePage: true}), false);
  }

  function bindTaxonomyOutsideClick() {
    if (taxonomyOutsideClickBound) {
      return;
    }

    document.addEventListener('click', function(e) {
      if (e.target.closest('.taxonomy-filter')) {
        return;
      }

      document.querySelectorAll('.search-filter-dropdown').forEach((dropdown) => {
        dropdown.classList.add('hidden');
      });
    });

    taxonomyOutsideClickBound = true;
  }

  /**
   * Initialize filter chips from URL parameters.
   */
  function initFiltersFromState() {
    const categories = window.siteSearch.categories;
    const tags = window.siteSearch.tags;

    if (state.category1) {
      const category1Data = categories[state.category1.toLowerCase()];
      if (category1Data && category1Data['A']) {
        const chipsContainer = document.querySelector('#filter-category1-chips');
        const chip = createFilterChip(category1Data['A']['name'], state.category1, 'category1');
        chipsContainer.appendChild(chip);

        const category2Input = document.querySelector('#filter-category2');
        category2Input.disabled = false;

        if (state.category2) {
          const category2Data = category1Data[state.category2.toLowerCase()];
          if (category2Data) {
            const category2Chips = document.querySelector('#filter-category2-chips');
            const chip2 = createFilterChip(category2Data['name'], state.category2, 'category2');
            category2Chips.appendChild(chip2);
          }
        }
      }
    }

    if (state.tags && state.tags.length > 0) {
      const tagsChips = document.querySelector('#filter-tags-chips');
      state.tags.forEach(tagKey => {
        const tagData = tags[tagKey.toLowerCase()];
        if (tagData) {
          const chip = createFilterChip(tagData['name'], tagKey, 'tags');
          tagsChips.appendChild(chip);
        }
      });
    }
  }

  /**
   * Filter parent categories based on query string and search result ids.
   * @param {string} query - Search query
   * @param {Set.<number>} ids - Set of post IDs from search results
   * @returns {Array} Array of matching categories with name and count
   */
  function filterCategories1(query, ids) {
    const categories = window.siteSearch.categories;
    const matches = [];

    for (const key in categories) {
      const category = categories[key];
      if (category['A'] && category['A']['name']) {
        const name = category['A']['name'];
        // Calculate intersection count
        const categoryIds = new Set(category['A']['ids']);
        const intersectionCount = [...ids].filter(id => categoryIds.has(id)).length;

        // Only include if there's at least one match and name matches query
        if (intersectionCount > 0 && name.toLowerCase().includes(query)) {
          matches.push({
            name: name,
            count: intersectionCount,
            key: key
          });
        }
      }
    }

    return matches.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Filter child categories based on query string, selected parent, and search result ids.
   * @param {string} query - Search query
   * @param {Set.<number>} ids - Set of post IDs from search results
   * @returns {Array} Array of matching categories with name and count
   */
  function filterCategories2(query, ids) {
    // Get selected parent category from chips or state
    const category1Chips = document.querySelector('#filter-category1-chips');
    const selectedChip = category1Chips?.querySelector('.search-filter-chip');
    if (!selectedChip) return [];

    const parentKey = selectedChip.dataset.key.toLowerCase();
    const categories = window.siteSearch.categories;
    const parentCategory = categories[parentKey];
    if (!parentCategory) return [];

    const matches = [];
    for (const key in parentCategory) {
      if (key === 'A') continue;
      const category = parentCategory[key];
      if (category && category['name']) {
        const name = category['name'];
        // Calculate intersection count
        const categoryIds = new Set(category['ids']);
        const intersectionCount = [...ids].filter(id => categoryIds.has(id)).length;

        // Only include if there's at least one match and name matches query
        if (intersectionCount > 0 && name.toLowerCase().includes(query)) {
          matches.push({
            name: name,
            count: intersectionCount,
            key: key
          });
        }
      }
    }

    return matches.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Filter tags based on query string and search result ids.
   * @param {string} query - Search query
   * @param {Set.<number>} ids - Set of post IDs from search results
   * @returns {Array} Array of matching tags with name and count
   */
  function filterTags(query, ids) {
    const tags = window.siteSearch.tags;
    const matches = [];
    const selectedTags = new Set(state.tags.map(t => t.toLowerCase()));

    for (const key in tags) {
      if (selectedTags.has(key.toLowerCase())) continue;

      const tag = tags[key];
      if (tag && tag['name']) {
        const name = tag['name'];
        // Calculate intersection count
        const tagIds = new Set(tag['ids']);
        const intersectionCount = [...ids].filter(id => tagIds.has(id)).length;

        // Only include if there's at least one match and name matches query
        if (intersectionCount > 0 && name.toLowerCase().includes(query)) {
          matches.push({
            name: name,
            count: intersectionCount,
            key: key
          });
        }
      }
    }

    return matches.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Render dropdown items for autocomplete.
   * @param {HTMLElement} dropdown - Dropdown container
   * @param {Array} items - Array of items to display
   * @param {string} type - Type of filter ('category1', 'category2', 'tags')
   */
  function renderDropdownFilter(dropdown, items, type) {
    dropdown.replaceChildren();
    const fragment = document.createDocumentFragment();

    items.forEach(item => {
      const div = createElement('div', {
        className: 'search-filter-dropdown-item',
        dataset: {key: item.key, name: item.name}
      });

      div.appendChild(createElement('span', {
        className: 'dropdown-item-name',
        text: item.name
      }));

      div.appendChild(createElement('span', {
        className: 'dropdown-item-count',
        text: `(${item.count})`
      }));

      div.addEventListener('click', function() {
        handleDropdownSelection(type, item);
      });

      fragment.appendChild(div);
    });

    dropdown.appendChild(fragment);
  }

  /**
   * Handle selection from dropdown.
   * @param {string} type - Type of filter
   * @param {Object} item - Selected item
   */
  function handleDropdownSelection(type, item) {
    const dropdown = document.querySelector(`#filter-${type}-dropdown`);
    const input = document.querySelector(`#filter-${type}`);
    const chipsContainer = document.querySelector(`#filter-${type}-chips`);

    dropdown.classList.add('hidden');
    input.value = '';

    if (type === 'category1') {
      chipsContainer.replaceChildren();

      const chip = createFilterChip(item.name, item.key, type);
      chipsContainer.appendChild(chip);

      const category2Input = document.querySelector('#filter-category2');
      category2Input.disabled = false;

      const category2Chips = document.querySelector('#filter-category2-chips');
      category2Chips.replaceChildren();

    } else if (type === 'category2') {
      chipsContainer.replaceChildren();

      const chip = createFilterChip(item.name, item.key, type);
      chipsContainer.appendChild(chip);
    } else if (type === 'tags') {
      const existingChips = chipsContainer.querySelectorAll('.search-filter-chip');
      for (const existingChip of existingChips) {
        if (existingChip.dataset.key === item.key) {
          return;
        }
      }

      const chip = createFilterChip(item.name, item.key, type);
      chipsContainer.appendChild(chip);
    }

    renderSearchPage(collectStateFromControls({preservePage: false}), {
      replaceUrl: false,
      refreshControls: false
    });
  }

  /**
   * Create a filter chip element with remove button.
   * @param {string} name - Display name
   * @param {string} key - Data key
   * @param {string} type - Filter type
   * @returns {HTMLElement} Chip element
   */
  function createFilterChip(name, key, type) {
    const chip = createElement('div', {
      className: 'search-filter-chip',
      dataset: {key: key, name: name},
      styles: {cursor: 'pointer'}
    });

    chip.appendChild(createElement('span', {
      className: 'chip-name',
      text: name
    }));

    chip.appendChild(createElement('button', {
      className: 'chip-remove',
      attrs: {'aria-label': `${name} 필터 해제`},
      html: '&times;'
    }));

    chip.addEventListener('click', function(e) {
      handleChipRemove(type, chip);
    });

    return chip;
  }

  /**
   * Handle chip removal.
   * @param {string} type - Filter type
   * @param {HTMLElement} chip - Chip element to remove
   */
  function handleChipRemove(type, chip) {
    chip.remove();

    if (type === 'category1') {
      // Disable and clear category2
      const category2Input = document.querySelector('#filter-category2');
      category2Input.disabled = true;
      category2Input.value = '';

      const category2Chips = document.querySelector('#filter-category2-chips');
      category2Chips.replaceChildren();

      const category2Dropdown = document.querySelector('#filter-category2-dropdown');
      category2Dropdown.classList.add('hidden');
    }

    renderSearchPage(collectStateFromControls({preservePage: false}), {
      replaceUrl: false,
      refreshControls: false
    });
  }

  /**
   * Search for posts matching query string.
   * @param {Object} state - Current search state
   * @param {boolean} [appendHeader=false] - Whether to append the header
   * @returns {number[]} Array of matching post IDs
   */
  function searchQuery(state, appendHeader = false) {
    let searchPosts = new Set();
    if (state.query) {
      const searchHits = window.siteSearch.index.search(state.query);
      searchPosts = new Set(searchHits.map(result => result.item.id));
      resultScores = new Map(searchHits.map(result => [result.item.id, result.score]));
    } else {
      const total = window.siteSearch.total;
      searchPosts = new Set(Array.from({length: total}, (_, i) => i));
    }

    if (appendHeader) {
      clearHeader();
      createSearchResultsHeader(searchPosts.size, state.query);
      if (isSearchPage) {
        createSearchFilter(searchPosts);
      }
    }

    return searchPosts;
  }

  /**
   * Search for posts in a specific parent category.
   * @param {Object} state - Current search state
   * @param {boolean} [appendHeader=false] - Whether to append the header
   * @returns {Set.<number>} Set of matching post IDs
   */
  function searchCategory1(state, appendHeader = false) {
    const category1 = window.siteSearch.categories[state.category1.toLowerCase()];
    const hasCategory1 = (category1 instanceof Object) && (Object.keys(category1).length > 0);
    const category1Posts = hasCategory1 ? category1['A']['ids'] : [];

    if (appendHeader) {
      clearHeader();
      createSearchResultsHeader(category1Posts.length, state.query);
      createSearchFilter(category1Posts);
    }

    return new Set(category1Posts);
  }

  /**
   * Search for posts in a specific child category.
   * @param {Object} state - Current search state
   * @param {boolean} [appendHeader=false] - Whether to append the header
   * @returns {Set.<number>} Set of matching post IDs
   */
  function searchCategory2(state, appendHeader = false) {
    const category1 = window.siteSearch.categories[state.category1.toLowerCase()];
    const hasCategory1 = (category1 instanceof Object) && (Object.keys(category1).length > 0);

    const category2 = hasCategory1 ? category1[state.category2.toLowerCase()] : null;
    const hasCategory2 = hasCategory1 && (category2 instanceof Object) && (Object.keys(category2).length > 0);
    const category2Posts = hasCategory2 ? category2['ids'] : [];

    if (appendHeader) {
      clearHeader();
      createSearchResultsHeader(category2Posts.length, state.query);
      createSearchFilter(category2Posts);
    }

    return new Set(category2Posts);
  }

  /**
   * Search for posts matching specific tags (AND/OR operation).
   * @param {Object} state - Current search state
   * @param {boolean} [appendHeader=false] - Whether to append the header
   * @returns {Set.<number>} Set of matching post IDs
   */
  function searchTags(state, appendHeader = false) {
    const tags = window.siteSearch.tags;
    const union = (state.tagsOp === 'or');
    const tagNames = new Array();
    let tagPosts = new Set();

    state.tags.forEach((t, index) => {
      const tag = tags[t.toLowerCase()];
      if (tag instanceof Object) {
        tagNames.push(tag['name']);
        const ids = new Set(tag['ids']);
        if (union) {
          ids.forEach(id => tagPosts.add(id));
        } else {
          if (index === 0) {
            tagPosts = ids;
          } else {
            tagPosts = new Set([...tagPosts].filter(id => ids.has(id)));
          }
        }
      }
    });

    if (appendHeader) {
      clearHeader();
      createSearchResultsHeader(tagPosts.size, state.query);
      createSearchFilter(tagPosts);
    }

    return tagPosts;
  }

  /**
   * Perform a combined search with query, categories, and tags.
   * @param {Object} state - Current search state
   * @param {boolean} [appendHeader=false] - Whether to append the header
   * @returns {Set.<number>} Set of matching post IDs
   */
  function searchCombined(state, appendHeader = false) {
    let searchPosts;

    if (state.query) {
      const searchHits = window.siteSearch.index.search(state.query);
      searchPosts = new Set(searchHits.map(result => result.item.id));
      resultScores = new Map(searchHits.map(result => [result.item.id, result.score]));
    } else {
      searchPosts = new Set(Array.from({length: window.siteSearch.total}, (_, i) => i));
    }

    if ((searchPosts.size > 0) && state.category1) {
      if (state.category2) {
        const category2Posts = searchCategory2(state, false);
        searchPosts = new Set([...searchPosts].filter(id => category2Posts.has(id)));
      } else {
        const category1Posts = searchCategory1(state, false);
        searchPosts = new Set([...searchPosts].filter(id => category1Posts.has(id)));
      }
    }

    if ((searchPosts.size > 0) && (state.tags.length > 0)) {
      const tagPosts = searchTags(state, false);
      searchPosts = new Set([...searchPosts].filter(id => tagPosts.has(id)));
    }

    if (appendHeader) {
      clearHeader();
      createSearchResultsHeader(searchPosts.size, state.query);
      if (isSearchPage) {
        createSearchFilter(searchPosts);
      }
    }

    return searchPosts;
  }

  /**
   * Clear all search results from results container.
   */
  function clearResults() {
    searchResults.replaceChildren();
    searchResults.classList.add('hidden');
    noResults.classList.remove('hidden');
  }

  /**
   * Display search results for current page with pagination.
   * @param {Set.<number>} ids - Set of post IDs to display
   * @param {Object} state - Current search state with page and pageSize
   */
  function displayResults(ids, state) {
    clearResults();
    const totalPosts = ids.size;
    const paginationNav = document.querySelector('#pagination');

    if (totalPosts === 0) {
      paginationNav?.classList.add('hidden');
      return;
    }

    const fragment = document.createDocumentFragment();
    const sortedIds = sortResultIds(ids, state, resultScores);
    const searchItems = searchData.querySelectorAll('.search-item');

    const totalPages = Math.ceil(totalPosts / state.pageSize);

    if (state.page > totalPages) {
      const redirectParams = new URLSearchParams(params);
      redirectParams.set('page', totalPages);
      window.location.href = `${composeUrl(browseActionPath, redirectParams)}#pagination-anchor`;
      return;
    }

    const startIndex = (state.page - 1) * state.pageSize;
    const endIndex = Math.min(startIndex + state.pageSize, totalPosts);

    for (let i = startIndex; i < endIndex; i++) {
      const curIndex = sortedIds[i];
      fragment.appendChild(searchItems[curIndex].cloneNode(true));
    }

    noResults.classList.add('hidden');
    searchResults.classList.remove('hidden');
    searchResults.appendChild(fragment);

    if (totalPages > 1) {
      const groupNumber = Math.floor((state.page - 1) / 10);
      const groupStart = groupNumber * 10 + 1;
      const groupEnd = Math.min(groupStart + 9, totalPages);

      const pages = Array.from(
        { length: groupEnd - groupStart + 1 }, 
        (_, i) => groupStart + i
      );

      const prev = groupStart > 1 ? groupStart - 1 : null;
      const next = groupEnd < totalPages ? groupEnd + 1 : null;

      displayPagination({
        cur: state.page,
        prev: prev,
        next: next,
        pages: pages,
      });
    } else {
      if (paginationNav) {
        paginationNav.classList.add('hidden');
      }
    }
  }

  /**
   * Display pagination controls with page numbers and prev/next links.
   * @param {Object} options - Pagination configuration
   * @param {number} options.cur - Current page number
   * @param {number[]} options.pages - Array of page numbers to display
   * @param {number|null} [options.prev=null] - Previous group page number (null if none)
   * @param {number|null} [options.next=null] - Next group page number (null if none)
   */
  function displayPagination({cur, pages, prev = null, next = null}) {
    const paginationNav = document.querySelector('#pagination');

    if (!paginationNav) {
      return;
    }

    const fragment = document.createDocumentFragment();

    const createPageUrl = (page) => {
      const newParams = new URLSearchParams(params);
      newParams.set('page', page);
      return `${composeUrl(browseActionPath, newParams)}#pagination-anchor`;
    };

    (function appendPrevLink() {
      let nav;
      if (prev !== null) {
        nav = createElement('a', {className: 'pagination-nav pagination-link', attrs: {href: createPageUrl(prev)}});
      } else {
        nav = createElement('span', {className: 'pagination-nav disabled'});
      }
      nav.appendChild(createElement('i', {className: 'icon-backward'}));
      nav.appendChild(document.createTextNode(' '));
      nav.appendChild(createElement('span', {text: TEXT.postPrevLink}));
      fragment.appendChild(nav);
    })();

    (function appendPageLinks() {
      const pagesDiv = createElement('div', {className: 'pagination-pages'});
      pages.forEach(page => {
        if (page === cur) {
          pagesDiv.appendChild(createElement('span', {
            id: 'current-page',
            className: 'pagination-page current',
            attrs: {'aria-current': 'page'},
            text: page.toString()
          }));
        } else {
          pagesDiv.appendChild(createElement('a', {
            className: 'pagination-page pagination-link',
            text: page.toString(),
            attrs: {href: createPageUrl(page)}
          }));
        }
      });
      fragment.appendChild(pagesDiv);
    })();

    (function appendNextLink() {
      let nav;
      if (next !== null) {
        nav = createElement('a', {className: 'pagination-nav pagination-link', attrs: {href: createPageUrl(next)}});
      } else {
        nav = createElement('span', {className: 'pagination-nav disabled'});
      }
      nav.appendChild(createElement('span', {text: TEXT.postNextLink}));
      nav.appendChild(document.createTextNode(' '));
      nav.appendChild(createElement('i', {className: 'icon-forward'}));
      fragment.appendChild(nav);
    })();

    paginationNav.replaceChildren(fragment);
    paginationNav.classList.remove('hidden');
  }
});

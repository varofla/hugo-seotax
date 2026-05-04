document.addEventListener('DOMContentLoaded', function() {
  const CATEGORY_PATH = '{{ "category/" | relURL }}';
  const CATEGORIES_PATH = '{{ "categories/" | relURL }}';
  const {capitalize, createElement} = window.siteSearch.utils;
  const currentPath = window.location.pathname;

  if (!currentPath.startsWith(CATEGORY_PATH)) {
    return;
  }

  const titleElement = document.querySelector('#category-title');
  const countElement = document.querySelector('#category-count');
  const resultsElement = document.querySelector('#category-results');
  const noResultsElement = document.querySelector('#category-no-results');
  const paginationElement = document.querySelector('#pagination');

  const TEXT = {
    postPrevLink: '이전',
    postNextLink: '다음'
  };

  const state = getCategoryState();

  if (!state.category1) {
    window.location.replace(CATEGORIES_PATH);
    return;
  }

  Promise.all([
    window.siteSearch.initCategories(),
    window.siteSearch.initPostItems()
  ]).then(() => {
    const categoryData = resolveCategoryData(state);
    updateHeader(categoryData, categoryData.ids.length);
    displayResults(categoryData.ids, state);
  });

  /**
   * Read category slugs from URL path segments and page/pageSize from query params.
   * e.g. /category/dev-boards/arduino/ → { category1: 'dev-boards', category2: 'arduino', ... }
   */
  function getCategoryState() {
    const relative = currentPath.slice(CATEGORY_PATH.length).replace(/\/$/, '');
    const parts = relative.split('/').filter(Boolean);
    const params = new URLSearchParams(window.location.search);
    return {
      category1: parts[0] || '',
      category2: parts[1] || '',
      page: Math.max(1, parseInt(params.get('page'), 10) || 1),
      pageSize: Math.max(1, parseInt(params.get('pageSize'), 10) || 10)
    };
  }

  /**
   * Look up category data from the slug-keyed JSON.
   * categories.json uses lower() keys (e.g. "dev boards"), so we find by
   * comparing urlize(key) against the slug from the URL path.
   */
  function resolveCategoryData(state) {
    const categories = window.siteSearch.categories || {};

    const cat1Key = Object.keys(categories).find(
      k => urlize(k) === state.category1
    );
    const category1 = cat1Key ? categories[cat1Key] : null;
    const hasCategory1 = category1 instanceof Object && 'A' in category1;
    const category1Name = hasCategory1
      ? category1.A.name
      : capitalize(state.category1.replace(/-/g, ' '));

    if (!state.category2) {
      return {
        category1Slug: state.category1,
        category2Slug: '',
        category1Name,
        category2Name: '',
        ids: hasCategory1 ? category1.A.ids : []
      };
    }

    const cat2Key = hasCategory1
      ? Object.keys(category1).find(k => k !== 'A' && urlize(k) === state.category2)
      : null;
    const category2 = cat2Key ? category1[cat2Key] : null;
    const hasCategory2 = category2 instanceof Object && 'name' in category2;
    const category2Name = hasCategory2
      ? category2.name
      : capitalize(state.category2.replace(/-/g, ' '));

    return {
      category1Slug: state.category1,
      category2Slug: state.category2,
      category1Name,
      category2Name,
      ids: hasCategory2 ? category2.ids : []
    };
  }

  function updateHeader(categoryData, count) {
    if (titleElement) {
      titleElement.replaceChildren(createCategoryTitle(categoryData));
    }
    if (countElement) {
      countElement.textContent = count.toString();
    }
  }

  function createCategoryTitle({category1Slug, category2Slug, category1Name, category2Name}) {
    const fragment = document.createDocumentFragment();

    fragment.appendChild(createElement('a', {
      className: 'category-title-link category-title-link--parent',
      text: category1Name,
      attrs: {href: `${CATEGORY_PATH}${category1Slug}/`}
    }));

    if (!category2Name) {
      return fragment;
    }

    fragment.appendChild(createElement('span', {
      className: 'category-title-sep',
      text: '›'
    }));
    fragment.appendChild(createElement('a', {
      className: 'category-title-link category-title-link--child',
      text: category2Name,
      attrs: {href: `${CATEGORY_PATH}${category1Slug}/${category2Slug}/`}
    }));

    return fragment;
  }

  function clearResults() {
    resultsElement?.replaceChildren();
    resultsElement?.classList.add('hidden');
    noResultsElement?.classList.add('hidden');
    paginationElement?.classList.add('hidden');
    paginationElement?.replaceChildren();
  }

  function displayResults(ids, state) {
    clearResults();

    if (!resultsElement || !noResultsElement || !paginationElement) {
      return;
    }

    const totalPosts = ids.length;
    if (totalPosts === 0) {
      noResultsElement.classList.remove('hidden');
      return;
    }

    const totalPages = Math.ceil(totalPosts / state.pageSize);
    if (state.page > totalPages) {
      window.location.href = buildPageUrl(totalPages);
      return;
    }

    const fragment = document.createDocumentFragment();
    const startIndex = (state.page - 1) * state.pageSize;
    const endIndex = Math.min(startIndex + state.pageSize, totalPosts);

    for (let i = startIndex; i < endIndex; i++) {
      const item = window.siteSearch.postItemsMap.get(ids[i]);
      if (!item?.html) {
        continue;
      }
      const template = document.createElement('template');
      template.innerHTML = item.html.trim();
      if (template.content.firstElementChild) {
        fragment.appendChild(template.content.firstElementChild);
      }
    }

    resultsElement.appendChild(fragment);
    resultsElement.classList.remove('hidden');

    if (totalPages > 1) {
      const groupNumber = Math.floor((state.page - 1) / 10);
      const groupStart = groupNumber * 10 + 1;
      const groupEnd = Math.min(groupStart + 9, totalPages);
      const pages = Array.from({length: groupEnd - groupStart + 1}, (_, i) => groupStart + i);

      displayPagination({
        cur: state.page,
        prev: groupStart > 1 ? groupStart - 1 : null,
        next: groupEnd < totalPages ? groupEnd + 1 : null,
        pages
      });
    }
  }

  function buildPageUrl(page) {
    const params = new URLSearchParams(window.location.search);
    params.set('page', page);
    return `${window.location.pathname}?${params.toString()}#pagination-anchor`;
  }

  function displayPagination({cur, pages, prev = null, next = null}) {
    const fragment = document.createDocumentFragment();

    (function appendPrevLink() {
      const nav = prev !== null
        ? createElement('a', {className: 'pagination-nav pagination-link', attrs: {href: buildPageUrl(prev)}})
        : createElement('span', {className: 'pagination-nav disabled'});
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
            text: page.toString()
          }));
        } else {
          pagesDiv.appendChild(createElement('a', {
            className: 'pagination-page pagination-link',
            text: page.toString(),
            attrs: {href: buildPageUrl(page)}
          }));
        }
      });
      fragment.appendChild(pagesDiv);
    })();

    (function appendNextLink() {
      const nav = next !== null
        ? createElement('a', {className: 'pagination-nav pagination-link', attrs: {href: buildPageUrl(next)}})
        : createElement('span', {className: 'pagination-nav disabled'});
      nav.appendChild(createElement('span', {text: TEXT.postNextLink}));
      nav.appendChild(document.createTextNode(' '));
      nav.appendChild(createElement('i', {className: 'icon-forward'}));
      fragment.appendChild(nav);
    })();

    paginationElement.replaceChildren(fragment);
    paginationElement.classList.remove('hidden');
  }

  function urlize(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
});

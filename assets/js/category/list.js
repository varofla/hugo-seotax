document.addEventListener('DOMContentLoaded', function() {
  const CATEGORY_PATH = '{{ "category/" | relURL }}';
  const CATEGORIES_PATH = '{{ "categories/" | relURL }}';
  const {capitalize, composeUrl, createElement, getUrlState} = window.siteSearch.utils;
  const currentPath = window.location.pathname;

  if (!currentPath.startsWith(CATEGORY_PATH)) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const state = getUrlState();
  const titleElement = document.querySelector('#category-title');
  const countElement = document.querySelector('#category-count');
  const resultsElement = document.querySelector('#category-results');
  const noResultsElement = document.querySelector('#category-no-results');
  const paginationElement = document.querySelector('#pagination');

  const TEXT = {
    postPrevLink: '이전',
    postNextLink: '다음'
  };

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

  function resolveCategoryData(state) {
    const categories = window.siteSearch.categories || {};
    const category1 = categories[state.category1.toLowerCase()];
    const hasCategory1 = category1 instanceof Object && Object.keys(category1).length > 0;
    const category1Name = hasCategory1 ? category1.A.name : capitalize(state.category1);

    if (!state.category2) {
      return {
        category1Name,
        category1Value: hasCategory1 ? category1.A.name : state.category1,
        category2Name: '',
        category2Value: '',
        ids: hasCategory1 ? category1.A.ids : []
      };
    }

    const category2 = hasCategory1 ? category1[state.category2.toLowerCase()] : null;
    const hasCategory2 = category2 instanceof Object && Object.keys(category2).length > 0;
    const category2Name = hasCategory2 ? category2.name : capitalize(state.category2);

    return {
      category1Name,
      category1Value: hasCategory1 ? category1.A.name : state.category1,
      category2Name,
      category2Value: hasCategory2 ? category2.name : state.category2,
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

  function createCategoryTitle({category1Name, category1Value, category2Name = '', category2Value = ''}) {
    const fragment = document.createDocumentFragment();
    const category1Params = new URLSearchParams();
    category1Params.set('category1', category1Value);

    fragment.appendChild(createElement('a', {
      className: 'category-title-link category-title-link--parent',
      text: category1Name,
      attrs: {href: composeUrl(CATEGORY_PATH, category1Params)}
    }));

    if (!category2Name) {
      return fragment;
    }

    const category2Params = new URLSearchParams();
    category2Params.set('category1', category1Value);
    category2Params.set('category2', category2Value);

    fragment.appendChild(createElement('span', {
      className: 'category-title-sep',
      text: '›'
    }));
    fragment.appendChild(createElement('a', {
      className: 'category-title-link category-title-link--child',
      text: category2Name,
      attrs: {href: composeUrl(CATEGORY_PATH, category2Params)}
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
      const redirectParams = new URLSearchParams(params);
      redirectParams.set('page', totalPages);
      window.location.href = `${composeUrl(CATEGORY_PATH, redirectParams)}#pagination-anchor`;
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
      const pages = Array.from({length: groupEnd - groupStart + 1}, (_, index) => groupStart + index);

      displayPagination({
        cur: state.page,
        prev: groupStart > 1 ? groupStart - 1 : null,
        next: groupEnd < totalPages ? groupEnd + 1 : null,
        pages
      });
    }
  }

  function displayPagination({cur, pages, prev = null, next = null}) {
    const fragment = document.createDocumentFragment();

    const createPageUrl = (page) => {
      const newParams = new URLSearchParams(params);
      newParams.set('page', page);
      return `${composeUrl(CATEGORY_PATH, newParams)}#pagination-anchor`;
    };

    (function appendPrevLink() {
      const nav = prev !== null
        ? createElement('a', {className: 'pagination-nav pagination-link', attrs: {href: createPageUrl(prev)}})
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
            attrs: {href: createPageUrl(page)}
          }));
        }
      });
      fragment.appendChild(pagesDiv);
    })();

    (function appendNextLink() {
      const nav = next !== null
        ? createElement('a', {className: 'pagination-nav pagination-link', attrs: {href: createPageUrl(next)}})
        : createElement('span', {className: 'pagination-nav disabled'});

      nav.appendChild(createElement('span', {text: TEXT.postNextLink}));
      nav.appendChild(document.createTextNode(' '));
      nav.appendChild(createElement('i', {className: 'icon-forward'}));
      fragment.appendChild(nav);
    })();

    paginationElement.replaceChildren(fragment);
    paginationElement.classList.remove('hidden');
  }
});

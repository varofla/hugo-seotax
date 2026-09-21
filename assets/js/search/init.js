window.siteSearch.utils = window.siteSearch.utils || {};

window.siteSearch.sortOptions = ['relevance', 'newest', 'oldest'];
window.siteSearch.defaultSort = (function() {
  const configuredSort = '{{ lower (default "relevance" .Site.Params.search.sort) }}';
  return window.siteSearch.sortOptions.includes(configuredSort) ? configuredSort : 'relevance';
})();

window.siteSearch.utils.createElement = function(tag, options = {}) {
  const element = document.createElement(tag);
  const hasOwn = Object.prototype.hasOwnProperty;

  if (hasOwn.call(options, 'text')) element.textContent = options.text;
  if (hasOwn.call(options, 'html')) element.innerHTML = options.html;
  if (options.className) element.className = options.className;
  if (options.id) element.id = options.id;

  if (options.attrs) {
    Object.entries(options.attrs).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }

  if (options.dataset) {
    Object.entries(options.dataset).forEach(([key, value]) => {
      element.dataset[key] = value;
    });
  }

  if (options.styles) {
    Object.entries(options.styles).forEach(([key, value]) => {
      element.style[key] = value;
    });
  }

  if (options.on) {
    Object.entries(options.on).forEach(([eventName, handler]) => {
      element.addEventListener(eventName, handler);
    });
  }

  return element;
};

window.siteSearch.utils.composeUrl = function(basePath, urlParams) {
  const queryString = urlParams.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
};

window.siteSearch.utils.getUrlState = function(search = window.location.search) {
  const params = new URLSearchParams(search);
  const requestedSort = params.get('sort');

  return {
    query: params.get('query') || '',
    category1: params.get('category1') || '',
    category2: params.get('category2') || '',
    tags: params.get('tags')
      ? [...new Set(params.get('tags').split(',').map((tag) => tag.trim()).filter(Boolean))]
      : [],
    tagsOp: params.get('tagsOp') || 'and',
    sort: window.siteSearch.sortOptions.includes(requestedSort)
      ? requestedSort
      : window.siteSearch.defaultSort,
    page: Math.max(1, parseInt(params.get('page'), 10) || 1),
    pageSize: Math.max(1, parseInt(params.get('pageSize'), 10) || 10)
  };
};

window.siteSearch.utils.getEffectiveSort = function(state) {
  if (!state.query && state.sort === 'relevance') {
    return 'newest';
  }

  return state.sort;
};

window.siteSearch.utils.sortResultIds = function(ids, state, resultScores = new Map()) {
  const pages = window.siteSearch.pages || [];
  const effectiveSort = window.siteSearch.utils.getEffectiveSort(state);

  const compareNewest = function(a, b) {
    const dateDifference = Number(pages[b]?.date || 0) - Number(pages[a]?.date || 0);
    return dateDifference || (a - b);
  };

  return Array.from(ids).toSorted((a, b) => {
    if (effectiveSort === 'relevance') {
      const scoreDifference = (resultScores.get(a) ?? Number.POSITIVE_INFINITY)
        - (resultScores.get(b) ?? Number.POSITIVE_INFINITY);
      return scoreDifference || compareNewest(a, b);
    }

    if (effectiveSort === 'oldest') {
      const dateDifference = Number(pages[a]?.date || 0) - Number(pages[b]?.date || 0);
      return dateDifference || (a - b);
    }

    return compareNewest(a, b);
  });
};

window.siteSearch.getIndexConfig = function() {
  return Object.assign({
    encode: false,
    tokenize: function(str) {
      return str.replace(/[\x00-\x7F]/g, '').split('');
    }
  }, {
    includeScore: true,
    useExtendedSearch: true,
    fieldNormWeight: 1.5,
    threshold: 0.2,
    ignoreLocation: true,
    keys: [
      {
        name: 'title',
        weight: 0.7
      },
      {
        name: 'content',
        weight: 0.3
      }
    ]
  });
};

/**
 * Initialize Fuse search index
 * @returns {Promise<Fuse>}
 */
window.siteSearch.initIndex = async function() {
  if (window.siteSearch.index) {
    return Promise.resolve(window.siteSearch.index);
  }

  const indexConfig = window.siteSearch.getIndexConfig();

  return fetch(window.siteSearch.contentUrl)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(pages => {
      window.siteSearch.index = new Fuse(pages, indexConfig);
      window.siteSearch.pages = pages;
      window.siteSearch.total = pages.length;
      return window.siteSearch.index;
    });
};

/**
 * Initialize categories data
 * @returns {Map}
 */
window.siteSearch.initCategories = async function() {
  if (window.siteSearch.categories) {
    return Promise.resolve(window.siteSearch.categories);
  }

  return fetch(window.siteSearch.categoriesUrl)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(categories => {
      window.siteSearch.categories = categories;
      return window.siteSearch.categories;
    });
};

/**
 * Initialize tags data
 * @returns {Map}
 */
window.siteSearch.initTags = async function() {
  if (window.siteSearch.tags) {
    return Promise.resolve(window.siteSearch.tags);
  }

  return fetch(window.siteSearch.tagsUrl)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(tags => {
      window.siteSearch.tags = tags;
      return window.siteSearch.tags;
    });
};

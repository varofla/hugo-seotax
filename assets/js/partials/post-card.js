(function() {
  'use strict';

  const CARD_SELECTOR = '[data-post-item][data-post-item-url]';
  const INTERACTIVE_SELECTOR = 'a, button, input, select, textarea, label, summary, [role="button"]';

  function navigateToCard(card) {
    const href = card?.dataset?.postItemUrl;
    if (href) {
      window.location.href = href;
    }
  }

  document.addEventListener('click', function(event) {
    const card = event.target.closest(CARD_SELECTOR);
    if (!card) {
      return;
    }

    if (event.target.closest(INTERACTIVE_SELECTOR)) {
      return;
    }

    navigateToCard(card);
  });
})();

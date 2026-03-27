const easeInOut = t => t < 0.5
  ? 16 * t * t * t * t * t
  : 1 - Math.pow(-2 * t + 2, 5) / 2;

const HEADER_OFFSET = 80;
const HIGHLIGHT_DURATION = 2000;

function highlightHeading(el) {
  if (!el) return;

  const prevTransition = el.style.transition;
  const prevColor = el.style.color;
  const prevFontWeight = el.style.fontWeight;

  el.style.transition = 'background-color 0.3s ease';
  el.style.color = 'var(--color-link)';
  el.style.fontWeight = 'bold';

  setTimeout(() => {
    el.style.color = prevColor;
    el.style.fontWeight = prevFontWeight;
    el.style.transition = prevTransition;
  }, HIGHLIGHT_DURATION);
}

document.querySelectorAll('#TableOfContents a').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();

    const target = document.querySelector(this.getAttribute('href'));
    if (!target) return;

    const start = window.scrollY;
    const end = target.getBoundingClientRect().top + start - HEADER_OFFSET;

    const duration = 500;
    let startTime = null;

    function scrollStep(timestamp) {
      if (!startTime) startTime = timestamp;

      const progress = timestamp - startTime;
      const percent = easeInOut(Math.min(progress / duration, 1));

      window.scrollTo(0, start + (end - start) * percent);

      if (progress < duration) {
        requestAnimationFrame(scrollStep);
      } else {
        highlightHeading(target);
      }
    }

    requestAnimationFrame(scrollStep);
  });
});
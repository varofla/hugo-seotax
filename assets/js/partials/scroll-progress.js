document.addEventListener('DOMContentLoaded', function() {
  const progressBar = document.querySelector('.scroll-progress-bar');

  if (!progressBar) return;

  // On post pages, .main-wrap handles scrolling instead of the window.
  // Detect this by checking the computed overflow-y of .main-wrap.
  const mainWrap = document.querySelector('.main-wrap');
  const mainWrapOverflows = mainWrap &&
    ['auto', 'scroll'].includes(window.getComputedStyle(mainWrap).overflowY);
  const scrollContainer = mainWrapOverflows ? mainWrap : window;

  function updateScrollProgress() {
    let scrollTop, scrollHeight;

    if (mainWrapOverflows && mainWrap) {
      scrollTop = mainWrap.scrollTop;
      scrollHeight = mainWrap.scrollHeight - mainWrap.clientHeight;
    } else {
      scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    }

    const scrollProgress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    progressBar.style.width = scrollProgress + '%';
  }

  scrollContainer.addEventListener('scroll', updateScrollProgress, { passive: true });
  updateScrollProgress();
});

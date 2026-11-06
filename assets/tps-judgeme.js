(() => {
  if (!document.body.classList.contains('template-product')) return;
  const targetSelector = 'main [data-widget="reviews-grid"], main .jdgm-widget.jdgm-reviews-grid-widget, main #judgeme_product_reviews';
  const badgeSelector = 'main .jdgm-preview-badge';
  const getTarget = () => document.querySelector(targetSelector);

  const upgrade = () => {
    const target = getTarget();
    if (!target) return;
    if (!target.id) target.id = 'tps-product-reviews';
    document.querySelectorAll(badgeSelector).forEach(badge => {
      if (!badge.querySelector('a, button, [tabindex]')) {
        badge.setAttribute('role', 'link');
        badge.setAttribute('tabindex', '0');
      }
      badge.setAttribute('aria-controls', target.id);
    });
  };

  const activate = event => {
    const badge = event.target instanceof Element && event.target.closest(badgeSelector);
    if (!badge || (event.type === 'keydown' && !['Enter', ' '].includes(event.key))) return;
    const target = getTarget();
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };

  document.addEventListener('click', activate, true);
  document.addEventListener('keydown', activate, true);
  let pending = false;
  const observer = new MutationObserver(() => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; upgrade(); });
  });
  observer.observe(document.querySelector('main') || document.body, { childList: true, subtree: true });
  upgrade();
})();

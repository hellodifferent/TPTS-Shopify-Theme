if (!customElements.get('tps-sale-hero')) {
  customElements.define('tps-sale-hero', class extends HTMLElement {
    connectedCallback() {
      const source = this.querySelector('[data-sale-review-source]');
      const reviewsLink = this.querySelector('[data-sale-read-reviews]');
      this.controller = new AbortController();
      this.querySelector('[data-sale-shop]').addEventListener('click', event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const grid = document.getElementById('black-friday-products');
        if (!grid) return;
        event.preventDefault();
        grid.focus({ preventScroll: true });
        grid.scrollIntoView({
          block: 'start',
          behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
        });
      }, { signal: this.controller.signal });
      reviewsLink.addEventListener('click', event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const tab = document.querySelector('[data-widget-name="reviews_tab"] .jdgm-revs-tab-btn');
        if (!tab) return;
        event.preventDefault();
        tab.click();
      }, { signal: this.controller.signal });

      const populate = () => this.populate(source);
      this.observer = new MutationObserver(populate);
      this.observer.observe(source, { childList: true, subtree: true, characterData: true });
      populate();
    }

    disconnectedCallback() {
      this.controller.abort();
      this.observer.disconnect();
    }

    populate(source) {
      const summary = [...source.querySelectorAll('.jm-average-rating-display .jm-text')];
      const average = Number(summary[0]?.textContent.match(/[\d.]+/)?.[0]);
      const rating = this.querySelector('[data-sale-rating]');
      const count = summary[1]?.textContent.trim();
      if (!(average > 0 && average <= 5) || !count) return;

      const stars = document.createElement('span');
      stars.className = 'tps-sale-hero__stars';
      stars.textContent = '★★★★★';
      stars.setAttribute('aria-hidden', 'true');
      rating.querySelector('[data-sale-read-reviews]').replaceChildren('Rated ' + average.toFixed(1) + ' out of 5 ', stars, ' ' + count);
      rating.hidden = false;
      this.observer.disconnect();
    }
  });
}

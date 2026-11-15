if (!customElements.get('tps-sale-hero')) {
  customElements.define('tps-sale-hero', class extends HTMLElement {
    connectedCallback() {
      const source = this.querySelector('[data-sale-review-source]');
      const reviewsLink = this.querySelector('[data-sale-read-reviews]');
      this.controller = new AbortController();
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
      if (average > 0 && average <= 5 && rating.hidden) {
        const stars = document.createElement('span');
        stars.className = 'tps-sale-hero__stars';
        stars.textContent = '★★★★★';
        stars.setAttribute('aria-hidden', 'true');
        rating.append(stars, ' Rated ' + average.toFixed(1) + ' out of 5');
        if (summary[1]) rating.append(' · ' + summary[1].textContent.trim());
        rating.hidden = false;
      }

      const story = this.querySelector('[data-sale-story]');
      if (!story.hidden) return;
      const handles = new Set(this.dataset.saleProducts.split(','));
      const reviews = [...source.querySelectorAll('.jm-review-item')].map(item => {
        const product = item.querySelector('.jm-product-variant-card__product-link');
        const handle = product?.href.match(/\/products\/([^/?#]+)/)?.[1];
        const score = Number(item.querySelector('.jm-star-rating')?.getAttribute('aria-label')?.match(/[\d.]+/)?.[0]);
        const text = item.querySelector('.jdgm-review-content__body-content, .jm-review-content__body')?.textContent.trim();
        const author = item.querySelector('.jm-reviewer-info__name')?.textContent.trim();
        return { handle, product: product?.textContent.trim(), score, text, author };
      }).filter(review => handles.has(review.handle) && review.score >= 4 && review.score <= 5 && review.text && review.author);
      const review = reviews.find(entry => /castle|explorer|mini step/i.test(entry.product)) || reviews[0];
      if (!review) return;

      const excerpt = review.text.length > 145 ? review.text.slice(0, 145).replace(/\s+\S*$/, '') + '…' : review.text;
      this.querySelector('[data-sale-quote]').textContent = '“' + excerpt + '”';
      this.querySelector('[data-sale-credit]').textContent = review.author + ' · ' + review.product;
      story.hidden = false;
    }
  });
}

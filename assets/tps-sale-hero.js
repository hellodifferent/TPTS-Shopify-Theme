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
      this.observer.observe(source, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['src'] });
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
        rating.append('Rated ' + average.toFixed(1) + ' out of 5 ', stars);
        if (summary[1]) rating.append(' ' + summary[1].textContent.trim());
        rating.hidden = false;
      }

      this.populatePhoto(source);
      const story = this.querySelector('[data-sale-story]');
      if (!story.hidden) return;
      const normalizeTitle = title => title.toLowerCase().replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
      const productTitles = new Set(JSON.parse(this.dataset.saleProducts).map(normalizeTitle));
      const reviews = [...source.querySelectorAll('.jm-review-item')].map(item => {
        const product = item.querySelector('.jm-product-variant-card__product-link');
        const score = Number(item.querySelector('.jm-star-rating')?.getAttribute('aria-label')?.match(/[\d.]+/)?.[0]);
        const text = item.querySelector('.jdgm-review-content__body-content, .jm-review-content__body')?.textContent.trim();
        const author = item.querySelector('.jm-reviewer-info__name')?.textContent.trim();
        return { product: product?.textContent.trim(), score, text, author };
      }).filter(review => review.product && productTitles.has(normalizeTitle(review.product)) && review.score >= 4 && review.score <= 5 && review.text && review.author);
      const review = reviews.find(entry => /castle|explorer|mini step/i.test(entry.product)) || reviews[0];
      if (!review) return;

      const excerpt = review.text.length > 145 ? review.text.slice(0, 145).replace(/\s+\S*$/, '') + '…' : review.text;
      const reviewStars = this.querySelector('[data-sale-review-stars]');
      const filledStars = Math.round(review.score);
      reviewStars.textContent = '★'.repeat(filledStars) + '☆'.repeat(5 - filledStars);
      reviewStars.setAttribute('aria-label', review.score + ' out of 5 stars');
      this.querySelector('[data-sale-quote]').textContent = excerpt;
      this.querySelector('[data-sale-credit]').textContent = review.author + ' · ' + review.product;
      story.hidden = false;
    }

    populatePhoto(source) {
      const card = this.querySelector('[data-sale-photo]');
      if (!card.hidden || card.firstElementChild) return;
      const thumbnail = source.querySelector('.jm-media-grid__item img[src], .jdgm-gallery__thumbnail-link img[src]');
      if (!thumbnail) return;

      const url = new URL(thumbnail.getAttribute('src'), location.href);
      if (url.hostname === 'review-images.judgeme.com') url.searchParams.set('width', '640');
      const image = document.createElement('img');
      image.alt = 'Photo shared by a Playtime Store customer';
      image.src = url.href;
      image.decoding = 'async';
      image.addEventListener('load', () => { card.hidden = false; }, { once: true });
      image.addEventListener('error', () => image.remove(), { once: true });
      card.append(image);
    }
  });
}

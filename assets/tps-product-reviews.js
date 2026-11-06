if (!customElements.get('tps-product-reviews')) {
  customElements.define('tps-product-reviews', class extends HTMLElement {
    connectedCallback() {
      if (this.controller) return;
      this.controller = new AbortController();
      this.widget = this.querySelector('.jdgm-review-widget');
      this.feature = this.querySelector('[data-review-feature]');
      this.track = this.querySelector('[data-review-track]');
      if (!this.widget || !this.feature) return;
      const on = (target, type, fn) => target.addEventListener(type, fn, { signal: this.controller.signal });
      on(this.querySelector('[data-review-previous]'), 'click', () => this.advance(-1));
      on(this.querySelector('[data-review-next]'), 'click', () => this.advance(1));
      on(this.track, 'scroll', () => this.updateControls());
      on(this.track, 'pointerdown', () => { this.interacted = true; });
      this.observer = new MutationObserver(() => {
        if (this.pending) return;
        this.pending = requestAnimationFrame(() => { this.pending = null; this.populate(); });
      });
      this.observer.observe(this.widget, { subtree: true, childList: true });
      this.resize = new ResizeObserver(() => this.updateControls());
      this.resize.observe(this.track);
      this.populate();
    }

    populate() {
      const limit = Number(this.dataset.featureLimit) || 6;
      const reviews = [...this.widget.querySelectorAll('.jm-review-item, .jdgm-rev')].map(item => {
        const body = item.querySelector('.jdgm-review-content__body-content, .jm-review-content__body, .jdgm-rev__body');
        const author = item.querySelector('.jm-reviewer-info__name, .jdgm-rev__author');
        const rating = item.querySelector('.jm-star-rating, .jdgm-rev__rating');
        const score = Number(rating?.dataset.score || rating?.getAttribute('data-score') || rating?.getAttribute('aria-label')?.match(/[\d.]+/)?.[0]);
        return { item, text: body?.textContent.trim(), author: author?.textContent.trim(), score };
      }).filter(review => review.text && review.author && review.score >= 4);
      const media = [...this.widget.querySelectorAll('.jm-media-grid__item, .jdgm-gallery__thumbnail-link')].map(item => ({ item, img: item.querySelector('img') })).filter(entry => entry.img?.getAttribute('src'));
      if (!reviews.length && !media.length) return;
      const signature = JSON.stringify([reviews.map(r => [r.text, r.author, r.score]), media.map(m => m.img.getAttribute('src'))]);
      if (signature === this.signature || this.interacted) return;
      this.signature = signature;
      const cards = [];
      for (let index = 0; cards.length < limit && (index < reviews.length || index < media.length); index++) {
        if (media[index] && cards.length < limit) cards.push(this.mediaCard(media[index]));
        if (reviews[index] && cards.length < limit) cards.push(this.quoteCard(reviews[index]));
      }
      this.track.replaceChildren(...cards);
      const summary = this.widget.querySelector('.jm-average-rating-display, .jdgm-rev-widg__summary-text');
      this.querySelector('[data-review-summary]').textContent = summary?.textContent.trim().replace(/\s+/g, ' ') || '';
      this.feature.hidden = false;
      this.updateControls();
    }

    quoteCard(review) {
      const card = document.createElement('article');
      card.className = 'tps-review-feature__card';
      const stars = document.createElement('p');
      stars.className = 'tps-review-feature__stars';
      stars.textContent = '★'.repeat(Math.round(review.score));
      const originalRating = review.item.querySelector('[aria-label]');
      if (originalRating) stars.setAttribute('aria-label', originalRating.getAttribute('aria-label'));
      const quote = document.createElement('blockquote');
      quote.className = 'tps-review-feature__quote';
      quote.textContent = review.text;
      const author = document.createElement('p');
      author.className = 'tps-review-feature__author';
      author.textContent = review.author;
      const read = document.createElement('button');
      read.type = 'button';
      read.className = 'tps-review-feature__read';
      read.textContent = this.dataset.readLabel;
      read.addEventListener('click', () => {
        const destination = review.item.isConnected ? review.item : this.widget;
        destination.setAttribute('tabindex', '-1');
        destination.focus({ preventScroll: true });
        destination.style.scrollMarginTop = 'calc(var(--theme-header-height, 160px) + 24px)';
        destination.scrollIntoView({ block: 'start', behavior: this.behavior() });
      });
      card.append(stars, quote, author, read);
      return card;
    }

    mediaCard(entry) {
      const card = document.createElement('article');
      card.className = 'tps-review-feature__card tps-review-feature__card--media';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tps-review-feature__media-button';
      button.setAttribute('aria-label', entry.img.alt || this.dataset.openLabel);
      const img = document.createElement('img');
      img.src = entry.img.getAttribute('src');
      img.alt = entry.img.alt || '';
      img.loading = 'lazy';
      const label = document.createElement('span');
      label.className = 'tps-review-feature__media-action';
      label.textContent = this.dataset.openLabel;
      button.append(img, label);
      button.addEventListener('click', () => entry.item.click());
      card.append(button);
      return card;
    }

    behavior() { return matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'; }
    advance(direction) {
      this.interacted = true;
      this.track.scrollBy({ left: direction * ((this.track.firstElementChild?.getBoundingClientRect().width || 250) + 16), behavior: this.behavior() });
    }
    updateControls() {
      this.querySelector('[data-review-previous]').disabled = this.track.scrollLeft < 2;
      this.querySelector('[data-review-next]').disabled = this.track.scrollLeft + this.track.clientWidth >= this.track.scrollWidth - 2;
    }
    disconnectedCallback() {
      this.controller?.abort();
      this.observer?.disconnect();
      this.resize?.disconnect();
      if (this.pending) cancelAnimationFrame(this.pending);
      this.controller = null;
    }
  });
}

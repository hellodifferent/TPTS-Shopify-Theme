if (!customElements.get('tps-product-reviews')) {
  customElements.define('tps-product-reviews', class extends HTMLElement {
    connectedCallback() {
      if (this.controller) return;
      this.controller = new AbortController();
      this.source = this.querySelector('[data-store-review-source]');
      this.feature = this.querySelector('[data-review-feature]');
      this.track = this.querySelector('[data-review-track]');
      if (!this.feature || !this.source) return;
      this.dialog = this.querySelector('[data-story-dialog]');
      const on = (target, type, fn) => target.addEventListener(type, fn, { signal: this.controller.signal });
      on(this.querySelector('[data-story-close]'), 'click', () => this.dialog.close());
      on(this.dialog, 'click', event => { if (event.target === this.dialog) this.dialog.close(); });
      on(this.dialog, 'close', () => { if (this.opener?.isConnected) this.opener.focus({ preventScroll: true }); });
      on(this.querySelector('[data-review-previous]'), 'click', () => this.advance(-1));
      on(this.querySelector('[data-review-next]'), 'click', () => this.advance(1));
      on(this.track, 'scroll', () => this.updateControls());
      on(this.track, 'pointerdown', () => { this.interacted = true; });
      this.observer = new MutationObserver(() => {
        if (this.pending) return;
        this.pending = requestAnimationFrame(() => { this.pending = null; this.populate(); });
      });
      this.observer.observe(this.source, { subtree: true, childList: true, attributes: true, attributeFilter: ['src'] });
      this.resize = new ResizeObserver(() => this.updateControls());
      this.resize.observe(this.track);
      this.populate();
    }

    populate() {
      const limit = Number(this.dataset.featureLimit) || 6;
      const reviews = [...this.source.querySelectorAll('.jm-review-item, .jdgm-rev')].filter(item => !item.closest('.jdgm-legacy-widget-content')).map(item => {
        const body = item.querySelector('.jdgm-review-content__body-content, .jm-review-content__body, .jdgm-rev__body');
        const author = item.querySelector('.jm-reviewer-info__name, .jdgm-rev__author');
        const rating = item.querySelector('.jm-star-rating, .jdgm-rev__rating');
        const score = Number(rating?.dataset.score || rating?.getAttribute('data-score') || rating?.getAttribute('aria-label')?.match(/[\d.]+/)?.[0]);
        return { item, text: body?.textContent.trim(), author: author?.textContent.trim(), score };
      }).filter(review => review.text && review.author && review.score >= 4).sort((a, b) => Number(b.text.length >= 70) - Number(a.text.length >= 70));
      const seenMedia = new Set();
      const media = [...this.source.querySelectorAll('.jm-media-grid__item, .jdgm-gallery__thumbnail-link')].map(item => ({ item, img: item.querySelector('img') })).filter(entry => {
        const src = entry.img?.getAttribute('src');
        if (!src) return false;
        const key = new URL(src, location.href).pathname;
        if (seenMedia.has(key)) return false;
        seenMedia.add(key);
        return true;
      });
      if (!reviews.length && !media.length) return;
      const signature = JSON.stringify([reviews.map(r => [r.text, r.author, r.score]), media.map(m => m.img.getAttribute('src'))]);
      if (signature === this.signature || this.interacted) return;
      this.signature = signature;
      const cards = [];
      const pairs = Math.min(Math.floor(limit / 2), reviews.length, media.length);
      for (let index = 0; index < pairs; index++) {
        cards.push(this.quoteCard(reviews[index]), this.mediaCard(media[index]));
      }
      if (!cards.length) return;
      this.track.replaceChildren(...cards);
      const summary = this.source.querySelector('.jm-average-rating-display, .jdgm-rev-widg__summary-text');
      const summaryParts = summary ? [...summary.querySelectorAll('.jm-text')].map(part => part.textContent.trim()).filter(Boolean) : [];
      const score = Number(summaryParts[0]?.match(/[\d.]+/)?.[0]);
      const summaryNode = this.querySelector('[data-review-summary]');
      summaryNode.replaceChildren();
      if (score > 0 && score <= 5) {
        const label = document.createElement('span');
        label.textContent = this.dataset.ratedLabel + ' ' + score.toFixed(1);
        const stars = document.createElement('span');
        stars.className = 'tps-review-feature__rating-stars';
        stars.textContent = '★★★★★';
        stars.style.setProperty('--rating-fill', (score / 5 * 100) + '%');
        stars.setAttribute('role', 'img');
        stars.setAttribute('aria-label', score.toFixed(1) + ' ' + this.dataset.ratingLabel);
        summaryNode.append(label, stars);
        if (summaryParts[1]) {
          const count = document.createElement('span');
          count.className = 'tps-review-feature__rating-count';
          count.textContent = summaryParts[1];
          summaryNode.append(count);
        }
      }
      summaryNode.hidden = !summaryNode.childElementCount;
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
        this.opener = read;
        this.dialog.querySelector('[data-story-title]').textContent = review.author;
        this.dialog.querySelector('[data-story-stars]').textContent = stars.textContent;
        this.dialog.querySelector('[data-story-quote]').textContent = review.text;
        this.dialog.showModal();
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
      button.setAttribute('aria-label', this.dataset.openLabel);
      const img = document.createElement('img');
      const source = new URL(entry.img.getAttribute('src'), location.href);
      if (source.hostname === 'review-images.judgeme.com') source.searchParams.set('width', '800');
      img.src = source.href;
      img.alt = '';
      img.loading = 'lazy';
      const label = document.createElement('span');
      label.className = 'tps-review-feature__media-action';
      label.textContent = this.dataset.openLabel;
      button.append(img, label);
      button.addEventListener('click', () => {
        const sourcePath = new URL(entry.img.getAttribute('src'), location.href).pathname;
        const current = [...this.source.querySelectorAll('.jm-media-grid__item, .jdgm-gallery__thumbnail-link')].find(item => {
          const img = item.querySelector('img');
          return img?.getAttribute('src') && new URL(img.getAttribute('src'), location.href).pathname === sourcePath;
        });
        (current || entry.item).click();
      });
      card.append(button);
      return card;
    }

    behavior() { return matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'; }
    advance(direction) {
      this.interacted = true;
      this.track.scrollBy({ left: direction * ((this.track.firstElementChild?.getBoundingClientRect().width || 210) + 16), behavior: this.behavior() });
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

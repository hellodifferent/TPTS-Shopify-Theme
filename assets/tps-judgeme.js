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

(() => {
  const tabSelector = '[data-widget-name="reviews_tab"] .jdgm-revs-tab-btn';
  const contentSelector = '.jdgm-modal__content .all-reviews-widget-content';
  let stopWatching;

  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    node.className = className;
    if (text) node.textContent = text;
    return node;
  };

  const initialReviewCount = 5;

  function reviewPriority(product) {
    const title = product.toLowerCase();
    if (title.includes('explorer') && title.includes('white')) return 0;
    if (title.includes('step & slide') && title.includes('white')) return 1;
    if (title.includes('pink blossom')) return 2;
    if (title.includes('step & slide')) return 3;
    return 4;
  }

  function reviewData(source) {
    const reviews = Array.from(source.querySelectorAll('.jm-review-item')).map(item => {
      const text = item.querySelector('.jdgm-review-content__body-content, .jm-review-content__body')?.textContent.trim();
      const author = item.querySelector('.jm-reviewer-info__name')?.textContent.trim();
      const rating = item.querySelector('.jm-star-rating');
      const score = Number(rating?.dataset.score || rating?.getAttribute('aria-label')?.match(/[\d.]+/)?.[0]);
      const product = item.querySelector('.jm-product-variant-card__product-link')?.textContent.trim() || '';
      return { item, text, author, score, product };
    }).filter(review => review.text && review.author && review.score >= 4 && review.score <= 5)
      .sort((a, b) => reviewPriority(a.product) - reviewPriority(b.product)
        || Number(b.text.length >= 70) - Number(a.text.length >= 70));

    const featured = [];
    const remaining = [];
    const seenProducts = new Set();
    for (const review of reviews) {
      const key = review.product.toLowerCase();
      if (reviewPriority(key) < 4 && !seenProducts.has(key)) {
        featured.push(review);
        seenProducts.add(key);
      } else {
        remaining.push(review);
      }
    }
    return [...featured, ...remaining];
  }

  function quoteCard(review) {
    const card = element('article', 'tps-floating-reviews__quote-card');
    const stars = element('p', 'tps-floating-reviews__stars', '★'.repeat(Math.round(review.score)));
    stars.setAttribute('aria-label', review.score + ' out of 5 stars');
    const text = review.text.length > 240 ? review.text.slice(0, 240).replace(/\s+\S*$/, '') + '…' : review.text;
    card.append(stars, element('blockquote', 'tps-floating-reviews__quote', text),
      element('p', 'tps-floating-reviews__author', [review.author, review.product].filter(Boolean).join(' · ')));
    return card;
  }

  function photoCard(source, review) {
    const imageUrl = new URL(source.src, location.href);
    if (imageUrl.protocol !== 'https:') return null;
    if (imageUrl.hostname === 'review-images.judgeme.com') imageUrl.searchParams.set('width', '640');
    const card = element('figure', 'tps-floating-reviews__photo');
    const image = document.createElement('img');
    image.alt = source.alt && source.alt !== 'Review Image' ? source.alt : 'Photo shared by a Playtime customer';
    image.loading = 'lazy';
    image.decoding = 'async';
    image.src = imageUrl.href;
    card.append(image);
    if (review) {
      const excerpt = review.text.length > 120 ? review.text.slice(0, 120).replace(/\s+\S*$/, '') + '…' : review.text;
      card.append(element('figcaption', 'tps-floating-reviews__caption', excerpt + ' — ' + review.author));
    }
    return card;
  }

  function buildPanel(content) {
    if (content.querySelector(':scope > .tps-floating-reviews__panel')) return true;
    const homepage = document.querySelector('tps-product-reviews [data-store-review-source]');
    const source = homepage?.querySelector('.jm-review-item') ? homepage : content;
    const reviews = reviewData(source);
    if (!reviews.length) return false;

    const summary = Array.from(source.querySelectorAll('.jm-average-rating-display .jm-text'))
      .map(node => node.textContent.trim()).filter(Boolean);
    const photoSources = [
      ...reviews.map(review => ({ review, img: review.item.querySelector('.jm-media-thumbnail-list__thumbnail img[src]') })),
      ...Array.from(source.querySelectorAll('.jm-media-grid__item img[src]'), img => ({ img }))
    ];
    const photos = [];
    const seen = new Set();
    for (const { img, review } of photoSources) {
      if (!img?.getAttribute('src')) continue;
      const key = new URL(img.src, location.href).pathname;
      if (seen.has(key)) continue;
      const card = photoCard(img, review);
      if (!card) continue;
      seen.add(key);
      photos.push(card);
      if (photos.length === 2) break;
    }

    const panel = element('section', 'tps-floating-reviews__panel');
    const heading = element('h2', 'tps-floating-reviews__heading', 'Loved by little ones. Trusted by parents.');
    heading.id = 'tps-floating-reviews-title';
    const intro = element('header', 'tps-floating-reviews__intro');
    intro.append(heading);
    const score = Number(summary[0]?.match(/[\d.]+/)?.[0]);
    if (score > 0 && score <= 5) {
      const rating = element('p', 'tps-floating-reviews__summary');
      const stars = element('span', 'tps-floating-reviews__stars', '★★★★★');
      stars.setAttribute('aria-hidden', 'true');
      rating.append('Rated ' + score.toFixed(1), stars);
      if (summary[1]) rating.append('· ' + summary[1]);
      intro.append(rating);
    }
    panel.append(intro);

    const stack = element('div', 'tps-floating-reviews__stack');
    const quoteReviews = reviews.slice(0, initialReviewCount);
    quoteReviews.forEach((review, index) => {
      stack.append(quoteCard(review));
      if (photos[index]) stack.append(photos[index]);
    });
    panel.append(stack);

    const moreReviews = reviews.slice(initialReviewCount, 10);
    if (moreReviews.length) {
      const details = element('details', 'tps-floating-reviews__more');
      const toggle = element('summary', 'tps-floating-reviews__all', 'Read more reviews');
      const additional = element('div', 'tps-floating-reviews__stack');
      additional.append(...moreReviews.map(quoteCard));
      details.append(toggle, additional);
      details.addEventListener('toggle', () => {
        toggle.textContent = details.open ? 'Show fewer reviews' : 'Read more reviews';
      });
      panel.append(details);
    }

    const link = element('a', 'tps-floating-reviews__all', 'Read all reviews');
    link.href = document.querySelector('#pagefooter a[href$="/pages/reviews"]')?.href || '/pages/reviews';
    panel.append(link);

    const modal = content.closest('.jdgm-modal__content');
    const shell = content.closest('.jdgm-modal__container');
    const nativeContent = content.querySelector('.all-reviews-widget-content-inner');
    const close = shell?.querySelector('.jm-indicator__close');
    if (!modal || !shell || !nativeContent || !close) return false;
    const restoreFocus = nativeContent.contains(document.activeElement);
    content.append(panel);
    nativeContent.hidden = true;
    shell.classList.add('tps-floating-reviews__shell');
    modal.setAttribute('aria-labelledby', heading.id);
    if (restoreFocus) close.focus({ preventScroll: true });
    return true;
  }

  function watchForPanel(event) {
    if (!(event.target instanceof Element) || !event.target.closest(tabSelector)) return;
    if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
    stopWatching?.();
    const tryUpgrade = () => {
      const candidates = Array.from(document.querySelectorAll(contentSelector)).reverse();
      const content = candidates.find(node => node.getClientRects().length > 0);
      if (content && buildPanel(content)) stopWatching?.();
    };
    const observer = new MutationObserver(tryUpgrade);
    const timer = setTimeout(() => stopWatching(), 6000);
    stopWatching = () => {
      observer.disconnect();
      clearTimeout(timer);
      stopWatching = null;
    };
    observer.observe(document.body, { childList: true, subtree: true });
    requestAnimationFrame(tryUpgrade);
  }

  document.documentElement.classList.add('tps-floating-reviews-enabled');
  document.addEventListener('click', watchForPanel, true);
  document.addEventListener('keydown', watchForPanel, true);
})();

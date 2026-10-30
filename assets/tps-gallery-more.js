(() => {
  if (customElements.get('tps-gallery-more')) return;
  class TPSGalleryMore extends HTMLElement {
    connectedCallback() {
      this.viewport = this.querySelector('[data-gallery-viewport]');
      this.gallery = this.querySelector('.product-media-collage');
      this.overlay = this.querySelector('[data-gallery-more-overlay]');
      this.button = this.querySelector('[data-gallery-more-button]');
      if (!this.viewport || !this.gallery || !this.button) return;
      this.abort = new AbortController();
      this.desktop = matchMedia('(min-width: 768px)');
      this.expanded = false;
      const schedule = () => {
        cancelAnimationFrame(this.frame);
        this.frame = requestAnimationFrame(() => this.measure());
      };
      this.button.addEventListener('click', () => this.reveal(true), { signal: this.abort.signal });
      this.desktop.addEventListener('change', schedule, { signal: this.abort.signal });
      this.resize = new ResizeObserver(schedule);
      this.resize.observe(this.gallery);
      this.mutations = new MutationObserver(schedule);
      this.mutations.observe(this.gallery, { subtree: true, attributes: true, attributeFilter: ['class', 'hidden'], childList: true });
      schedule();
    }
    measure() {
      const all = [...this.gallery.querySelectorAll('.product-media-collage__item')];
      all.forEach(item => { item.inert = false; });
      if (!this.desktop.matches || this.expanded) {
        this.classList.remove('is-collapsed');
        this.overlay.hidden = true;
        return;
      }
      const top = this.viewport.getBoundingClientRect().top;
      const items = all.filter(item => item.getBoundingClientRect().height > 0);
      const rows = [];
      items.forEach(item => {
        const y = item.getBoundingClientRect().top - top;
        let row = rows.find(row => Math.abs(row.top - y) < 2);
        if (!row) { row = { top: y, items: [] }; rows.push(row); }
        row.items.push(item);
      });
      rows.sort((a, b) => a.top - b.top);
      if (rows.length < 5) {
        this.classList.remove('is-collapsed');
        this.overlay.hidden = true;
        return;
      }
      this.nextItems = rows.slice(4).flatMap(row => row.items);
      if (this.nextItems.some(item => item.classList.contains('is-active'))) {
        this.reveal(false);
        return;
      }
      const peek = Math.min(160, Math.max(100, rows[4].items[0].getBoundingClientRect().height * 0.45));
      this.style.setProperty('--tps-gallery-collapsed-height', (rows[4].top + peek) + 'px');
      this.style.setProperty('--tps-gallery-peek', peek + 'px');
      this.classList.add('is-collapsed');
      this.overlay.hidden = false;
      this.button.setAttribute('aria-expanded', 'false');
      this.nextItems.forEach(item => {
        item.inert = true;
        item.querySelectorAll('video').forEach(video => video.pause());
      });
    }
    reveal(focus) {
      this.expanded = true;
      this.classList.remove('is-collapsed');
      this.overlay.hidden = true;
      this.button.setAttribute('aria-expanded', 'true');
      this.gallery.querySelectorAll('.product-media-collage__item').forEach(item => { item.inert = false; });
      if (focus && this.nextItems?.[0]) {
        this.nextItems[0].setAttribute('tabindex', '-1');
        this.nextItems[0].focus({ preventScroll: true });
      }
    }
    disconnectedCallback() {
      this.abort?.abort();
      this.resize?.disconnect();
      this.mutations?.disconnect();
      cancelAnimationFrame(this.frame);
      this.gallery?.querySelectorAll('.product-media-collage__item').forEach(item => { item.inert = false; });
    }
  }
  customElements.define('tps-gallery-more', TPSGalleryMore);
})();

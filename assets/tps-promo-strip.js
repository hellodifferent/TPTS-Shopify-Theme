if (!customElements.get('tps-promo-strip')) {
  customElements.define('tps-promo-strip', class extends HTMLElement {
    connectedCallback() {
      if (this.dataset.layout !== 'inline' || this.controller) return;
      this.track = this.querySelector('.flexible-layout');
      this.slides = [...this.track.children];
      if (this.slides.length < 2) return;
      this.dots = [...this.querySelectorAll('[data-promo-index]')];
      this.pause = this.querySelector('.tps-promo-pause');
      this.mobile = matchMedia('(max-width: 1023.98px)');
      this.reduced = matchMedia('(prefers-reduced-motion: reduce)');
      this.controller = new AbortController();
      const on = (target, type, fn) => target.addEventListener(type, fn, { signal: this.controller.signal });
      this.visible = false;
      this.userPaused = false;
      this.hovered = false;
      this.focused = false;
      on(this.track, 'scroll', () => { this.updateDots(); this.schedule(); });
      on(this.track, 'pointerdown', () => { this.userPaused = true; this.schedule(); });
      on(this, 'mouseenter', () => { this.hovered = true; this.schedule(); });
      on(this, 'mouseleave', () => { this.hovered = false; this.schedule(); });
      on(this, 'focusin', () => { this.focused = true; this.schedule(); });
      on(this, 'focusout', (event) => { this.focused = this.contains(event.relatedTarget); this.schedule(); });
      this.dots.forEach(dot => on(dot, 'click', () => {
        this.userPaused = true;
        this.go(Number(dot.dataset.promoIndex));
        this.schedule();
      }));
      on(this.pause, 'click', () => { this.userPaused = !this.userPaused; this.schedule(); });
      on(this.mobile, 'change', () => this.measure());
      on(this.reduced, 'change', () => this.measure());
      on(document, 'visibilitychange', () => this.schedule());
      on(window, 'pageshow', () => this.measure());
      this.resize = new ResizeObserver(() => this.measure());
      this.resize.observe(this.track);
      this.observer = new IntersectionObserver(entries => {
        this.visible = entries[0].isIntersecting;
        this.schedule();
      });
      this.observer.observe(this);
      this.measure();
    }

    measure() {
      const max = this.track.scrollWidth - this.track.clientWidth;
      const first = this.slides[0].getBoundingClientRect().left;
      this.positions = this.slides.map(slide => Math.max(0, Math.min(max, slide.getBoundingClientRect().left - first)));
      this.dots.forEach((dot, i) => {
        dot.hidden = i > 0 && Math.abs(this.positions[i] - this.positions[i - 1]) < 2;
      });
      this.pause.hidden = this.reduced.matches || this.dataset.autoplay !== 'true';
      this.updateDots();
      this.schedule();
    }

    updateDots() {
      if (!this.positions) return;
      let active = 0;
      this.positions.forEach((position, i) => {
        if (!this.dots[i].hidden && Math.abs(position - this.track.scrollLeft) < Math.abs(this.positions[active] - this.track.scrollLeft)) active = i;
      });
      this.active = active;
      this.dataset.activeIndex = String(active);
      this.dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === active)));
    }

    go(index) {
      this.track.scrollTo({ left: this.positions[index], behavior: this.reduced.matches || index === 0 ? 'auto' : 'smooth' });
    }

    schedule() {
      clearTimeout(this.timer);
      const paused = this.userPaused || this.hovered || this.focused;
      this.pause.textContent = this.userPaused ? this.pause.dataset.playText : this.pause.dataset.pauseText;
      if (!this.mobile.matches || this.reduced.matches || this.dataset.autoplay !== 'true' || !this.visible || document.hidden || paused) return;
      this.timer = setTimeout(() => {
        const next = this.dots.findIndex((dot, i) => i > this.active && !dot.hidden);
        this.go(next === -1 ? 0 : next);
        this.schedule();
      }, Math.max(3000, Number(this.dataset.interval) || 4000));
    }

    disconnectedCallback() {
      clearTimeout(this.timer);
      this.controller?.abort();
      this.resize?.disconnect();
      this.observer?.disconnect();
      this.controller = null;
    }
  });
}

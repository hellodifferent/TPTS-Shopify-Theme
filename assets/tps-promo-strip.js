if (!customElements.get('tps-promo-strip')) {
  customElements.define('tps-promo-strip', class extends HTMLElement {
    connectedCallback() {
      if (this.dataset.layout !== 'inline' || this.controller) return;
      this.track = this.querySelector('.flexible-layout');
      this.slides = [...this.track.children];
      if (this.slides.length < 2) return;
      this.controller = new AbortController();
      this.rail = document.createElement('div');
      this.rail.className = 'tps-promo-rail';
      this.rail.append(...this.slides);
      this.track.append(this.rail);
      this.mobile = matchMedia('(max-width: 1023.98px)');
      this.reduced = matchMedia('(prefers-reduced-motion: reduce)');
      this.pause = this.querySelector('.tps-promo-pause');
      const on = (target, type, fn) => target.addEventListener(type, fn, { signal: this.controller.signal });
      on(this.pause, 'click', () => {
        const paused = this.dataset.paused !== 'true';
        this.dataset.paused = String(paused);
        this.pause.textContent = paused ? this.pause.dataset.playText : this.pause.dataset.pauseText;
      });
      on(this.mobile, 'change', () => this.measure());
      on(this.reduced, 'change', () => this.measure());
      on(document, 'visibilitychange', () => { this.rail.style.animationPlayState = document.hidden ? 'paused' : ''; });
      this.resize = new ResizeObserver(() => this.measure());
      this.resize.observe(this.track);
      this.slides.forEach(slide => this.resize.observe(slide));
      this.measure();
    }

    measure() {
      this.rail.querySelectorAll('[data-promo-clone]').forEach(clone => clone.remove());
      this.dataset.loopReady = 'false';
      if (!this.mobile.matches || this.reduced.matches || this.dataset.autoplay !== 'true') return;
      const cycle = this.slides.reduce((sum, slide) => sum + slide.getBoundingClientRect().width, 0);
      if (!cycle) return;
      const copies = Math.ceil(this.track.clientWidth / cycle) + 1;
      for (let copy = 0; copy < copies; copy++) {
        this.slides.forEach(slide => {
          const clone = slide.cloneNode(true);
          clone.dataset.promoClone = '';
          clone.setAttribute('aria-hidden', 'true');
          clone.inert = true;
          clone.removeAttribute('data-shopify-editor-block');
          clone.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
          clone.querySelectorAll('a,button,input,select,textarea,[tabindex]').forEach(element => element.setAttribute('tabindex', '-1'));
          this.rail.append(clone);
        });
      }
      const secondsPer100px = Math.max(3, (Number(this.dataset.interval) || 4000) / 1000);
      this.style.setProperty('--tps-loop-distance', `${-cycle}px`);
      this.style.setProperty('--tps-loop-duration', `${cycle * secondsPer100px / 100}s`);
      this.dataset.loopReady = 'true';
    }

    disconnectedCallback() {
      this.controller?.abort();
      this.resize?.disconnect();
      if (this.rail) {
        this.track.append(...this.slides);
        this.rail.remove();
      }
      this.dataset.loopReady = 'false';
      this.controller = null;
    }
  });
}

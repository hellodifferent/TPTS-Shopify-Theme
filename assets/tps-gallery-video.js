if (!customElements.get('tps-gallery-video')) {
  customElements.define('tps-gallery-video', class extends HTMLElement {
    connectedCallback() {
      this.abort?.abort();
      this.observer?.disconnect();
      this.abort = new AbortController();
      this.gallery = this.closest('media-gallery');
      this.slide = this.closest('.slider__item');
      const options = { signal: this.abort.signal };
      this.queuePlayback = () => {
        this.syncPlayback();
        cancelAnimationFrame(this.playbackFrame);
        this.playbackFrame = requestAnimationFrame(() => this.syncPlayback());
      };
      this.gallery?.addEventListener('on:media-gallery:change', this.queuePlayback, options);
      this.addEventListener('click', this.queuePlayback, options);
      document.addEventListener('visibilitychange', this.queuePlayback, options);
      window.addEventListener('pageshow', this.queuePlayback, options);
      this.observer = new IntersectionObserver(([entry]) => {
        this.inView = entry.isIntersecting;
        this.queuePlayback();
      });
      this.observer.observe(this);
    }

    disconnectedCallback() {
      this.abort?.abort();
      this.observer?.disconnect();
      cancelAnimationFrame(this.playbackFrame);
      this.inView = false;
      this.video?.pause();
      this.video?.remove();
      this.video = null;
      this.classList.remove('is-playing');
    }

    syncPlayback() {
      const active = !this.slide || this.slide.classList.contains('is-active');
      if (!this.inView || !active || document.hidden || !this.getClientRects().length) {
        if (this.video) {
          this.video.autoplay = false;
          this.video.pause();
        }
        return;
      }

      if (!this.video) {
        const source = this.querySelector('template')?.content.querySelector('video');
        if (!source) return;
        this.video = source.cloneNode(true);
        this.video.muted = true;
        this.video.defaultMuted = true;
        this.video.playsInline = true;
        this.video.loop = true;
        this.video.controls = false;
        this.video.autoplay = true;
        this.video.setAttribute('muted', '');
        this.video.setAttribute('playsinline', '');
        this.video.setAttribute('webkit-playsinline', '');
        this.video.setAttribute('autoplay', '');
        const options = { signal: this.abort.signal };
        this.video.addEventListener('playing', () => this.classList.add('is-playing'), options);
        this.video.addEventListener('loadedmetadata', this.queuePlayback, options);
        this.video.addEventListener('canplay', this.queuePlayback, options);
        this.append(this.video);
        this.video.load();
      }

      this.video.autoplay = true;
      this.video.muted = true;
      if (this.video.paused) this.video.play().catch(() => {});
    }
  });
}

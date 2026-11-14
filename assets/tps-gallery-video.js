if (!customElements.get('tps-gallery-video')) {
  customElements.define('tps-gallery-video', class extends HTMLElement {
    connectedCallback() {
      this.gallery = this.closest('media-gallery');
      this.slide = this.closest('.slider__item');
      this.syncPlayback = this.syncPlayback.bind(this);
      this.gallery.addEventListener('on:media-gallery:change', this.syncPlayback);
      this.addEventListener('click', this.syncPlayback);
      this.observer = new IntersectionObserver(([entry]) => {
        this.inView = entry.isIntersecting;
        this.syncPlayback();
      });
      this.observer.observe(this);
    }

    disconnectedCallback() {
      this.gallery.removeEventListener('on:media-gallery:change', this.syncPlayback);
      this.removeEventListener('click', this.syncPlayback);
      this.observer.disconnect();
      this.inView = false;
      this.video?.pause();
    }

    syncPlayback() {
      const active = !this.slide || this.slide.classList.contains('is-active');
      if (!this.inView || !active || !this.getClientRects().length) {
        this.video?.pause();
        return;
      }

      if (!this.video) {
        this.video = this.querySelector('template').content.querySelector('video').cloneNode(true);
        this.video.muted = true;
        this.video.controls = false;
        this.video.addEventListener('playing', () => this.classList.add('is-playing'), { once: true });
        this.append(this.video);
      }

      if (this.video.paused) this.video.play().catch(() => {});
    }
  });
}

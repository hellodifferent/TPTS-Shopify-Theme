(() => {
  if (customElements.get('tps-thumbnail-video')) return;
  class TPSThumbnailVideo extends HTMLElement {
    connectedCallback() {
      this.abort = new AbortController();
      this.video = this.querySelector('video');
      if (!this.video) return;
      this.video.muted = true;
      this.video.defaultMuted = true;
      this.mobile = matchMedia('(max-width: 767.98px)');
      const options = { signal: this.abort.signal };
      this.video.addEventListener('playing', () => this.classList.add('is-playing'), options);
      this.mobile.addEventListener('change', () => this.observe(), options);
      document.addEventListener('visibilitychange', () => this.updatePlayback(), options);
      this.observe();
    }
    observe() {
      this.loader?.disconnect();
      this.visibility?.disconnect();
      this.visible = false;
      this.video.pause();
      if (!this.mobile.matches || !('IntersectionObserver' in window)) return;
      this.loader = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) this.load();
      }, { rootMargin: '120px', threshold: 0 });
      this.visibility = new IntersectionObserver(entries => {
        this.visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.15);
        this.updatePlayback();
      }, { threshold: [0, 0.15] });
      this.loader.observe(this);
      this.visibility.observe(this);
    }
    load() {
      if (!this.video.getAttribute('src')) {
        this.video.src = this.video.dataset.src;
        this.video.load();
      }
      this.loader?.disconnect();
    }
    updatePlayback() {
      if (this.mobile.matches && this.visible && !document.hidden) {
        this.load();
        const playback = this.video.play();
        if (playback) playback.catch(() => {});
      } else {
        this.video.pause();
      }
    }
    disconnectedCallback() {
      this.video?.pause();
      this.loader?.disconnect();
      this.visibility?.disconnect();
      this.abort?.abort();
    }
  }
  customElements.define('tps-thumbnail-video', TPSThumbnailVideo);
})();

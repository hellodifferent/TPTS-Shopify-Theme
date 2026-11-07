if (!customElements.get('tps-card-video')) {
  customElements.define('tps-card-video', class extends HTMLElement {
    connectedCallback() {
      if (this.controller) return;
      this.controller = new AbortController();
      this.video = this.querySelector('video');
      if (!this.video) return;
      this.video.muted = true;
      this.video.defaultMuted = true;
      this.video.controls = false;
      this.motion = matchMedia('(prefers-reduced-motion: reduce)');
      const options = { signal: this.controller.signal };
      this.video.addEventListener('playing', () => this.setAttribute('data-playing', ''), options);
      this.motion.addEventListener('change', () => this.updatePlayback(), options);
      document.addEventListener('visibilitychange', () => this.updatePlayback(), options);
      this.observer = new IntersectionObserver(entries => {
        this.visible = entries[0].isIntersecting;
        this.updatePlayback();
      }, { threshold: 0.05 });
      this.observer.observe(this);
    }
    updatePlayback() {
      if (!this.visible || document.hidden || this.motion.matches) {
        this.video.pause();
        if (this.motion.matches) this.removeAttribute('data-playing');
        return;
      }
      if (!this.loaded) {
        const template = this.video.querySelector('template');
        if (!template) return;
        this.video.append(template.content.cloneNode(true));
        template.remove();
        this.loaded = true;
        this.video.load();
      }
      this.video.play()?.catch(() => this.removeAttribute('data-playing'));
    }
    disconnectedCallback() {
      this.video?.pause();
      this.observer?.disconnect();
      this.controller?.abort();
      this.controller = null;
    }
  });
}

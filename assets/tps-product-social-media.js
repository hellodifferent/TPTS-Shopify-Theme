(() => {
  if (customElements.get('tps-social-media')) return;
  class TPSSocialMedia extends HTMLElement {
    connectedCallback() {
      this.abort = new AbortController();
      const options = { signal: this.abort.signal };
      this.dialog = this.querySelector('[data-social-dialog]');
      this.stage = this.querySelector('[data-social-stage]');
      this.triggers = [...this.querySelectorAll('[data-social-open]')];
      if (!this.dialog || !this.triggers.length) return;
      this.dialogHome = this.dialog.parentNode;
      document.body.append(this.dialog);
      this.addEventListener('click', event => {
        const trigger = event.target.closest('[data-social-open]');
        if (trigger) this.open(this.triggers.indexOf(trigger), trigger);
      }, options);
      this.dialog.addEventListener('click', event => {
        if (event.target.closest('[data-social-close]')) this.close();
        if (event.target.closest('[data-social-previous]')) this.show(this.index - 1);
        if (event.target.closest('[data-social-next]')) this.show(this.index + 1);
      }, options);
      document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && this.dialog.open) {
          event.preventDefault();
          this.close();
        }
      }, options);
      this.dialog.addEventListener('close', () => this.stop(), options);
      document.addEventListener('tps:social:open', event => {
        if (event.detail !== this) this.close(false);
      }, options);
      document.addEventListener('dispatch:cart-drawer:open', () => this.close(false), options);
    }
    open(index, opener) {
      this.opener = opener;
      document.dispatchEvent(new CustomEvent('tps:social:open', { detail: this }));
      this.show(index);
      if (!this.dialog.open) this.dialog.show();
      this.dialog.querySelector('[data-social-close]').focus({ preventScroll: true });
    }
    show(index) {
      this.stop();
      this.index = (index + this.triggers.length) % this.triggers.length;
      const key = this.triggers[this.index].dataset.socialOpen;
      const template = this.querySelector('[data-social-template="' + key + '"]');
      this.stage.replaceChildren(template.content.cloneNode(true));
      this.dialog.querySelector('[data-social-position]').textContent = (this.index + 1) + ' / ' + this.triggers.length;
      const video = this.stage.querySelector('video');
      if (video) {
        const playback = video.play();
        if (playback) playback.catch(() => {});
      }
    }
    stop() {
      this.stage?.querySelectorAll('video').forEach(video => video.pause());
    }
    close(restoreFocus = true) {
      if (!this.dialog?.open) return;
      this.stop();
      this.dialog.close();
      this.stage.replaceChildren();
      if (restoreFocus && this.opener?.isConnected) this.opener.focus({ preventScroll: true });
    }
    disconnectedCallback() {
      this.close(false);
      this.abort?.abort();
      if (this.dialog && this.dialogHome) this.dialogHome.append(this.dialog);
    }
  }
  customElements.define('tps-social-media', TPSSocialMedia);
})();

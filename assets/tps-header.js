class TpsHeaderTools extends HTMLElement {
  connectedCallback() {
    this.root = this.closest('page-header');
    this.section = this.closest('.section-header');
    if (!this.root || !this.section) return;
    this.controller = new AbortController();
    const { signal } = this.controller;
    this.previousY = Math.max(0, window.scrollY);
    this.direction = 0;
    this.distance = 0;
    this.reveal = this.dataset.reveal === 'true';
    this.search = this.root.querySelector('.main-search');
    this.input = this.search?.querySelector('.main-search__input');
    this.frame = 0;
    this.section.classList.toggle('tps-header-scroll', this.reveal);

    const schedule = () => {
      if (!this.frame) this.frame = requestAnimationFrame(() => {
        this.frame = 0;
        this.update();
      });
    };
    window.addEventListener('scroll', schedule, { passive: true, signal });
    window.addEventListener('resize', schedule, { passive: true, signal });
    this.root.addEventListener('focusin', () => this.setHidden(false), { signal });
    this.root.addEventListener('keydown', event => {
      if (event.key === 'Escape' && document.body.classList.contains('show-search')) {
        event.preventDefault();
        this.search?.querySelector('.main-search__close').click();
      }
    }, { signal });
    this.root.addEventListener('click', event => {
      if (event.target.closest('.show-search-link')) {
        this.setHidden(false);
        this.syncSearch();
      }
      if (event.target.closest('[data-tps-search-clear]') && this.input) {
        this.input.value = '';
        this.input.dispatchEvent(new Event('input', { bubbles: true }));
        this.input.dispatchEvent(new Event('change', { bubbles: true }));
        this.input.focus();
      }
    }, { signal });
    this.root.addEventListener('click', event => {
      if (event.target.closest('.header-shade') && document.body.classList.contains('show-search')) {
        event.preventDefault();
        event.stopPropagation();
        this.search.querySelector('.main-search__close').click();
        return;
      }
      if (event.target.closest('.tps-search-cart') && document.body.classList.contains('show-search')) {
        this.search.querySelector('.main-search__close').click();
      }
    }, { signal, capture: true });
    this.input?.addEventListener('input', () => this.syncQuery(), { signal });
    this.input?.addEventListener('change', () => this.syncQuery(), { signal });
    this.bodyObserver = new MutationObserver(() => { this.syncSearch(); schedule(); });
    this.bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    this.cartObserver = new MutationObserver(() => this.syncCart());
    const cartCount = this.root.querySelector('.logo-area__right .cart-link__count');
    if (cartCount) this.cartObserver.observe(cartCount, { childList: true, characterData: true, subtree: true });
    this.resizeObserver = new ResizeObserver(schedule);
    this.resizeObserver.observe(this.root);
    this.syncSearch();
    this.syncCart();
    this.syncQuery();
    this.update();
  }

  syncCart() {
    const count = this.root.querySelector('.logo-area__right .cart-link__count')?.textContent.trim() || '0';
    this.root.querySelectorAll('[data-tps-cart-count]').forEach(el => { el.textContent = count; });
  }

  syncQuery() {
    this.search?.classList.toggle('tps-search-has-query', Boolean(this.input?.value.trim()));
  }

  syncSearch() {
    const open = document.body.classList.contains('show-search');
    this.root.querySelectorAll('.show-search-link').forEach(el => el.setAttribute('aria-expanded', String(open)));
    if (open) this.setHidden(false);
  }

  setHidden(hidden) {
    if (!this.reveal) hidden = false;
    this.section.classList.toggle('tps-header-hidden', hidden);
    this.root.inert = hidden;
    if (this.reveal) document.documentElement.style.setProperty('--theme-sticky-header-height', hidden ? '0px' : `${Math.ceil(this.section.offsetHeight)}px`);
  }

  update() {
    if (!this.reveal) return;
    const y = Math.max(0, window.scrollY);
    const delta = y - this.previousY;
    const locked = document.body.classList.contains('show-search') || document.body.classList.contains('reveal-mobile-nav') || this.section.classList.contains('section-header--nav-open') || this.section.classList.contains('section-header--nav-hover') || Boolean(this.root.querySelector(':focus-visible'));
    if (locked || y < this.section.offsetHeight + 60) {
      this.setHidden(false);
      this.distance = 0;
    } else if (Math.abs(delta) > 0) {
      const direction = Math.sign(delta);
      this.distance = direction === this.direction ? this.distance + Math.abs(delta) : Math.abs(delta);
      this.direction = direction;
      if (this.distance >= (direction > 0 ? 18 : 8)) this.setHidden(direction > 0);
    }
    this.previousY = y;
  }

  disconnectedCallback() {
    this.controller?.abort();
    this.bodyObserver?.disconnect();
    this.cartObserver?.disconnect();
    this.resizeObserver?.disconnect();
    cancelAnimationFrame(this.frame);
    this.section?.classList.remove('tps-header-scroll', 'tps-header-hidden');
    if (this.root) this.root.inert = false;
  }
}
if (!customElements.get('tps-header-tools')) customElements.define('tps-header-tools', TpsHeaderTools);

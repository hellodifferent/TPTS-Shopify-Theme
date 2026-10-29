(() => {
  if (customElements.get('playtime-offer')) return;
  let updating = false;
  class PlaytimeOffer extends HTMLElement {
    connectedCallback() {
      this.abortController = new AbortController();
      this.addEventListener('click', event => {
        const button = event.target.closest('[data-pt-add]');
        if (button) this.addSelection(button);
      }, { signal: this.abortController.signal });
      const select = this.querySelector('[data-pt-choice]');
      if (select) {
        const alternative = select.querySelector('[data-pt-alternative]');
        const first = Array.from(select.options).find(option => !option.disabled && option.value);
        if (alternative || first) select.value = (alternative || first).value;
      }
    }
    disconnectedCallback() {
      this.abortController?.abort();
    }
    async addSelection(button, items) {
      const select = this.querySelector('[data-pt-choice]');
      if (updating || button.disabled || (!items && (!select?.value || select.selectedOptions[0]?.disabled))) return;
      const status = this.querySelector('[data-pt-status], [data-pack-status]');
      const config = document.getElementById('playtime-offer-config');
      if (!config) return;
      const messages = JSON.parse(config.textContent);
      updating = true;
      button.disabled = true;
      this.setAttribute('aria-busy', 'true');
      status.hidden = false;
      status.setAttribute('role', 'status');
      status.textContent = messages.adding;
      let added = false;
      try {
        const root = window.Shopify?.routes?.root || '/';
        const response = await fetch(`${root}cart/add.js`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ items: items || [{ id: Number(select.value), quantity: 1 }] })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(typeof result.description === 'string' ? result.description : messages.error);
        added = true;
        const cartResponse = await fetch(`${root}cart.js`, { headers: { Accept: 'application/json' } });
        if (!cartResponse.ok) throw new Error(messages.refreshError);
        const cart = await cartResponse.json();
        document.querySelectorAll('.cart-link__count').forEach(count => { count.textContent = cart.item_count > 0 ? String(cart.item_count) : ''; });
        status.textContent = messages.added;
        document.dispatchEvent(new CustomEvent('on:cart:change', { bubbles: true }));
        if (this.closest('[data-pt-mode="product"]')) {
          document.dispatchEvent(new CustomEvent('dispatch:cart-drawer:open', { detail: { opener: button } }));
          if (!document.querySelector('.js-cart-drawer')) window.location.assign(`${root}cart`);
        }
      } catch (error) {
        status.textContent = added ? messages.refreshError : error.message || messages.error;
        status.setAttribute('role', 'alert');
      } finally {
        updating = false;
        this.removeAttribute('aria-busy');
        button.disabled = false;
      }
    }
  }
  class PlaytimePackSelector extends HTMLElement {
    connectedCallback() {
      this.form = this.closest('form');
      if (!this.form) return;
      this.button = this.form.querySelector('[name="add"]');
      if (!this.button) return;
      this.originalDisabled = this.button.disabled;
      this.abortController = new AbortController();
      const signal = this.abortController.signal;
      this.addEventListener('change', () => this.updateSelection(), { signal });
      this.form.addEventListener('submit', event => {
        if (!this.requiresCustomAdd()) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (this.dataset.ready !== 'true') return;
        const quantity = Number(this.form.querySelector('[name="quantity"]')?.value || 1);
        const variant = Number(this.form.querySelector('[name="id"]').value);
        const items = [];
        if (this.dataset.kind !== 'balls') items.push({ id: variant, quantity });
        const count = this.selection();
        if (this.dataset.kind === 'mini') {
          items.push({ id: Number(this.choiceFor(2)?.value), quantity });
        } else {
          for (let bag = 1; bag <= count; bag++) {
            items.push({ id: Number(this.choiceFor(bag)?.value), quantity });
          }
        }
        if (items.some(item => !Number.isSafeInteger(item.id) || item.id <= 0)) return;
        PlaytimeOffer.prototype.addSelection.call(this, this.button, items);
      }, { capture: true, signal });
      this.updateSelection();
    }
    disconnectedCallback() {
      this.abortController?.abort();
    }
    selection() {
      return Number(this.querySelector('[data-pack-size]:checked')?.value || 0);
    }
    choiceFor(index) {
      return this.querySelector(`input[data-pack-choice="${index}"]:checked`) || this.querySelector(`select[data-pack-choice="${index}"]`);
    }
    requiresCustomAdd() {
      const count = this.selection();
      return this.dataset.kind === 'mini' ? count === 2 : this.dataset.kind === 'balls' || count > 0;
    }
    updateSelection() {
      const count = this.selection();
      this.querySelectorAll('[data-pack-colour]').forEach(label => {
        label.hidden = Number(label.dataset.packColour) > count;
      });
      const custom = this.requiresCustomAdd();
      const unavailable = Array.from(this.querySelectorAll('[data-pack-colour]')).some(group => {
        if (group.hidden) return false;
        const choice = this.choiceFor(group.dataset.packColour);
        return !choice?.value || choice.disabled || choice.selectedOptions?.[0]?.disabled;
      });
      const colourName = this.querySelector('[data-pack-colour-name]');
      if (colourName) colourName.textContent = this.choiceFor(2)?.dataset.colourName || '';
      const previewOnly = custom && this.dataset.ready !== 'true';
      this.button.disabled = this.originalDisabled || previewOnly || (custom && unavailable);
      const status = this.querySelector('[data-pack-status]');
      status.hidden = !previewOnly;
      status.textContent = previewOnly ? this.dataset.previewLabel : '';
      this.form.querySelectorAll('.product-dynamic-payment-button').forEach(button => { button.hidden = custom; });
    }
  }
  if (!customElements.get('playtime-pack-selector')) customElements.define('playtime-pack-selector', PlaytimePackSelector);
  customElements.define('playtime-offer', PlaytimeOffer);
})();

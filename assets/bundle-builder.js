class BundleBuilder extends HTMLElement {
  connectedCallback() {
    this.submitButton = this.querySelector('[data-bundle-submit]');
    this.errorMessage = this.querySelector('[data-bundle-error]');
    this.successMessage = this.querySelector('[data-bundle-success]');
    this.countOutput = this.querySelector('[data-bundle-count]');
    this.totalOutput = this.querySelector('[data-bundle-total]');
    this.selectionNote = this.querySelector('[data-bundle-selection-note]');
    this.minimumProducts = Number(this.dataset.minimumProducts || 2);
    this.currencyFormatter = new Intl.NumberFormat(document.documentElement.lang || 'en-AU', {
      style: 'currency',
      currency: this.dataset.currency || 'AUD'
    });

    this.addEventListener('change', this.updateSummary.bind(this));
    this.submitButton?.addEventListener('click', this.addSelectedItems.bind(this));
    this.updateSummary();
  }

  getSelectedItems() {
    const quantitiesByVariant = new Map();

    this.querySelectorAll('[data-bundle-item]').forEach((item) => {
      const checkbox = item.querySelector('[data-bundle-select]');
      const variantInput = item.querySelector('[data-bundle-variant]');
      if (!checkbox?.checked || !variantInput?.value) return;

      const variantId = Number(variantInput.value);
      const currentQuantity = quantitiesByVariant.get(variantId)?.quantity || 0;
      quantitiesByVariant.set(variantId, {
        id: variantId,
        quantity: currentQuantity + 1,
        price: Number(variantInput.selectedOptions?.[0]?.dataset.price || variantInput.dataset.price || 0)
      });
    });

    return Array.from(quantitiesByVariant.values());
  }

  updateSummary() {
    const items = this.getSelectedItems();
    const itemCount = items.reduce((total, item) => total + item.quantity, 0);
    const totalPrice = items.reduce((total, item) => total + (item.price * item.quantity), 0);

    if (this.countOutput) this.countOutput.textContent = itemCount;
    if (this.totalOutput) this.totalOutput.textContent = this.currencyFormatter.format(totalPrice / 100);
    if (this.submitButton) this.submitButton.disabled = itemCount < this.minimumProducts;
    if (this.selectionNote) this.selectionNote.hidden = itemCount >= this.minimumProducts;
    this.clearMessages();
  }

  clearMessages() {
    if (this.errorMessage) {
      this.errorMessage.hidden = true;
      this.errorMessage.textContent = '';
    }
    if (this.successMessage) {
      this.successMessage.hidden = true;
      this.successMessage.textContent = '';
    }
  }

  showError(message) {
    if (!this.errorMessage) return;
    this.errorMessage.textContent = message;
    this.errorMessage.hidden = false;
  }

  setLoading(isLoading) {
    if (!this.submitButton) return;
    if (isLoading) {
      this.submitButton.setAttribute('aria-disabled', 'true');
    } else {
      this.submitButton.removeAttribute('aria-disabled');
    }
    this.submitButton.classList.toggle('is-loading', isLoading);
  }

  async addSelectedItems() {
    const items = this.getSelectedItems().map(({ id, quantity }) => ({ id, quantity }));
    const itemCount = items.reduce((total, item) => total + item.quantity, 0);
    if (itemCount < this.minimumProducts || this.submitButton?.getAttribute('aria-disabled') === 'true') return;

    this.clearMessages();
    this.setLoading(true);

    const sectionsToUpdate = ['page-header', 'cart-drawer']
      .map((selector) => document.querySelector(selector))
      .filter((element) => element);
    const sectionIds = sectionsToUpdate.map((element) => element.dataset.sectionId);

    try {
      const response = await fetch(theme.routes.cartAdd, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          items,
          sections: sectionIds,
          sections_url: window.location.pathname
        })
      });
      const data = await response.json();

      if (!response.ok || data.status) {
        throw new Error(data.description || data.message || 'The selected products could not be added.');
      }

      if (document.querySelector('.template-cart')) {
        document.querySelector('cart-form')?.refresh();
      } else if (theme.settings.afterAddToCart === 'page') {
        window.location.href = theme.routes.cart;
        return;
      } else {
        if (data.sections && sectionsToUpdate.length === Object.keys(data.sections).length) {
          sectionsToUpdate.forEach((element) => {
            element.updateFromCartChange(data.sections[element.dataset.sectionId]);
          });
        } else {
          this.dispatchEvent(new CustomEvent('on:cart:change', { bubbles: true }));
        }

        if (theme.settings.afterAddToCart === 'drawer') {
          document.querySelector('.js-cart-drawer')?.open(this.submitButton);
        }
      }

      this.dispatchEvent(new CustomEvent('on:cart:add', {
        bubbles: true,
        detail: { variantIds: items.map((item) => item.id) }
      }));

      if (this.successMessage) {
        this.successMessage.textContent = this.dataset.successMessage;
        this.successMessage.hidden = false;
      }
    } catch (error) {
      this.showError(error.message);
      this.dispatchEvent(new CustomEvent('on:cart:error', {
        bubbles: true,
        detail: { error: error.message }
      }));
      this.dispatchEvent(new CustomEvent('on:cart:change', { bubbles: true }));
    } finally {
      this.setLoading(false);
    }
  }
}

if (!customElements.get('bundle-builder')) {
  customElements.define('bundle-builder', BundleBuilder);
}

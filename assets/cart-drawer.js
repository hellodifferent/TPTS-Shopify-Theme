/* global SideDrawer */

class CartDrawer extends SideDrawer {
  connectedCallback() {
    this.bindEvents();
  }

  bindEvents() {
    this.openDrawerViaEventHandler = this.handleDrawerOpenViaEvent.bind(this);
    this.closeDrawerViaEventHandler = this.close.bind(this, null);
    document.addEventListener('dispatch:cart-drawer:open', this.openDrawerViaEventHandler);
    document.addEventListener('dispatch:cart-drawer:close', this.closeDrawerViaEventHandler);
    document.addEventListener('dispatch:cart-drawer:refresh', this.cartRefreshHandler);
    this.addEventListener('on:cart-drawer:before-open', () => {
      theme.manuallyLoadImages(this);
      this.querySelectorAll('cc-cart-cross-sell').forEach((el) => el.init());
    });
    this.addEventListener('on:cart:after-merge', () => {
      theme.manuallyLoadImages(this);
      this.querySelectorAll('cc-cart-cross-sell').forEach((el) => el.init());
    });
  }

  disconnectedCallback() {
    document.removeEventListener('dispatch:cart-drawer:refresh', this.cartRefreshHandler);
    document.removeEventListener('dispatch:cart-drawer:open', this.openDrawerViaEventHandler);
    document.removeEventListener('dispatch:cart-drawer:close', this.closeDrawerViaEventHandler);
  }

  /**
   * Handle when the drawer is opened via an event
   * @param {object} evt - Event object.
   */
  handleDrawerOpenViaEvent(evt) {
    this.open(evt.detail ? evt.detail.opener : null);
  }

  /**
   * Trigger refresh of contents
   */
  cartRefreshHandler() {
    this.querySelector('cart-form').refresh();
  }

  /**
   * Update section's cart-form element with new contents
   * @param {string} html - Whole-section HTML.
   */
  updateFromCartChange(html) {
    this.querySelector('cart-form').refreshFromHtml(html);
  }
}

window.customElements.define('cart-drawer', CartDrawer);

class CartDrawerExpress extends HTMLElement {
  connectedCallback() {
    const buttons = this.firstElementChild;
    if (!buttons) return;
    this.observer = new ResizeObserver(() => {
      const wallet = buttons.querySelector('shopify-accelerated-checkout-cart');
      const height = wallet?.getBoundingClientRect().height || 0;
      const rowHeight = wallet && parseFloat(getComputedStyle(wallet)
        .getPropertyValue('--shopify-accelerated-checkout-button-block-size'));
      const singleRow = height > 0 && height <= rowHeight + 1;
      this.toggleAttribute('data-single-row', singleRow);
      buttons.inert = !singleRow;
    });
    this.observer.observe(buttons);
  }

  disconnectedCallback() {
    this.observer?.disconnect();
  }
}

window.customElements.define('tps-cart-express', CartDrawerExpress);

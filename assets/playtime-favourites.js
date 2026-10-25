if (!customElements.get('playtime-favourites')) {
  customElements.define('playtime-favourites', class extends HTMLElement {
    connectedCallback() {
      if (this.handleClick) return;
      this.handleClick = (event) => {
        const swatch = event.target.closest('[data-pf-swatch]');
        if (!swatch || !this.contains(swatch) || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const card = swatch.closest('[data-pf-card]');
        const state = swatch.parentElement.querySelector('[data-pf-state]')?.content;
        if (!card || !state) return;
        event.preventDefault();
        const visual = card.querySelector('[data-pf-visual]');
        const nextVisual = state.querySelector('[data-state-visual]');
        if (visual && nextVisual) visual.replaceChildren(...Array.from(nextVisual.childNodes, (node) => node.cloneNode(true)));
        card.querySelectorAll('[data-pf-link]').forEach((link) => {
          link.href = swatch.href;
        });
        const title = card.querySelector('[data-pf-dynamic-title]');
        if (title) title.textContent = swatch.dataset.productTitle;
        const price = card.querySelector('[data-pf-price]');
        if (price) price.textContent = state.querySelector('[data-state-price]').textContent;
        const available = swatch.dataset.available === 'true';
        const badge = card.querySelector('[data-pf-badge]');
        if (badge) badge.hidden = available;
        const cta = card.querySelector('[data-pf-cta]');
        if (cta) {
          cta.textContent = available ? cta.dataset.availableLabel : cta.dataset.unavailableLabel;
          const arrow = document.createElement('span');
          arrow.setAttribute('aria-hidden', 'true');
          arrow.textContent = ' →';
          cta.appendChild(arrow);
        }
        card.querySelectorAll('[data-pf-swatch]').forEach((link) => link.setAttribute('aria-current', String(link === swatch)));
        const colour = card.querySelector('[data-pf-colour]');
        if (colour) colour.textContent = swatch.dataset.colour;
        const announcement = card.querySelector('[data-pf-announcement]');
        if (announcement) announcement.textContent = [swatch.dataset.colour, price?.textContent, available ? '' : badge?.textContent].filter(Boolean).join('. ');
      };
      this.addEventListener('click', this.handleClick);
    }

    disconnectedCallback() {
      this.removeEventListener('click', this.handleClick);
      this.handleClick = null;
    }
  });
}

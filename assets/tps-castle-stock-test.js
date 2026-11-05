if (!customElements.get('tps-castle-stock-test')) {
  customElements.define('tps-castle-stock-test', class extends HTMLElement {
    connectedCallback() {
      if (this.started) return;
      this.started = true;
      this.preview = new URLSearchParams(location.search).get('tps_castle_stock');
      this.qa = ['A', 'B', 'QA_A', 'QA_B'].includes(this.preview);
      this.form = document.getElementById(this.dataset.formId);
      this.exposed = this.exposed || false;
      this.pendingEvents = [];
      if (this.dataset.eligible !== 'true' || !this.form) return;
      if (this.qa) {
        this.group = this.preview.endsWith('B') ? 'B' : 'A';
        this.dataset.group = this.group;
        this.dataset.mode = 'preview';
        this.hidden = this.group !== 'B';
        if (this.preview.startsWith('QA_')) {
          const ping = () => {
            if (window.Shopify?.customerPrivacy?.analyticsProcessingAllowed() !== true || typeof window.gtag !== 'function') return;
            window.gtag('event', 'tps_castle_stock_qa', {
              send_to: this.dataset.measurementId,
              experiment_id: this.dataset.experiment,
              experiment_variant: this.group,
              debug_mode: true,
              event_callback: () => { this.dataset.lastTrackedEvent = 'tps_castle_stock_qa'; },
              event_timeout: 2000
            });
            this.dataset.lastQueuedEvent = 'tps_castle_stock_qa';
          };
          if (window.Shopify?.customerPrivacy) ping();
          else window.Shopify?.loadFeatures?.([{ name: 'consent-tracking-api', version: '0.2' }], (error) => { if (!error && this.isConnected) ping(); });
        }
        return;
      }
      if (this.dataset.enabled !== 'true' || !Number.isFinite(Date.parse(this.dataset.endsAt)) || Date.now() >= Date.parse(this.dataset.endsAt)) return;
      this.onConsent = () => {
        if (window.Shopify?.customerPrivacy?.analyticsProcessingAllowed() !== true) {
          this.stop();
        } else {
          if (this.running) this.hidden = this.group !== 'B';
          else this.begin();
        }
      };
      document.addEventListener('visitorConsentCollected', this.onConsent);
      this.onPageShow = () => {
        if (!this.isConnected) return;
        if (Date.now() >= Date.parse(this.dataset.endsAt)) {
          this.stop();
          return;
        }
        if (window.Shopify?.customerPrivacy) this.onConsent();
        else window.Shopify?.loadFeatures?.([{ name: 'consent-tracking-api', version: '0.2' }], (error) => {
          if (!error && this.isConnected) this.onConsent();
        });
      };
      window.addEventListener('pageshow', this.onPageShow);
      this.onPageShow();
    }

    begin() {
      if (!this.isConnected || this.running || window.Shopify?.customerPrivacy?.analyticsProcessingAllowed() !== true) return;
      if (Date.now() >= Date.parse(this.dataset.endsAt)) return;
      try {
        const existing = localStorage.getItem(this.dataset.experiment);
        this.group = existing === 'A' || existing === 'B' ? existing : (crypto.getRandomValues(new Uint32Array(1))[0] % 2 ? 'B' : 'A');
        if (!existing || existing !== this.group) localStorage.setItem(this.dataset.experiment, this.group);
      } catch (_) {
        return;
      }
      this.running = true;
      this.dataset.group = this.group;
      this.dataset.mode = 'experiment';
      this.hidden = this.group !== 'B';
      this.property = document.createElement('input');
      this.property.type = 'hidden';
      this.property.name = 'properties[_TPS Castle stock test]';
      this.property.value = this.dataset.experiment + ':' + this.group;
      this.form.appendChild(this.property);
      this.onSubmit = () => this.expose();
      this.form.addEventListener('submit', this.onSubmit, true);
      this.onAdd = (event) => {
        if (String(event.detail?.variantId) === this.dataset.variantId && this.exposed) this.track('add');
      };
      document.addEventListener('on:cart:add', this.onAdd);
      const target = this.form.querySelector('[name="add"]');
      if (target && 'IntersectionObserver' in window) {
        this.observer = new IntersectionObserver((entries) => {
          if (entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5)) this.expose();
        }, { threshold: 0.5 });
        this.observer.observe(target);
      }
      this.expiryTimer = setTimeout(() => this.stop(), Math.min(Date.parse(this.dataset.endsAt) - Date.now(), 2147483647));
    }

    expose() {
      if (!this.running || this.exposed || window.Shopify?.customerPrivacy?.analyticsProcessingAllowed() !== true) return;
      this.exposed = true;
      this.observer?.disconnect();
      this.track('view');
    }

    track(action) {
      if (!this.running || window.Shopify?.customerPrivacy?.analyticsProcessingAllowed() !== true) return;
      this.pendingEvents.push(action);
      if (!this.trackingTimer) this.flushEvents();
    }

    flushEvents() {
      this.trackingTimer = null;
      if (!this.isConnected || !this.running || window.Shopify?.customerPrivacy?.analyticsProcessingAllowed() !== true) return;
      if (Date.now() >= Date.parse(this.dataset.endsAt)) {
        this.stop();
        return;
      }
      if (typeof window.gtag !== 'function') {
        if ((this.trackingAttempts = (this.trackingAttempts || 0) + 1) <= 120) {
          this.trackingTimer = setTimeout(() => this.flushEvents(), 500);
        }
        return;
      }
      this.trackingAttempts = 0;
      while (this.pendingEvents.length) this.sendEvent(this.pendingEvents.shift());
    }

    sendEvent(action) {
      const eventName = 'tps_castle_stock_' + this.group.toLowerCase() + '_' + action;
      window.gtag('event', eventName, {
        send_to: this.dataset.measurementId,
        experiment_id: this.dataset.experiment,
        experiment_variant: this.group,
        product_id: this.dataset.productId,
        variant_id: this.dataset.variantId,
        inventory_quantity: Number(this.dataset.quantity),
        event_callback: () => { this.dataset.lastTrackedEvent = eventName; },
        event_timeout: 2000
      });
      this.dataset.lastQueuedEvent = eventName;
    }

    stop() {
      this.running = false;
      this.hidden = true;
      this.observer?.disconnect();
      this.property?.remove();
      if (this.onSubmit) this.form?.removeEventListener('submit', this.onSubmit, true);
      if (this.onAdd) document.removeEventListener('on:cart:add', this.onAdd);
      clearTimeout(this.trackingTimer);
      this.trackingTimer = null;
      this.trackingAttempts = 0;
      this.pendingEvents = [];
      clearTimeout(this.expiryTimer);
    }

    disconnectedCallback() {
      this.stop();
      if (this.onConsent) document.removeEventListener('visitorConsentCollected', this.onConsent);
      if (this.onPageShow) window.removeEventListener('pageshow', this.onPageShow);
      this.started = false;
    }
  });
}

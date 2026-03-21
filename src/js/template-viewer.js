/**
 * TemplateViewer
 * Full ARIA tab widget with iframe preview, MJML source, and compiled HTML panels.
 * Follows the ARIA Authoring Practices Guide "Tabs (Automatic Activation)" pattern.
 */
export class TemplateViewer {
  #container;
  #manifest;
  #currentId = null;
  #activeTab = 'preview';
  #mjmlCache = new Map();
  #htmlCache = new Map();

  // DOM refs (set after #buildDOM)
  #panel = null;
  #viewerTitle = null;
  #iframe = null;
  #mjmlCode = null;
  #htmlCode = null;
  #liveRegion = null;
  #tabButtons = null;
  #tabPanels = null;
  #deviceBtns = null;
  #frameWrap = null;

  constructor(container, manifest) {
    this.#container = container;
    this.#manifest = manifest;
  }

  init() {
    this.#buildDOM();
    this.#wireTabEvents();
    this.#wireDeviceToggle();
    this.#wireCopyButtons();
    this.#liveRegion = document.getElementById('viewer-live-region');
  }

  /** Called by TemplateGallery when a card is selected. */
  load(templateId) {
    if (this.#currentId === templateId) {
      // Already loaded — just scroll and focus
      this.#scrollAndFocus();
      return;
    }

    this.#currentId = templateId;
    const meta = this.#manifest.find(t => t.id === templateId);
    if (!meta) return;

    // Show the panel if it was hidden
    const placeholder = this.#container.querySelector('.viewer-placeholder');
    if (placeholder) placeholder.remove();
    this.#panel.style.display = '';

    // Update title
    this.#viewerTitle.textContent = meta.label;

    // Reset tab to preview when loading a new template
    this.#switchTab('preview');

    // Load iframe (if preview tab is active — which it is after the reset)
    this.#loadIframe(templateId);

    // Pre-fetch source files in background
    this.#fetchMjml(templateId);
    this.#fetchHtml(templateId);

    // Accessibility: scroll into view and move focus
    this.#scrollAndFocus();

    // Announce to screen readers
    this.#announce(`${meta.label} template loaded`);
  }

  // -------------------------------------------------------------------------
  // DOM Construction
  // -------------------------------------------------------------------------

  #buildDOM() {
    // Placeholder (shown until a template is selected)
    const placeholder = document.createElement('div');
    placeholder.className = 'viewer-placeholder';
    placeholder.innerHTML = `
      <svg class="viewer-placeholder__icon" aria-hidden="true" focusable="false" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
      <p>Select a template from the gallery above to inspect it here.</p>
    `;
    this.#container.appendChild(placeholder);

    // Main panel
    this.#panel = document.createElement('div');
    this.#panel.className = 'viewer-panel';
    this.#panel.style.display = 'none';
    this.#panel.innerHTML = this.#panelHTML();
    this.#container.appendChild(this.#panel);

    // Cache DOM refs
    this.#viewerTitle  = this.#panel.querySelector('.viewer-title');
    this.#iframe       = this.#panel.querySelector('.template-iframe');
    this.#frameWrap    = this.#panel.querySelector('.preview-frame-wrap');
    this.#mjmlCode     = this.#panel.querySelector('#tab-panel-mjml code');
    this.#htmlCode     = this.#panel.querySelector('#tab-panel-html code');
    this.#tabButtons   = this.#panel.querySelectorAll('[role="tab"]');
    this.#tabPanels    = this.#panel.querySelectorAll('[role="tabpanel"]');
    this.#deviceBtns   = this.#panel.querySelectorAll('.device-btn');
  }

  #panelHTML() {
    return `
      <!-- Panel header: title + device width toggle -->
      <div class="viewer-header">
        <h3 class="viewer-title" id="viewer-panel-title" tabindex="-1">Template</h3>
        <div class="viewer-device-toggle" aria-label="Preview width">
          <button class="device-btn is-active" data-width="email" aria-pressed="true">
            Email (600px)
          </button>
          <button class="device-btn" data-width="mobile" aria-pressed="false">
            Mobile (375px)
          </button>
          <button class="device-btn" data-width="full" aria-pressed="false">
            Full width
          </button>
        </div>
      </div>

      <!-- Tab bar -->
      <div
        role="tablist"
        aria-label="Template view options"
        class="viewer-tablist"
      >
        <button
          role="tab"
          id="tab-preview"
          aria-controls="tab-panel-preview"
          aria-selected="true"
          class="viewer-tab"
          data-tab="preview"
        >Preview</button>
        <button
          role="tab"
          id="tab-mjml"
          aria-controls="tab-panel-mjml"
          aria-selected="false"
          class="viewer-tab"
          data-tab="mjml"
          tabindex="-1"
        >MJML Source</button>
        <button
          role="tab"
          id="tab-html"
          aria-controls="tab-panel-html"
          aria-selected="false"
          class="viewer-tab"
          data-tab="html"
          tabindex="-1"
        >Compiled HTML</button>
      </div>

      <!-- Tab panels -->
      <div
        role="tabpanel"
        id="tab-panel-preview"
        aria-labelledby="tab-preview"
        class="viewer-tabpanel is-active"
        tabindex="0"
      >
        <div class="preview-frame-wrap is-email-width">
          <iframe
            class="template-iframe"
            title="Email template preview"
            sandbox="allow-same-origin"
            referrerpolicy="no-referrer"
          ></iframe>
        </div>
      </div>

      <div
        role="tabpanel"
        id="tab-panel-mjml"
        aria-labelledby="tab-mjml"
        class="viewer-tabpanel"
        tabindex="0"
      >
        <div class="code-panel">
          <button class="copy-btn" aria-label="Copy MJML source to clipboard" data-copy="mjml">
            Copy
          </button>
          <pre class="language-markup" aria-label="MJML source code"><code class="language-markup"></code></pre>
        </div>
      </div>

      <div
        role="tabpanel"
        id="tab-panel-html"
        aria-labelledby="tab-html"
        class="viewer-tabpanel"
        tabindex="0"
      >
        <div class="code-panel">
          <button class="copy-btn" aria-label="Copy compiled HTML to clipboard" data-copy="html">
            Copy
          </button>
          <pre class="language-markup" aria-label="Compiled HTML source code"><code class="language-markup"></code></pre>
        </div>
      </div>
    `;
  }

  // -------------------------------------------------------------------------
  // Event Wiring
  // -------------------------------------------------------------------------

  #wireTabEvents() {
    this.#tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.#switchTab(btn.dataset.tab);
      });

      btn.addEventListener('focus', () => {
        // Automatic activation on focus (APG pattern)
        this.#switchTab(btn.dataset.tab);
      });
    });

    // Keyboard navigation on the tablist
    const tablist = this.#panel.querySelector('[role="tablist"]');
    tablist.addEventListener('keydown', e => {
      const tabs = [...this.#tabButtons];
      const idx = tabs.indexOf(document.activeElement);
      if (idx === -1) return;

      let next = -1;
      if (e.key === 'ArrowRight') { next = (idx + 1) % tabs.length; e.preventDefault(); }
      if (e.key === 'ArrowLeft')  { next = (idx - 1 + tabs.length) % tabs.length; e.preventDefault(); }
      if (e.key === 'Home')       { next = 0; e.preventDefault(); }
      if (e.key === 'End')        { next = tabs.length - 1; e.preventDefault(); }

      if (next !== -1) tabs[next].focus();
    });
  }

  #wireDeviceToggle() {
    this.#deviceBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.#deviceBtns.forEach(b => {
          b.classList.remove('is-active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('is-active');
        btn.setAttribute('aria-pressed', 'true');

        this.#frameWrap.classList.remove('is-email-width', 'is-mobile-width', 'is-full-width');
        if (btn.dataset.width === 'full') {
          this.#frameWrap.classList.add('is-full-width');
        } else if (btn.dataset.width === 'mobile') {
          this.#frameWrap.classList.add('is-mobile-width');
        } else {
          this.#frameWrap.classList.add('is-email-width');
        }
      });
    });
  }

  #wireCopyButtons() {
    this.#panel.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const type = btn.dataset.copy;
        const code = type === 'mjml'
          ? this.#mjmlCode?.textContent
          : this.#htmlCode?.textContent;

        if (!code) return;

        try {
          await navigator.clipboard.writeText(code);
          const original = btn.textContent;
          const originalLabel = btn.getAttribute('aria-label');
          btn.textContent = 'Copied!';
          btn.setAttribute('aria-label', 'Copied to clipboard');
          setTimeout(() => {
            btn.textContent = original;
            btn.setAttribute('aria-label', originalLabel);
          }, 2000);
        } catch {
          btn.textContent = 'Failed';
          setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
        }
      });
    });
  }

  // -------------------------------------------------------------------------
  // Tab Switching
  // -------------------------------------------------------------------------

  #switchTab(tabId) {
    if (this.#activeTab === tabId) return;
    this.#activeTab = tabId;

    // Update tab buttons
    this.#tabButtons.forEach(btn => {
      const isSelected = btn.dataset.tab === tabId;
      btn.setAttribute('aria-selected', String(isSelected));
      btn.setAttribute('tabindex', isSelected ? '0' : '-1');
    });

    // Update tab panels
    this.#tabPanels.forEach(panel => {
      const isActive = panel.id === `tab-panel-${tabId}`;
      panel.classList.toggle('is-active', isActive);
    });

    // Lazy-load iframe when switching to preview
    if (tabId === 'preview' && this.#currentId) {
      this.#loadIframe(this.#currentId);
    }

    // Highlight code when switching to source tabs
    if ((tabId === 'mjml' || tabId === 'html') && this.#currentId) {
      if (tabId === 'mjml') {
        this.#fetchMjml(this.#currentId).then(src => this.#highlightCode(this.#mjmlCode, src));
      } else {
        this.#fetchHtml(this.#currentId).then(src => this.#highlightCode(this.#htmlCode, src));
      }
    }
  }

  // -------------------------------------------------------------------------
  // Content Loading
  // -------------------------------------------------------------------------

  #loadIframe(id) {
    const src = `/compiled/${id}.html`;
    if (this.#iframe.src !== src && !this.#iframe.src.endsWith(`/compiled/${id}.html`)) {
      this.#iframe.src = src;
      // Update iframe title for accessibility
      const meta = this.#manifest.find(t => t.id === id);
      if (meta) {
        this.#iframe.title = `Preview of ${meta.label} email template`;
      }
    }
  }

  async #fetchMjml(id) {
    if (this.#mjmlCache.has(id)) return this.#mjmlCache.get(id);
    try {
      const res = await fetch(`/templates/${id}.mjml`);
      const text = await res.text();
      this.#mjmlCache.set(id, text);
      return text;
    } catch {
      return '<!-- Could not load MJML source -->';
    }
  }

  async #fetchHtml(id) {
    if (this.#htmlCache.has(id)) return this.#htmlCache.get(id);
    try {
      const res = await fetch(`/compiled/${id}.html`);
      const text = await res.text();
      this.#htmlCache.set(id, text);
      return text;
    } catch {
      return '<!-- Could not load compiled HTML -->';
    }
  }

  #highlightCode(codeEl, source) {
    if (!codeEl) return;
    codeEl.textContent = source;

    // Use Prism if available (loaded via CDN with defer — may not be ready immediately)
    if (typeof Prism !== 'undefined') {
      Prism.highlightElement(codeEl);
    }
  }

  // -------------------------------------------------------------------------
  // Accessibility Helpers
  // -------------------------------------------------------------------------

  #scrollAndFocus() {
    const section = document.getElementById('viewer');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    // Move focus to the panel title (has tabindex="-1")
    setTimeout(() => {
      this.#viewerTitle?.focus();
    }, 300); // slight delay to let scroll settle
  }

  #announce(message) {
    if (!this.#liveRegion) return;
    this.#liveRegion.textContent = '';
    // RAF ensures the DOM update triggers a new announcement
    requestAnimationFrame(() => {
      this.#liveRegion.textContent = message;
    });
  }
}

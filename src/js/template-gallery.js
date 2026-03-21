/**
 * TemplateGallery
 * Renders template cards with lazily-loaded, scaled-iframe thumbnails.
 */
export class TemplateGallery {
  #container;
  #manifest;
  #selectCallback = null;
  #activeId = null;
  #observer = null;

  constructor(container, manifest) {
    this.#container = container;
    this.#manifest = manifest;
  }

  /** Register a callback for when a template card is selected. */
  onSelect(callback) {
    this.#selectCallback = callback;
  }

  render() {
    if (!this.#manifest.length) {
      this.#container.innerHTML = '<li><p style="color:var(--color-text-muted)">No templates found.</p></li>';
      return;
    }

    const fragment = document.createDocumentFragment();

    this.#manifest.forEach((template, index) => {
      const li = document.createElement('li');
      li.dataset.templateId = template.id;

      li.innerHTML = `
        <article class="template-card" aria-label="${this.#escape(template.label)} email template">
          <div class="card-thumbnail" aria-hidden="true">
            <iframe
              data-src="/compiled/${this.#escape(template.id)}.html"
              title="Preview of ${this.#escape(template.label)} template"
              sandbox="allow-same-origin"
              referrerpolicy="no-referrer"
              tabindex="-1"
            ></iframe>
            <div class="card-thumbnail__placeholder">Loading preview…</div>
          </div>
          <div class="card-body">
            <p class="card-category" aria-hidden="true">Email Template</p>
            <h3 class="card-title">${this.#escape(template.label)}</h3>
            <p class="card-desc">${this.#escape(template.description)}</p>
            <button
              class="card-btn"
              data-template-id="${this.#escape(template.id)}"
              aria-label="View ${this.#escape(template.label)} template"
            >
              View Template
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </article>
      `;

      // Load thumbnail iframe lazily
      const iframe = li.querySelector('iframe');
      const placeholder = li.querySelector('.card-thumbnail__placeholder');

      this.#observeThumb(iframe, placeholder, index);

      // Wire button
      li.querySelector('.card-btn').addEventListener('click', () => {
        this.#setActive(template.id, li);
        this.#selectCallback?.(template.id);
      });

      fragment.appendChild(li);
    });

    this.#container.appendChild(fragment);
    requestAnimationFrame(() => this.#scaleThumbs());
    const debouncedScale = this.#debounce(() => this.#scaleThumbs(), 150);
    window.addEventListener('resize', debouncedScale);
  }

  /** Mark a card as active (called externally by TemplateViewer if needed). */
  setActive(id) {
    const li = this.#container.querySelector(`[data-template-id="${id}"]`);
    if (li) this.#setActive(id, li);
  }

  #setActive(id, li) {
    if (this.#activeId === id) return;
    this.#activeId = id;

    // Remove active class from all cards
    this.#container.querySelectorAll('.template-card').forEach(card => {
      card.classList.remove('is-active');
    });

    li.querySelector('.template-card').classList.add('is-active');
  }

  /** Use IntersectionObserver to lazy-load iframe thumbnails. */
  #observeThumb(iframe, placeholder, index) {
    if (!('IntersectionObserver' in window)) {
      // Fallback: load all immediately
      iframe.src = iframe.dataset.src;
      placeholder.style.display = 'none';
      return;
    }

    if (!this.#observer) {
      this.#observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            const ph = el.parentElement.querySelector('.card-thumbnail__placeholder');
            if (el.dataset.src && !el.src) {
              el.src = el.dataset.src;
              el.addEventListener('load', () => {
                if (ph) ph.style.display = 'none';
              }, { once: true });
            }
            this.#observer.unobserve(el);
          });
        },
        { rootMargin: '200px 0px' }
      );
    }

    // First card: eager load (likely above the fold)
    if (index === 0) {
      iframe.src = iframe.dataset.src;
      iframe.addEventListener('load', () => {
        placeholder.style.display = 'none';
      }, { once: true });
    } else {
      this.#observer.observe(iframe);
    }
  }

  #scaleThumbs() {
    this.#container.querySelectorAll('.card-thumbnail').forEach(thumb => {
      const iframe = thumb.querySelector('iframe');
      if (!iframe) return;
      const scale = thumb.offsetWidth / 600;
      iframe.style.transform = `scale(${scale})`;
    });
  }

  #debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  #escape(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

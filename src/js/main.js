import { initNavHighlight } from './nav-highlight.js';
import { TemplateGallery } from './template-gallery.js';
import { TemplateViewer } from './template-viewer.js';

async function init() {
  // Fetch the manifest built by scripts/build-emails.js
  let manifest = [];
  try {
    const res = await fetch('/compiled/manifest.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    manifest = await res.json();
  } catch (err) {
    console.warn('[MJML System] Could not load template manifest:', err);
  }

  const galleryEl = document.getElementById('template-gallery');
  const viewerEl  = document.getElementById('template-viewer');

  if (!galleryEl || !viewerEl) {
    console.warn('[MJML System] Required DOM elements not found.');
    return;
  }

  // Initialize gallery
  const gallery = new TemplateGallery(galleryEl, manifest);
  gallery.render();

  // Initialize viewer
  const viewer = new TemplateViewer(viewerEl, manifest);
  viewer.init();

  // Wire gallery → viewer
  gallery.onSelect((templateId) => {
    viewer.load(templateId);
  });

  // Scroll-based nav highlighting
  initNavHighlight();

  // Render Lucide icons — guard against module/defer load ordering
  if (typeof window.lucide !== 'undefined') {
    window.lucide.createIcons();
  } else {
    window.addEventListener('load', () => window.lucide?.createIcons(), { once: true });
  }

  // Mobile nav toggle
  const navToggle = document.querySelector('.site-nav__toggle');
  const siteNav = document.querySelector('.site-nav');
  if (navToggle && siteNav) {
    navToggle.addEventListener('click', () => {
      const isOpen = siteNav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
      navToggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
    });

    // Close menu when a nav link is clicked
    siteNav.querySelectorAll('.site-nav__links a').forEach(link => {
      link.addEventListener('click', () => {
        siteNav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-label', 'Open navigation menu');
      });
    });
  }

  // Skip-nav: ensure focus moves to main content
  const skipNav = document.querySelector('.skip-nav');
  const mainContent = document.getElementById('main-content');
  if (skipNav && mainContent) {
    skipNav.addEventListener('click', (e) => {
      e.preventDefault();
      mainContent.setAttribute('tabindex', '-1');
      mainContent.focus();
      mainContent.addEventListener('blur', () => {
        mainContent.removeAttribute('tabindex');
      }, { once: true });
    });
  }
}

// Run after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

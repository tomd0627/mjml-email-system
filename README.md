# MJML Email Template System

A portfolio showcase of 5 production-ready email templates built with MJML — demonstrating cross-client compatibility, responsive design, and end-to-end
email development workflow.

## Overview

MJML is a component-based email templating framework that compiles to battle-tested,
inline-styled HTML. This project demonstrates ownership of the full email development
stack: authoring templates, compiling them at build time, testing cross-client
compatibility, and building a portfolio site to showcase the work.

## Templates

| Template                 | Description                       | Key Techniques                                            |
| ------------------------ | --------------------------------- | --------------------------------------------------------- |
| **Newsletter**           | Weekly digest with article cards  | Multi-column layout, `mj-table`, hero image, social links |
| **Order Confirmation**   | Transactional receipt             | Item table, 2-col shipping/billing block, minimal design  |
| **Promotional / Sale**   | Marketing email with sale pricing | Full-bleed hero, coupon code block, 2×2 product grid      |
| **Welcome & Onboarding** | New user onboarding               | Numbered steps, 3-col feature highlights, dual CTA        |
| **Password Reset**       | Account security notification     | Centered layout, prominent CTA, security tips box         |

## Email Client Compatibility

Tested in:

- Gmail — Chrome (desktop)
- Gmail — Mobile (iOS, Chrome DevTools emulation)
- Outlook.com — Chrome
- Outlook 365 — Windows (VML fallbacks active for rounded buttons)
- Apple Mail — macOS (includes dark mode support)

**On Outlook (2007–365):** Microsoft's Word-based rendering engine ignores CSS
`border-radius`. All CTA buttons include VML fallbacks wrapped in MSO conditional
comments — the only reliable solution for rounded buttons in Outlook.

**On dark mode:** Every template includes a
`@media (prefers-color-scheme: dark)` block with `!important` overrides, targeting
elements by `css-class` attributes. Note: Gmail on standard free accounts does not
support this media query (a known, irresolvable Gmail limitation).

## Tech Stack

| Tool                        | Role                                              |
| --------------------------- | ------------------------------------------------- |
| **MJML 4.x**                | Email templating — compiles to cross-client HTML  |
| **Vite 6**                  | Build tool and dev server                         |
| **Vanilla JS (ES modules)** | Portfolio site interactivity — no framework       |
| **Prism.js**                | Syntax highlighting (CDN, no bundle cost)         |
| **Netlify**                 | Static deploy (free tier)                         |
| **Mailtrap**                | SMTP sandbox for email client testing (free tier) |

## Project Structure

```
mjml-email-system/
├── public/
│   ├── favicon.svg
│   ├── compiled/         # Built by scripts/build-emails.js — committed to git
│   │   ├── manifest.json
│   │   └── *.html
│   ├── templates/        # MJML sources copied here for browser fetch
│   └── assets/screenshots/
├── src/
│   ├── templates/        # MJML source files (source of truth)
│   │   └── *.mjml
│   ├── css/main.css
│   ├── js/
│   │   ├── main.js
│   │   ├── template-gallery.js
│   │   ├── template-viewer.js
│   │   └── nav-highlight.js
│   └── index.html
├── scripts/
│   ├── build-emails.js   # Compiles .mjml → public/compiled/*.html + manifest.json
│   └── send-test.js      # Sends compiled HTML to Mailtrap (manual, not in build)
└── ...config files
```

## Getting Started

**Prerequisites:** Node.js 18+ (LTS)

```bash
git clone https://github.com/tomd0627/mjml-email-system
cd mjml-email-system
npm install
```

### Development

```bash
npm run dev
# Compiles MJML templates, then starts Vite dev server at localhost:5173
```

### Production Build

```bash
npm run build
# Output in dist/
```

### Email Testing with Mailtrap

```bash
cp .env.example .env
# Fill in your Mailtrap credentials (free account at mailtrap.io)

node scripts/send-test.js
# Sends all 5 compiled templates to your Mailtrap inbox for client screenshots
```

## Build Pipeline

```
.mjml source → build-emails.js → compiled .html → Vite build → Netlify deploy
```

`scripts/build-emails.js` reads `src/templates/*.mjml`, compiles each with the
`mjml` npm package, writes output to `public/compiled/`, and generates
`manifest.json` — the only data file the front-end reads. Adding a 6th template
requires only a new `.mjml` file and a line in the `LABELS` map; the site picks
it up automatically.

## Design

**Palette:** Deep Ink Navy + Electric Chartreuse + Amber — chosen to be distinct
from other portfolio pieces.

| Token            | Value     | Role                               |
| ---------------- | --------- | ---------------------------------- |
| `--color-bg`     | `#0c1220` | Page background                    |
| `--color-accent` | `#b8ff57` | CTAs, highlights, focus rings      |
| `--color-warm`   | `#ff7c38` | Secondary badges, labels           |
| `--color-text`   | `#e8f0ff` | Body copy (~14.5:1 contrast — AAA) |

## Accessibility

- WCAG 2.1 AA target throughout
- Skip navigation link as first focusable element
- Full ARIA Tabs pattern in the template viewer (APG compliant)
- Device width toggle (Email 600px / Mobile 375px / Full width) hidden on viewports ≤ 639px where it is redundant
- `IntersectionObserver`-based active nav link (`aria-current="location"` — correct for in-page anchor navigation)
- `aria-live="polite"` region announces template loads to screen readers
- `prefers-reduced-motion` respected — all transitions disabled when set
- `:focus-visible` ring on every interactive element

## Security Notes

`npm audit` reports vulnerabilities in `html-minifier`, a transitive dependency of
`mjml` with no upstream fix currently available. All vulnerable packages are
`devDependencies` — they are used only at build time and are never included in the
deployed static site. The production `dist/` output has no npm dependencies.

## License

MIT © Tom DeLuca

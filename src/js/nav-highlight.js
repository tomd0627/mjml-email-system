/**
 * initNavHighlight
 * Uses IntersectionObserver to set aria-current="page" on the nav link
 * corresponding to the section currently in view.
 */
export function initNavHighlight() {
  const sections = document.querySelectorAll('main section[id]');
  const navLinks = document.querySelectorAll('nav a[href^="#"]');

  if (!sections.length || !navLinks.length) return;
  if (!('IntersectionObserver' in window)) return;

  const setActive = (id) => {
    navLinks.forEach(link => {
      const isActive = link.getAttribute('href') === `#${id}`;
      if (isActive) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActive(entry.target.id);
        }
      });
    },
    {
      // Trigger when the section is 20% from top and 30% from bottom of viewport
      rootMargin: '-20% 0px -30% 0px',
      threshold: 0,
    }
  );

  sections.forEach(section => observer.observe(section));
}

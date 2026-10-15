/* ============================================================
   Lone Star ITS Private AI — main.js
   Dark Mode | Hamburger Menu
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* -------- Dark Mode -------- */
  const toggle = document.getElementById('dark-mode-toggle');
  let saved = null;
  try { saved = localStorage.getItem('darkMode'); } catch (e) { /* storage blocked */ }
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const startDark = saved === null ? prefersDark : saved === 'true';

  if (startDark) {
    document.body.classList.add('dark-mode');
    if (toggle) toggle.textContent = 'Light';
  }

  if (toggle) {
    toggle.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      const isDark = document.body.classList.contains('dark-mode');
      toggle.textContent = isDark ? 'Light' : 'Dark';
      try { localStorage.setItem('darkMode', isDark); } catch (e) { /* storage blocked */ }
    });
  }

  /* -------- Hamburger Menu -------- */
  const hamburger = document.getElementById('hamburger');
  const nav       = document.getElementById('main-nav');

  if (hamburger && nav) {
    hamburger.setAttribute('aria-controls', nav.id || 'main-nav');
    hamburger.setAttribute('aria-expanded', 'false');

    function setMenuOpen(isOpen) {
      hamburger.classList.toggle('open', isOpen);
      nav.classList.toggle('open', isOpen);
      hamburger.setAttribute('aria-expanded', String(isOpen));
    }

    hamburger.addEventListener('click', () => {
      setMenuOpen(!nav.classList.contains('open'));
    });

    nav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => setMenuOpen(false));
    });
  }
});

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

/* -------- Quote Request Form -------- */
const QUOTE_URL = 'https://lone-star-private-ai.saints-correa23.workers.dev/api/quote';

document.addEventListener('DOMContentLoaded', () => {
  const form   = document.getElementById('quote-form');
  const status = document.getElementById('form-status');
  if (!form) return;

  const setStatus = (text, state) => {
    if (!status) return;
    status.textContent = text;
    status.dataset.state = state || '';
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const value = (name) => (form.elements[name] ? form.elements[name].value.trim() : '');
    const button = form.querySelector('button[type="submit"]');
    if (button) button.disabled = true;
    setStatus('Sending…', 'pending');

    try {
      const res = await fetch(QUOTE_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:     value('name'),
          email:    value('email'),
          company:  value('company'),
          phone:    value('phone'),
          teamSize: value('teamSize'),
          message:  value('message'),
          _gotcha:  value('_gotcha'),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        const failure = new Error('Submission failed');
        failure.serverMessage = data.error;
        throw failure;
      }
      window.location.href = 'thankyou.html';
    } catch (err) {
      setStatus(
        err.serverMessage || "Sorry — we couldn't send your request. Please email support@lonestar-its.com or call (254) 317-9258.",
        'error'
      );
      if (button) button.disabled = false;
    }
  });
});

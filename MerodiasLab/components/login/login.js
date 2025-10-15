// components/login/login.js
(function () {
  const onReady = (fn) => {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  };

  const norm = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const MOBILE_TRANSITION_MS = 320; 

  onReady(async () => {
    // Config
    const cfg = Object.assign(
      { src: 'components/login/login.html', redirect: 'panel.html' },
      window.LOGIN_COMPONENT || {}
    );

    // Inyectar el modal al final del body
    const container = document.createElement('div');
    document.body.appendChild(container);

    try {
      const res = await fetch(cfg.src, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      container.innerHTML = await res.text();
    } catch (err) {
      console.error('No se pudo cargar el login:', err);
      return;
    }

    const modal  = document.getElementById('loginModal');
    const dialog = modal?.querySelector('.lgn-dialog');
    const backdrop = modal?.querySelector('.lgn-backdrop');
    const closeBtns = modal?.querySelectorAll('[data-close]');
    const form = modal?.querySelector('#lgnForm');
    if (!modal || !dialog || !form) return;

    // -------- helpers
    const focusablesSel = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
    let lastActive = null;

    function trapTab(e) {
      if (e.key !== 'Tab') return;
      const nodes = Array.from(dialog.querySelectorAll(focusablesSel)).filter(el => !el.disabled);
      if (!nodes.length) return;
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    function closeNavIfOpen() {
      const navMenu = document.querySelector('[data-menu]');
      const navToggle = document.querySelector('[data-toggle]');
      if (navMenu?.getAttribute('data-open') === 'true') {
        navMenu.setAttribute('data-open', 'false');
        navToggle?.setAttribute('aria-expanded', 'false');
        const icon = navToggle?.querySelector('i');
        if (icon) icon.className = 'ri-menu-line';
        return true; 
      }
      return false;
    }

    function openModal() {
      if (modal.getAttribute('data-open') === 'true') return;
      lastActive = document.activeElement;

      modal.hidden = false;
      modal.setAttribute('data-open', 'true');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';

      const first = modal.querySelector('input, select, textarea, button, a');
      first?.focus({ preventScroll: true });

      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('keydown', trapTab);
    }

    function closeModal() {
      modal.setAttribute('data-open', 'false');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';

      setTimeout(() => { modal.hidden = true; }, 250);

      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keydown', trapTab);

      if (lastActive && typeof lastActive.focus === 'function') {
        lastActive.focus({ preventScroll: true });
      }
    }

    function onKeyDown(e) { if (e.key === 'Escape') closeModal(); }

    // Botón desktop (en .c-navbar__actions)
    const actions = document.querySelector('.c-navbar__actions');
    const desktopBtn =
      actions?.querySelector('[data-login-toggle]') ||
      Array.from(actions?.querySelectorAll('button, a') || [])
        .find(el => norm(el.textContent).includes('ingresar')) ||
      actions?.querySelector('button, a');

    // Botón móvil ( en <ul id="navMenu">)
    const mobileBtn =
      document.querySelector('#navMenu .c-navbar__item-mobile .c-btn') ||
      document.querySelector('#navMenu .c-btn'); // fallback por si cambia la clase

    // Conectar ambos triggers
    if (desktopBtn) {
      desktopBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // si el menú móvil estuviera abierto por cualquier motivo, ciérralo
        const wasOpen = closeNavIfOpen();
        if (wasOpen) setTimeout(openModal, MOBILE_TRANSITION_MS);
        else openModal();
      });
    }

    if (mobileBtn) {
      mobileBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // este SIEMPRE vive dentro del menú móvil, así que cerramos y esperamos la transición
        const wasOpen = closeNavIfOpen(); // true casi siempre aquí
        setTimeout(openModal, wasOpen ? MOBILE_TRANSITION_MS : 0);
      });
    }

    //  cerrar modal (backdrop / X)
    backdrop?.addEventListener('click', closeModal);
    closeBtns?.forEach(b => b.addEventListener('click', closeModal));

    // submit + validación mínima + redirect
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = form.email?.value?.trim();
      const pass  = form.password?.value?.trim();

      const emailField = form.querySelector('#lgnEmail');
      const passField  = form.querySelector('#lgnPass');
      const emailHelp  = emailField?.closest('.lgn-field')?.querySelector('.lgn-help');
      const passHelp   = passField?.closest('.lgn-field')?.querySelector('.lgn-help');

      [emailField, passField].forEach(i => i?.classList.remove('is-invalid'));
      if (emailHelp) emailHelp.textContent = '';
      if (passHelp)  passHelp.textContent  = '';

      let invalid = false;
      if (!email) { invalid = true; emailField?.classList.add('is-invalid'); if (emailHelp) emailHelp.textContent = 'Ingresa tu correo.'; }
      if (!pass)  { invalid = true; passField?.classList.add('is-invalid'); if (passHelp)  passHelp.textContent  = 'Ingresa tu contraseña.'; }
      if (invalid) return;

      // fetch/login real
      window.location.href = cfg.redirect;
    });
  });
})();
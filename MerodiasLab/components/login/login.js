// components/login/login.js
(function () {
  const onReady = (fn) => {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  };

  const norm = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const MOBILE_TRANSITION_MS = 320;
  const TOKEN_KEY = 'token';
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

  function bindToast(root, toastId) {
    const host = root?.querySelector('.lgn-dialog') || root;
    const t = host?.querySelector(toastId);
    if (!t) return null;
    const close = t.querySelector('.c-toast__close');
    if (close && !close._bound) {
      close.addEventListener('click', () => t.setAttribute('data-show', 'false'));
      close._bound = true;
    }
    return t;
  }
  function showToast(toastEl, msg, kind = 'err', ms = 2600) {
    if (!toastEl) return;
    toastEl.classList.remove('c-toast--ok','c-toast--err','c-toast--info');
    toastEl.classList.add(kind === 'ok' ? 'c-toast--ok' : kind === 'info' ? 'c-toast--info' : 'c-toast--err');
    const span = toastEl.querySelector('.c-toast__msg');
    if (span) span.textContent = msg || '';
    toastEl.setAttribute('data-show', 'true');
    if (toastEl._timer) clearTimeout(toastEl._timer);
    toastEl._timer = setTimeout(() => toastEl.setAttribute('data-show','false'), ms);
  }

  function markInvalid(input, on = true) {
    if (!input) return;
    if (on) {
      input.classList.add('is-invalid');
      input.setAttribute('aria-invalid', 'true');
    } else {
      input.classList.remove('is-invalid');
      input.removeAttribute('aria-invalid');
    }
  }
  function clearInvalidForm(form) {
    if (!form) return;
    form.querySelectorAll('input').forEach((i) => markInvalid(i, false));
  }
  function flashSubmitError(btn) {
    if (!btn) return;
    btn.classList.add('is-error','is-shake');
    setTimeout(() => btn.classList.remove('is-shake'), 360);
    setTimeout(() => btn.classList.remove('is-error'), 1600);
  }

  onReady(async () => {
    //Cargar HTML 
    const cfg = Object.assign({ src: 'components/login/login.html' }, window.LOGIN_COMPONENT || {});
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

    // Referencias
    const modal = document.getElementById('loginModal');
    const dialog = modal?.querySelector('.lgn-dialog');
    const backdrop = modal?.querySelector('.lgn-backdrop');
    const closeBtns = modal?.querySelectorAll('[data-close]');
    const loginForm = modal?.querySelector('#lgnForm');
    const registerForm = modal?.querySelector('#regForm');
    const goRegister = modal?.querySelector('#goRegister');
    const goLogin = modal?.querySelector('#goLogin');

    if (!modal || !dialog || !loginForm) {
      console.warn('Login modal no encontrado o incompleto');
      return;
    }

    // Toast 
    const loginToast = bindToast(modal, '#lgnToast');

    // A11y focus trap
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

    // Ojos contraseña
    function resetPasswordEyes(root = modal) {
      if (!root) return;
      root.querySelectorAll('[data-toggle-pass]').forEach((btn) => {
        const sel = btn.getAttribute('data-toggle-pass');
        const input = root.querySelector(sel) || document.querySelector(sel);
        if (input) input.type = 'password';
        btn.setAttribute('aria-pressed', 'true'); // oculto => ojo tachado
        btn.setAttribute('aria-label', 'Mostrar contraseña');
      });
    }

    function openModal() {
      if (modal.getAttribute('data-open') === 'true') return;
      lastActive = document.activeElement;
      modal.hidden = false;
      modal.setAttribute('data-open', 'true');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      resetPasswordEyes(modal);
      const first = modal.querySelector('#lgnUser, input, select, textarea, button, a');
      first?.focus({ preventScroll: true });
      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('keydown', trapTab);
    }
    function closeModal() {
      resetPasswordEyes(modal);
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

    // Botones Navbar
    const actions = document.querySelector('.c-navbar__actions');
    const desktopBtn =
      actions?.querySelector('[data-login-toggle]') ||
      Array.from(actions?.querySelectorAll('button, a') || [])
        .find(el => norm(el.textContent).includes('ingresar')) ||
      actions?.querySelector('button, a');

    const mobileBtn =
      document.querySelector('#navMenu .c-navbar__item-mobile .c-btn') ||
      document.querySelector('#navMenu .c-btn');

    if (desktopBtn) {
      desktopBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const wasOpen = closeNavIfOpen();
        if (wasOpen) setTimeout(openModal, MOBILE_TRANSITION_MS);
        else openModal();
      });
    }
    if (mobileBtn) {
      mobileBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const wasOpen = closeNavIfOpen();
        setTimeout(openModal, wasOpen ? MOBILE_TRANSITION_MS : 0);
      });
    }

    // Cierre
    backdrop?.addEventListener('click', closeModal);
    closeBtns?.forEach(b => b.addEventListener('click', closeModal));

    // Auth helpers
    function setToken(t) {
      if (t) localStorage.setItem(TOKEN_KEY, t);
      else localStorage.removeItem(TOKEN_KEY);
      document.dispatchEvent(new CustomEvent('auth:change'));
    }
    function hasToken() { return !!localStorage.getItem(TOKEN_KEY); }
    async function api(path, opts = {}) {
      const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
      const tk = localStorage.getItem(TOKEN_KEY);
      if (tk) headers['Authorization'] = 'Bearer ' + tk;
      return fetch(path, Object.assign({}, opts, { headers }));
    }
    function renderAuthButtons() {
      const on = hasToken();
      document.querySelectorAll('[data-action="login"]').forEach(b => b.style.display = on ? 'none' : '');
      document.querySelectorAll('[data-action="logout"]').forEach(b => b.style.display = on ? '' : 'none');
    }
    document.addEventListener('auth:change', renderAuthButtons);
    renderAuthButtons();
    document.querySelectorAll('[data-action="logout"]').forEach(btn => {
      btn.addEventListener('click', (e) => { e.preventDefault(); setToken(null); renderAuthButtons(); });
    });

    // Validaciones 
    function validateLogin(form) {
      const emailInput = form.querySelector('#lgnUser, [name="email"]');
      const passInput = form.querySelector('#lgnPass, [name="password"]');
      let msg = '';
      let ok = true;
      const fields = [];
      const email = (emailInput?.value || '').trim();
      if (!email) { ok = false; msg ||= 'Ingresa tu correo.'; fields.push(emailInput); }
      else if (!EMAIL_RE.test(email)) { ok = false; msg ||= 'Correo no válido.'; fields.push(emailInput); }
      const pass = (passInput?.value || '');
      if (!pass) { ok = false; msg ||= 'Ingresa tu contraseña.'; fields.push(passInput); }
      else if (pass.length < 6) { ok = false; msg ||= 'La contraseña debe tener al menos 6 caracteres.'; fields.push(passInput); }
      clearInvalidForm(form);
      fields.forEach((f) => markInvalid(f, true));
      return { ok, msg, fields };
    }

    function validateRegister(form) {
      const full = form.querySelector('[name="full_name"]');
      const email = form.querySelector('[name="email"]');
      const phone = form.querySelector('[name="phone"]');
      const pass = form.querySelector('#regPass, [name="password"]');
      let msg = '';
      let ok = true;
      const fields = [];
      const nameVal = (full?.value || '').trim();
      if (!nameVal) { ok = false; msg ||= 'El nombre es obligatorio.'; fields.push(full); }
      else if (nameVal.length < 3) { ok = false; msg ||= 'Nombre muy corto (mínimo 3).'; fields.push(full); }
      const emailVal = (email?.value || '').trim();
      if (!emailVal) { ok = false; msg ||= 'El correo es obligatorio.'; fields.push(email); }
      else if (!EMAIL_RE.test(emailVal)) { ok = false; msg ||= 'Correo no válido.'; fields.push(email); }
      const digits = (phone?.value || '').replace(/\D/g, '');
      if (!digits) { ok = false; msg ||= 'El teléfono es obligatorio.'; fields.push(phone); }
      else if (digits.length !== 8) { ok = false; msg ||= 'El teléfono debe tener exactamente 8 dígitos.'; fields.push(phone); }
      if (phone) phone.value = digits.slice(0, 8);
      const passVal = (pass?.value || '');
      if (!passVal) { ok = false; msg ||= 'La contraseña es obligatoria.'; fields.push(pass); }
      else if (passVal.length < 8) { ok = false; msg ||= 'La contraseña debe tener al menos 8 caracteres.'; fields.push(pass); }
      else if (!/[A-Za-z]/.test(passVal) || !/\d/.test(passVal)) { ok = false; msg ||= 'La contraseña debe incluir letras y números.'; fields.push(pass); }
      clearInvalidForm(form);
      fields.forEach((f) => markInvalid(f, true));
      return { ok, msg, fields };
    }

    // Toggle ojo
    modal.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-toggle-pass]');
      if (!btn) return;
      const sel = btn.getAttribute('data-toggle-pass');
      const input = modal.querySelector(sel) || document.querySelector(sel);
      if (!input) return;
      const wasHidden = input.type === 'password';
      input.type = wasHidden ? 'text' : 'password';
      const nowHidden = input.type === 'password';
      btn.setAttribute('aria-pressed', String(nowHidden));
      btn.setAttribute('aria-label', nowHidden ? 'Mostrar contraseña' : 'Ocultar contraseña');
    });

    // Cambios de vista
    goRegister?.addEventListener('click', (e) => {
      e.preventDefault();
      loginForm.style.display = 'none';
      registerForm.style.display = 'block';
      resetPasswordEyes(registerForm);
      clearInvalidForm(registerForm);
      const first = registerForm.querySelector('input,select,textarea,button,a');
      first?.focus({ preventScroll: true });
    });
    goLogin?.addEventListener('click', (e) => {
      e.preventDefault();
      registerForm.style.display = 'none';
      loginForm.style.display = 'block';
      resetPasswordEyes(loginForm);
      clearInvalidForm(loginForm);
      const first = loginForm.querySelector('#lgnUser, input,select,textarea,button,a');
      first?.focus({ preventScroll: true });
    });

    // Submit Login
    loginForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const { ok, msg, fields } = validateLogin(loginForm);
      const submitBtn = loginForm.querySelector('button[type="submit"], .lgn-btn');
      if (!ok) {
        flashSubmitError(submitBtn);
        fields?.[0]?.focus({ preventScroll: true });
        showToast(loginToast, msg || 'Revisa los campos marcados.', 'err');
        return;
      }
      const fd = new FormData(loginForm);
      const email = (fd.get('email') || document.getElementById('lgnUser')?.value || '').toString().trim();
      const password = (fd.get('password') || '').toString();
      try {
        const res = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'No se pudo iniciar sesión');
        setToken(json.token);
        renderAuthButtons();
        showToast(loginToast, '¡Bienvenido!', 'ok', 1600);
        setTimeout(closeModal, 400);
      } catch (err) {
        showToast(loginToast, err.message || 'Error al iniciar sesión', 'err');
      }
    });

    // Submit Registro
    registerForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const { ok, msg, fields } = validateRegister(registerForm);
      const submitBtn = registerForm.querySelector('button[type="submit"], .lgn-btn');
      if (!ok) {
        flashSubmitError(submitBtn);
        fields?.[0]?.focus({ preventScroll: true });
        showToast(loginToast, msg || 'Revisa los campos marcados.', 'err');
        return;
      }
      const fd = new FormData(registerForm);
      const payload = {
        full_name: (fd.get('full_name') || '').toString().trim(),
        email: (fd.get('email') || '').toString().trim(),
        phone: (fd.get('phone') || '').toString().trim(),
        password: (fd.get('password') || '').toString()
      };
      try {
        const res = await api('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'No se pudo registrar');
        setToken(json.token);
        renderAuthButtons();
        showToast(loginToast, 'Cuenta creada', 'ok', 1600);
        setTimeout(closeModal, 400);
      } catch (err) {
        showToast(loginToast, err.message || 'Error al registrarse', 'err');
      }
    });

    // Navegación / estado
    ['popstate', 'hashchange', 'pageshow'].forEach((ev) => {
      window.addEventListener(ev, () => resetPasswordEyes(modal), { passive: true });
    });
    const observer = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === 'attributes' && m.attributeName === 'data-open' && modal.getAttribute('data-open') === 'true') {
          resetPasswordEyes(modal);
        }
      }
    });
    observer.observe(modal, { attributes: true, attributeFilter: ['data-open'] });
    resetPasswordEyes(modal);
  });
})();

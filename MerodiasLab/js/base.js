// ==============================
//  js/base.js — Merodias Lab
// ==============================
(() => {
  // ---------------------------------
  // API base (local vs prod)
  // ---------------------------------
  const API = (() => {
    const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (isLocal && location.port !== '3000') return 'http://localhost:3000/api';
    return '/api';
  })();
  window.API = API;

  // ---------------------------------
  // Auth helpers (token en localStorage)
  // ---------------------------------
  const TOKEN_KEY = 'token';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }
  function setToken(v) {
    if (v) localStorage.setItem(TOKEN_KEY, v);
    else localStorage.removeItem(TOKEN_KEY);
  }

  function dispatchAuthChange() {
    document.dispatchEvent(new CustomEvent('auth:change'));
  }

  const auth = {
    get token() { return getToken(); },
    set token(v) { setToken(v); dispatchAuthChange(); },

    isLogged() { return !!getToken(); },

    login(token, { redirectTo } = {}) {
      setToken(token);
      dispatchAuthChange();
      if (redirectTo) location.href = redirectTo;
    },

    logout({ redirectTo = 'inicio.html' } = {}) {
      try {
        setToken(null);
        dispatchAuthChange();
      } finally {
        location.href = redirectTo; // Siempre volver al inicio
      }
    }
  };
  window.auth = auth;

  // ---------------------------------
  // Fetch helper con token
  // ---------------------------------
  async function api(path, opts = {}) {
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    if (auth.isLogged()) headers.Authorization = `Bearer ${auth.token}`;

    const res = await fetch(`${API}${path}`, { ...opts, headers });

    // Intenta parsear JSON siempre (puede ser null, array o objeto)
    let data = null;
    try { data = await res.json(); } catch (_) { /* no-op */ }

    if (!res.ok) {
      const msg = (data && (data.error || data.message)) || `Error ${res.status}`;
      throw new Error(msg);
    }
    return data;
  }
  window.api = api;

  // ---------------------------------
  // Utilidades UI
  // ---------------------------------
  const $all = (sel) => Array.from(document.querySelectorAll(sel));
  window.$all = $all;

  function paintAuthUI() {
    const logged = auth.isLogged();

    // login / profile / logout
    $all('[data-action="login"]').forEach(el => el.style.display = logged ? 'none' : '');
    $all('[data-action="profile"]').forEach(el => el.style.display = logged ? '' : 'none');
    $all('[data-action="logout"]').forEach(el => el.style.display = logged ? '' : 'none');

    // Botón de admin (se decide aparte, aquí lo ocultamos por defecto si no hay sesión)
    $all('[data-action="admin"]').forEach(el => el.style.display = logged ? 'none' : 'none');
  }

  async function resolveAdminButton() {
    const btns = $all('[data-action="admin"]');
    if (!btns.length || !auth.isLogged()) return;
    try {
      const me = await api('/me'); // requiere token
      const isAdmin = String(me.role || '').toLowerCase() === 'admin';
      btns.forEach(el => el.style.display = isAdmin ? '' : 'none');
    } catch {
      btns.forEach(el => el.style.display = 'none');
    }
  }

  // Botón perfil → redirigir según rol
function bindProfileRedirect() {
  document.querySelectorAll('[data-action="profile"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();

      if (!auth.isLogged()) {
        location.href = 'inicio.html';
        return;
      }

      try {
        const me = await api('/me'); // tu endpoint que devuelve { id, full_name, role }
        const role = (me.role || '').toLowerCase();

        if (role === 'admin') {
          location.href = 'admin.html';
        } else {
          location.href = 'perfil.html';
        }
      } catch (err) {
        console.error('Error obteniendo perfil:', err);
        alert('No se pudo verificar tu cuenta. Intenta de nuevo.');
      }
    });
  });
}



  function bindNavbarActions() {
    // Logout — siempre redirige a inicio
    $all('[data-action="logout"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        auth.logout({ redirectTo: 'inicio.html' });
      });
    });

    // Profile — ir a perfil (si hay sesión)
    $all('[data-action="profile"]').forEach(a => {
      a.addEventListener('click', (e) => {
        if (!auth.isLogged()) return; // el guard de perfil.js también redirige
        // opcional: validar /api/health
        // api('/health').catch(()=>{}); // no bloqueante
      });
    });
  }

  // ---------------------------------
  // Envío de contacto/cita (contacto.html)
  // ---------------------------------
  async function hydrateServicesSelect() {
    const sel = document.getElementById('cf-service');
    if (!sel) return;
    try {
      const services = await api('/services');
      services.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.title;
        sel.appendChild(opt);
      });
    } catch { /* silencioso */ }
  }

  function bindContactForm() {
    const form = document.getElementById('cfForm');
    if (!form) return;

    let fb = document.getElementById('cfFeedback');
    if (!fb) {
      fb = document.createElement('p');
      fb.id = 'cfFeedback';
      fb.className = 'fx-note';
      fb.setAttribute('aria-live', 'polite');
      form.appendChild(fb);
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      fb.textContent = 'Enviando…';
      fb.style.color = '';

      const fd = new FormData(form);
      const data = Object.fromEntries(fd);

      try {
        const logged = auth.isLogged();
        const rawDt = data.preferred_dt || data.date || data.appointment_date || '';

        if (logged && rawDt) {
          // Crear CITA
          await api('/appointments', {
            method: 'POST',
            body: JSON.stringify({
              service_id: data.service_id ? Number(data.service_id) : null,
              subject: data.subject || null,
              message: data.message || null,
              preferred_dt: rawDt.replace('T', ' ') // backend MySQL-like
            })
          });
          form.reset();
          fb.textContent = '✅ ¡Cita registrada! Te confirmaremos por correo.';
          fb.style.color = '#065f46';
        } else {
          // MENSAJE de contacto
          const name = (data.name || '').trim();
          const email = (data.email || '').trim();
          const message = (data.message || '').trim();
          if (!name || !email || !message) throw new Error('Nombre, correo y mensaje son obligatorios');

          await api('/contact', {
            method: 'POST',
            body: JSON.stringify({
              name,
              email,
              phone: data.phone || null,
              subject: data.subject || null,
              message
            })
          });
          form.reset();
          fb.textContent = '✅ ¡Gracias! Te responderemos en 24 h hábiles.';
          fb.style.color = '#065f46';
        }
      } catch (err) {
        fb.textContent = `❌ ${err.message || 'Ocurrió un error'}`;
        fb.style.color = '#991b1b';
      }
    });
  }

  // ---------------------------------
  // Init
  // ---------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    paintAuthUI();
    bindNavbarActions();
     bindProfileRedirect(); 
    resolveAdminButton();   // mostrará [data-action="admin"] si corresponde
    hydrateServicesSelect();
    bindContactForm();
  });

  document.addEventListener('auth:change', () => {
    paintAuthUI();
    resolveAdminButton();
  });
})();
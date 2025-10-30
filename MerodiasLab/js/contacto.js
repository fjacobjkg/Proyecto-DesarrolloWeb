// js/contacto.js — validaciones + horario + servicios (idempotente) + fecha con TZ
(() => {
  // ===== utils =====
  const onReady = (fn) => {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  };
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  const HOURS_TEXT = 'Lun–Vie: 07:00–18:00 · Sábados: 07:00–12:00';
  const p2 = (n) => String(n).padStart(2, '0');
  const toLocalDatetimeInputValue = (d) =>
    `${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}`;

  // ===== UI helpers =====
  const bindToastById = (id) => {
    const el = document.getElementById(id);
    if (!el) return null;
    const close = el.querySelector('.c-toast__close');
    if (close && !close._bound) { close.addEventListener('click', () => el.setAttribute('data-show', 'false')); close._bound = true; }
    return el;
  };
  const showToast = (el, msg, kind = 'err', ms = 2600) => {
    if (!el) return;
    el.classList.remove('c-toast--ok','c-toast--err','c-toast--info');
    el.classList.add(kind === 'ok' ? 'c-toast--ok' : kind === 'info' ? 'c-toast--info' : 'c-toast--err');
    const span = el.querySelector('.c-toast__msg'); if (span) span.textContent = msg || '';
    el.setAttribute('data-show', 'true');
    clearTimeout(el._timer); el._timer = setTimeout(() => el.setAttribute('data-show', 'false'), ms);
  };
  const markInvalid = (el, on = true) => {
    if (!el) return;
    if (on) { el.classList.add('is-invalid'); el.setAttribute('aria-invalid', 'true'); }
    else    { el.classList.remove('is-invalid'); el.removeAttribute('aria-invalid'); }
  };
  const clearInvalidForm = (form) => form?.querySelectorAll('input, textarea, select').forEach((i) => markInvalid(i, false));
  const flashSubmitError = (btn) => { if (!btn) return; btn.classList.add('is-error','is-shake'); setTimeout(()=>btn.classList.remove('is-shake'),360); setTimeout(()=>btn.classList.remove('is-error'),1600); };

  // ===== horario =====
  const BH = { stepMin: 15, weekdays: { start: '07:00', end: '18:00' }, saturday: { start: '07:00', end: '12:00' } };
  const hhmmToMin = (t) => { const [h,m]=String(t).split(':').map(x=>parseInt(x,10)||0); return h*60+m; };
  const getMinutesOfDay = (d) => d.getHours()*60 + d.getMinutes();
  const addDays = (d,n) => { const nd = new Date(d); nd.setDate(nd.getDate()+n); return nd; };
  const setTime = (d,hhmm) => { const [h,m]=hhmm.split(':').map(x=>parseInt(x,10)||0); const nd=new Date(d); nd.setHours(h,m,0,0); return nd; };
  const roundToStep = (d,step) => { const nd=new Date(d); nd.setMinutes(Math.round(nd.getMinutes()/step)*step,0,0); return nd; };
  const isSunday = (d) => d.getDay()===0;
  const isSaturday = (d) => d.getDay()===6;
  const isWithinBusinessHours = (d) => {
    if (isSunday(d)) return false;
    const mod = getMinutesOfDay(d);
    if (isSaturday(d)) { const a=hhmmToMin(BH.saturday.start), b=hhmmToMin(BH.saturday.end); return mod>=a && mod<=b; }
    const a=hhmmToMin(BH.weekdays.start), b=hhmmToMin(BH.weekdays.end); return mod>=a && mod<=b;
  };
  const nextValidSlot = (d) => {
    let nd = roundToStep(d, BH.stepMin);
    if (isSunday(nd)) return setTime(addDays(nd,1), BH.weekdays.start);
    const start = isSaturday(nd) ? BH.saturday.start : BH.weekdays.start;
    const end   = isSaturday(nd) ? BH.saturday.end   : BH.weekdays.end;
    const a = hhmmToMin(start), b = hhmmToMin(end), mod = getMinutesOfDay(nd);
    if (mod < a) return setTime(nd, start);
    if (mod > b) {
      const nx = addDays(nd,1);
      if (isSunday(nx)) return setTime(addDays(nx,1), BH.weekdays.start);
      return setTime(nx, isSaturday(nx)?BH.saturday.start:BH.weekdays.start);
    }
    return nd;
  };

  // ===== fecha con TZ =====
  const parseLocalFromInput = (input) => {
    if (!input || !input.value) return null;
    if (input._flatpickr?.selectedDates?.[0]) return new Date(input._flatpickr.selectedDates[0]);
    const v = input.value.includes(' ') ? input.value.replace(' ','T') : input.value;
    const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d;
  };
  const formatLocalYMDHM = (d) =>
    `${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
  const toISOWithOffset = (d) => {
    const offMin = -d.getTimezoneOffset();
    const sign = offMin >= 0 ? '+' : '-';
    const hh = p2(Math.floor(Math.abs(offMin)/60));
    const mm = p2(Math.abs(offMin)%60);
    return `${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}:00${sign}${hh}:${mm}`;
  };
  const normalizeIfNeeded = (input, toast) => {
    if (!input) return;
    const chosen = parseLocalFromInput(input); if (!chosen) return;
    let nd = roundToStep(chosen, BH.stepMin);
    if (!isWithinBusinessHours(nd)) {
      nd = nextValidSlot(nd);
      input.value = toLocalDatetimeInputValue(nd);
      if (toast) showToast(toast, `Ajustado a horario de atención (${HOURS_TEXT})`, 'info', 2200);
      markInvalid(input, true); setTimeout(()=>markInvalid(input,false), 1200);
    } else {
      input.value = toLocalDatetimeInputValue(nd);
    }
  };

  // ===== flatpickr opcional =====
  const initDatePicker = (input) => {
    if (!input) return null;
    if (window.flatpickr) {
      const syncBounds = (dates,_s,inst) => {
        const d = dates[0] || new Date();
        inst.set('minTime','07:00');
        inst.set('maxTime', d.getDay()===6 ? '12:00' : '18:00');
      };
      const nextValid = nextValidSlot(new Date());
      return flatpickr(input, {
        enableTime:true, time_24hr:true, minuteIncrement:15, dateFormat:'Y-m-d H:i',
        disableMobile:true, minDate:'today', disable:[(date)=>date.getDay()===0],
        onReady:[syncBounds], onChange:[syncBounds], defaultDate: nextValid
      });
    }
    input.step = String(BH.stepMin * 60);
    input.min  = toLocalDatetimeInputValue(nextValidSlot(new Date()));
    return null;
  };

  // ===== servicios (cache + dedupe) =====
  const Services = { cache: [], sig: '', loading: false, promise: null };
  const normalizeServices = (arr) => {
    const seen = new Set(), out = [];
    for (const s of Array.isArray(arr) ? arr : []) {
      const id = String(s?.id ?? '').trim(), title = String(s?.title ?? '').trim();
      if (!id || !title || seen.has(id)) continue;
      seen.add(id); out.push({ id, title });
    }
    out.sort((a,b)=> a.title.localeCompare(b.title,'es',{sensitivity:'base'}));
    return out;
  };
  const fetchServices = async () => {
    if (Services.cache.length) return Services.cache;
    if (Services.loading) return Services.promise;
    Services.loading = true;
    Services.promise = fetch('/api/services', { headers:{Accept:'application/json'}, cache:'no-store' })
      .then(r => r.ok ? r.json() : [])
      .then(js => { Services.cache = normalizeServices(js); Services.sig = JSON.stringify(Services.cache.map(s=>s.id)); Services.loading = false; return Services.cache; })
      .catch(() => { Services.cache = []; Services.sig = '[]'; Services.loading = false; return Services.cache; });
    return Services.promise;
  };
  const dedupeSelectOptions = (select) => {
    if (!select) return;
    const seen = new Set();
    const opts = [...select.querySelectorAll('option')];
    for (const opt of opts) {
      if (opt.value === '') continue;
      if (seen.has(opt.value)) opt.remove();
      else seen.add(opt.value);
    }
  };
  const renderServices = (select) => {
    if (!select) return;
    const placeholder = select.querySelector('option[value=""]')?.cloneNode(true) || new Option('Seleccionar','');
    select.innerHTML = ''; select.appendChild(placeholder);
    for (const s of Services.cache) {
      const opt = document.createElement('option'); opt.value = s.id; opt.textContent = s.title; select.appendChild(opt);
    }
    dedupeSelectOptions(select);
    select.dataset.filled = 'true'; select.dataset.sig = Services.sig;
  };
  const ensureServices = async (select) => { if (!select) return; await fetchServices(); renderServices(select); };
  const observeAndDedupe = (select) => {
    if (!select) return;
    const obs = new MutationObserver(() => { obs.disconnect(); dedupeSelectOptions(select); obs.observe(select, { childList:true }); });
    obs.observe(select, { childList:true });
  };

  // ===== usuario =====
  const prefillUser = async (token) => {
    if (!token) return;
    try {
      const me = await fetch('/api/me', { headers: { 'Authorization': 'Bearer ' + token } });
      if (!me.ok) return;
      const u = await me.json();
      const nameEl  = document.getElementById('cf-name');
      const emailEl = document.getElementById('cf-email');
      if (u.full_name && nameEl && !nameEl.value) { nameEl.value = u.full_name; nameEl.readOnly = true; }
      if (u.email && emailEl && !emailEl.value)   { emailEl.value = u.email;   emailEl.readOnly = true; }
    } catch {}
  };

  // ===== validación =====
  const sanitizeSubject = (s) => (s || '').replace(/\d+/g, '');
  function validateContactForm(form, hasToken) {
    const name  = form.querySelector('#cf-name');
    const email = form.querySelector('#cf-email');
    const phone = form.querySelector('#cf-phone');
    const msg   = form.querySelector('#cf-message');
    const svc   = form.querySelector('#cf-service');
    const dt    = form.querySelector('#cf-dt');
    const subj  = form.querySelector('#cf-subject, [name="subject"]');

    let out = ''; const bad = [];

    const vName = (name?.value || '').trim();
    if (!vName) out ||= (bad.push(name), 'El nombre es obligatorio.');
    else if (vName.length < 3) out ||= (bad.push(name), 'Nombre muy corto (mínimo 3).');

    const vEmail = (email?.value || '').trim();
    if (!vEmail) out ||= (bad.push(email), 'El correo es obligatorio.');
    else if (!EMAIL_RE.test(vEmail)) out ||= (bad.push(email), 'Correo no válido.');

    const vMsg = (msg?.value || '').trim();
    if (!vMsg) out ||= (bad.push(msg), 'El mensaje es obligatorio.');

    const vPhoneDigits = (phone?.value || '').replace(/\D/g, '');
    if (phone) {
      phone.value = vPhoneDigits.slice(0, 8);
      if (vPhoneDigits && vPhoneDigits.length !== 8) out ||= (bad.push(phone), 'El teléfono debe tener 8 dígitos.');
    }

    if (subj) subj.value = sanitizeSubject(subj.value);

    if (dt && dt.value) {
      const chosen = parseLocalFromInput(dt);
      if (!chosen || !isWithinBusinessHours(chosen)) out ||= (bad.push(dt), `Fuera de horario. ${HOURS_TEXT}`);
      if (hasToken && !svc?.value) out ||= (bad.push(svc), 'Selecciona un servicio para la cita.');
    }

    clearInvalidForm(form);
    bad.forEach((el) => markInvalid(el, true));
    return { ok: !out, msg: out, fields: bad };
  }

  const renderHours = () => {
    document.querySelectorAll('#mapHours, #cfHours, [data-hours-target]').forEach((el) => { el.textContent = HOURS_TEXT; });
  };

  // ===== main =====
  onReady(() => {
    const sel      = document.getElementById('cf-service');
    const dtInput  = document.getElementById('cf-dt');
    const feedback = document.getElementById('cfFeedback');
    let form       = document.getElementById('cfForm');
    const token    = localStorage.getItem('token');
    const toast    = bindToastById('cfToast');

    initDatePicker(dtInput);
    ensureServices(sel);
    observeAndDedupe(sel);
    prefillUser(token);
    renderHours();
    if (!form || !feedback) return;

    if (form.dataset.initialized === 'true') {
      const newForm = form.cloneNode(true);
      form.parentNode.replaceChild(newForm, form);
      form = newForm;
      observeAndDedupe(document.getElementById('cf-service'));
      prefillUser(token);
      renderHours();
    }
    form.dataset.initialized = 'true';

    form.addEventListener('input', (e) => {
      const t = e.target; if (!t) return;
      if (t.matches('#cf-subject, [name="subject"]')) {
        const cur = t.selectionStart, before = t.value, cleaned = sanitizeSubject(before);
        if (before !== cleaned) { t.value = cleaned; try { const d = before.length - cleaned.length; t.setSelectionRange(Math.max(0,cur-d), Math.max(0,cur-d)); } catch {} }
      }
      if (t.matches('#cf-phone')) t.value = t.value.replace(/\D/g, '').slice(0, 8);
      if (t.matches('input, textarea')) markInvalid(t, false);
    });

    form.addEventListener('change', (e) => {
      const t = e.target;
      if (t && t.matches('select')) markInvalid(t, false);
      if (t && t.matches('#cf-dt') && !t._flatpickr) normalizeIfNeeded(t, toast);
    });

    const submitBtn = form.querySelector('button[type="submit"]');
    let isSubmitting = false;

    const datePayloadFromInput = (input) => {
      const d = parseLocalFromInput(input); if (!d) return null;
      return {
        localString: formatLocalYMDHM(d),           // 'YYYY-MM-DD HH:mm' (local)
        isoWithOffset: toISOWithOffset(d),          // 'YYYY-MM-DDTHH:mm:ss±HH:MM'  ← usar en backend
        tzOffsetMinutes: -d.getTimezoneOffset(),
        tzName: Intl.DateTimeFormat().resolvedOptions().timeZone || null
      };
    };

    const resetForm = async () => {
      form.reset();
      if (dtInput && !dtInput._flatpickr) {
        dtInput.step = String(BH.stepMin * 60);
        dtInput.min = toLocalDatetimeInputValue(nextValidSlot(new Date()));
      } else if (dtInput?._flatpickr) {
        dtInput._flatpickr.setDate(nextValidSlot(new Date()), true);
      }
      await prefillUser(token);
      clearInvalidForm(form);
      renderHours();
      ensureServices(document.getElementById('cf-service'));
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (isSubmitting || form.dataset.submitting === 'true') return;

      const { ok, msg, fields } = validateContactForm(form, !!token);
      if (!ok) {
        flashSubmitError(submitBtn);
        fields?.[0]?.focus({ preventScroll: true });
        showToast(toast, msg || 'Revisa los campos marcados.', 'err');
        feedback.textContent = msg || 'Revisa los campos marcados.'; feedback.style.color = '#991b1b';
        return;
      }

      isSubmitting = true; form.dataset.submitting = 'true';
      if (submitBtn) { submitBtn.disabled = true; submitBtn.dataset.originalText = submitBtn.textContent; submitBtn.textContent = 'Enviando...'; }
      feedback.textContent = 'Enviando…'; feedback.style.color = '#374151';

      const data = Object.fromEntries(new FormData(form));
      const when = datePayloadFromInput(dtInput); // null si no eligieron fecha
      const idemKey = (globalThis.crypto?.randomUUID?.() ?? `idem-${Date.now()}-${Math.random()}`);

      try {
        if (token && when && data.service_id) {
          if (!data.service_id) throw new Error('Selecciona un servicio.');
          const resp = await fetch('/api/appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token, 'Idempotency-Key': idemKey },
            body: JSON.stringify({
              service_id: Number(data.service_id) || null,
              subject: (data.subject || '').replace(/\d+/g,'' ) || null,
              message: data.message || null,
              // >>> clave: usar ISO con offset para que la hora quede exacta en DB
              preferred_dt: when.isoWithOffset,
              preferred_dt_local: when.localString,
              tz_offset_minutes: when.tzOffsetMinutes,
              tz_name: when.tzName
            })
          });
          const js = await resp.json().catch(() => ({}));
          if (!resp.ok) throw new Error(js.error || 'Error al crear la cita');
          await resetForm();
          feedback.textContent = '¡Cita registrada! Te confirmaremos por correo.'; feedback.style.color = '#065f46';
          showToast(toast, '¡Cita registrada!', 'ok', 2200);
        } else {
          const resp = await fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idemKey },
            body: JSON.stringify({
              name: data.name,
              email: data.email,
              phone: (data.phone || '').replace(/\D/g,'').slice(0,8) || null,
              subject: (data.subject || '').replace(/\d+/g,'') || null,
              message: data.message
            })
          });
          const js = await resp.json().catch(() => ({}));
          if (!resp.ok) throw new Error(js.error || 'Error al enviar contacto');
          await resetForm();
          feedback.textContent = '¡Gracias por contactarnos! Le responderemos dentro de 24 horas hábiles.'; feedback.style.color = '#065f46';
          showToast(toast, 'Mensaje enviado.', 'ok', 2200);
        }
      } catch (err) {
        const m = err?.message || 'Ocurrió un error';
        feedback.textContent = m; feedback.style.color = '#991b1b';
        showToast(toast, m, 'err');
      } finally {
        isSubmitting = false; delete form.dataset.submitting;
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitBtn.dataset.originalText || 'Enviar'; }
      }
    });
  });
})();
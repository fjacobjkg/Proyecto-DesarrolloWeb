// js/admin.js — Panel de administración mejorado

//  Auth 
const token = sessionStorage.getItem('token') || localStorage.getItem('token');
const AUTH_HEADERS = token ? { Authorization: `Bearer ${token}` } : {};
if (!token) location.href = 'inicio.html';

// DOM 
const els = {
  page: document.querySelector('.page'),
  feed: document.getElementById('feed'),
  form: document.getElementById('filters'),
  fStatus: document.getElementById('fStatus'),
  fQ: document.getElementById('fQ'),
  tbody: document.querySelector('#tblAdmin tbody')
};

function setFeed(msg = '') { 
  if (els.feed) els.feed.textContent = msg; 
}

// Sistema de mensajes 
let msgEl = null;
let msgTimer = null;
let overlayEl = null;

function ensureMsg() {
  if (msgEl) return msgEl;
  
  msgEl = document.getElementById('adminMsg');
  if (!msgEl) {
    msgEl = document.createElement('div');
    msgEl.id = 'adminMsg';
    msgEl.className = 'is-hidden';
    msgEl.setAttribute('role', 'dialog');
    msgEl.setAttribute('aria-live', 'polite');
    (els.page || document.body).appendChild(msgEl);
  }
  return msgEl;
}

function hideMsg() {
  if (!msgEl) return;
  msgEl.className = 'is-hidden';
  msgEl.replaceChildren();
  if (msgTimer) {
    clearTimeout(msgTimer);
    msgTimer = null;
  }
}

/**
 * Muestra un mensaje simple (éxito, error, info)
 */
function showMsg(kind = 'info', text = '', ms = 2600) {
  const el = ensureMsg();
  el.className = `status-message status-message--${kind}`;
  
  const span = document.createElement('span');
  span.textContent = text || '';
  el.replaceChildren(span);
  
  if (msgTimer) clearTimeout(msgTimer);
  msgTimer = setTimeout(hideMsg, ms);
}

/**
 * Muestra un diálogo de confirmación
 */
function confirmMsg(text, { 
  okText = 'Sí, cambiar', 
  cancelText = 'Cancelar', 
  kind = 'info', 
  timeoutMs = 12000 
} = {}) {
  const el = ensureMsg();
  el.className = `status-message status-message--${kind}`;

  const span = document.createElement('span');
  span.textContent = text || '';
  
  const actions = document.createElement('div');
  actions.className = 'admin-actions';

  const okBtn = document.createElement('button');
  okBtn.type = 'button';
  okBtn.className = 'c-btn c-btn--sm';
  okBtn.textContent = okText;

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'c-btn c-btn--sm c-btn--ghost';
  cancelBtn.textContent = cancelText;

  actions.append(okBtn, cancelBtn);
  el.replaceChildren(span, actions);

  return new Promise((resolve) => {
    const cleanup = (val) => { 
      hideMsg(); 
      resolve(val); 
    };
    
    okBtn.addEventListener('click', () => cleanup(true), { once: true });
    cancelBtn.addEventListener('click', () => cleanup(false), { once: true });
    
    // Auto-cerrar después del timeout
    if (msgTimer) clearTimeout(msgTimer);
    msgTimer = setTimeout(() => cleanup(false), timeoutMs);
    
    // Cerrar con ESC
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        cleanup(false);
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  });
}

//  Utilidades 
function fmtDate(s){
  if(!s) return '-';
  const d = new Date(String(s).replace(' ', 'T'));
  return isNaN(d) ? s : d.toLocaleString('es-GT', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function statusLabel(s){
  const map = { 
    pending: 'Pendiente', 
    confirmed: 'Confirmada', 
    completed: 'Completada', 
    cancelled: 'Cancelada' 
  };
  return map[(s||'').toLowerCase()] || s || '-';
}

function badgeEl(status){
  const span = document.createElement('span');
  span.className = 'badge badge--' + String(status||'').toLowerCase();
  span.textContent = statusLabel(status);
  return span;
}

function setLoading(on = true) {
  if (!els.tbody) return;
  els.tbody.innerHTML = on
    ? `<tr class="c-table__loading"><td colspan="6">
         <i class="ri-loader-4-line loading-spinner icon-xl" aria-hidden="true"></i>
         <p class="fx-note">Cargando citas...</p>
       </td></tr>`
    : '';
}

function clearTableWithMessage(text){
  if (!els.tbody) return;
  els.tbody.innerHTML = `<tr><td colspan="6" class="fx-note" style="text-align:center; padding:2rem;">${text}</td></tr>`;
}

function createCell(label, content){
  const td = document.createElement('td');
  td.setAttribute('data-label', label);
  if (typeof content === 'string') {
    td.textContent = content;
  } else if (content instanceof Node) {
    td.appendChild(content);
  }
  return td;
}

function btn(text, className, action, id, extraData = {}) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `c-btn c-btn--sm ${className}`;
  b.dataset.action = action;
  b.dataset.id = String(id);
  Object.assign(b.dataset, extraData);
  b.textContent = text;
  return b;
}

//  API 
async function protectAdmin(){
  try{
    const res = await fetch('/api/admin/appointments?_ping=1', { headers: AUTH_HEADERS });
    if (res.status === 401 || res.status === 403) {
      showMsg('error', 'Acceso restringido para administradores.', 3000);
      setTimeout(() => location.href = 'inicio.html', 3000);
      return false;
    }
    return true;
  }catch(_){
    setFeed('Error de conexión');
    showMsg('error', 'Error de conexión con el servidor.', 3000);
    return false;
  }
}

function applyFilters(rows){
  const st = (els.fStatus?.value || '').toLowerCase();
  const q  = (els.fQ?.value || '').trim().toLowerCase();
  let data = rows;
  
  if (st) data = data.filter(r => (r.status||'').toLowerCase() === st);
  if (q)  data = data.filter(r =>
    String(r.full_name||'').toLowerCase().includes(q) ||
    String(r.email||'').toLowerCase().includes(q)
  );
  
  return data;
}

function renderRows(rows){
  if (!els.tbody) return;
  els.tbody.innerHTML = '';
  
  rows.forEach(r => {
    const tr = document.createElement('tr');
    tr.dataset.id = String(r.id);

    // Fecha/Hora
    tr.appendChild(createCell('Fecha/Hora', fmtDate(r.preferred_dt)));
    
    // Servicio
    tr.appendChild(createCell('Servicio', r.service_title || '-'));

    // Paciente
    const tdPatient = document.createElement('td');
    tdPatient.setAttribute('data-label', 'Paciente');
    tdPatient.appendChild(document.createTextNode(r.full_name || '-'));
    if (r.email) {
      tdPatient.appendChild(document.createElement('br'));
      const small = document.createElement('small');
      small.textContent = r.email;
      small.style.opacity = '0.65';
      small.style.fontSize = '0.8125rem';
      tdPatient.appendChild(small);
    }
    tr.appendChild(tdPatient);

    // Asunto
    tr.appendChild(createCell('Asunto', r.subject || '-'));

    // Estado
    const tdStatus = document.createElement('td');
    tdStatus.setAttribute('data-label', 'Estado');
    tdStatus.appendChild(badgeEl(r.status));
    tr.appendChild(tdStatus);

    // Acciones
    const tdActions = document.createElement('td');
    tdActions.setAttribute('data-label', 'Acciones');
    const actions = document.createElement('div');
    actions.className = 'admin-actions';

    const s = (r.status || '').toLowerCase();
    
    // Botón confirmar (solo si está pendiente)
    if (s === 'pending') {
      actions.appendChild(btn('Confirmar', 'c-btn--success', 'update', r.id, { status: 'confirmed' }));
    }
    
    // Botón completar (si no está completada o cancelada)
    if (s !== 'completed' && s !== 'cancelled') {
      actions.appendChild(btn('Completar', 'c-btn--success', 'update', r.id, { status: 'completed' }));
    }
    
    // Botón cancelar (si no está cancelada)
    if (s !== 'cancelled') {
      actions.appendChild(btn('Cancelar', 'c-btn--danger', 'update', r.id, { status: 'cancelled' }));
    }
    
    // Botón subir resultado (siempre disponible)
    actions.appendChild(btn('Subir resultado', 'c-btn--ghost', 'upload', r.id));

    tdActions.appendChild(actions);
    tr.appendChild(tdActions);

    els.tbody.appendChild(tr);
  });
}

async function loadAdmin(ev){
  if (ev) ev.preventDefault();
  setFeed('Cargando…');
  setLoading(true);

  try{
    const res = await fetch('/api/admin/appointments', { headers: AUTH_HEADERS });
    if (!res.ok) {
      setFeed(`Error al cargar (HTTP ${res.status})`);
      clearTableWithMessage('No se pudo cargar las citas.');
      showMsg('error', `No se pudo cargar las citas (HTTP ${res.status}).`, 3000);
      return;
    }
    
    const rows = await res.json();
    const data = applyFilters(rows);

    if (!data.length) {
      clearTableWithMessage('Sin resultados para los filtros aplicados.');
      setFeed('');
      return;
    }

    renderRows(data);
    setFeed('');
  }catch(_){
    clearTableWithMessage('No se pudo cargar las citas.');
    setFeed('Error de red');
    showMsg('error', 'Error de red al cargar citas.', 3000);
  }
}

// Eventos 
els.form?.addEventListener('submit', loadAdmin);
document.getElementById('fGo')?.addEventListener('click', (e) => { 
  e.preventDefault(); 
  loadAdmin(); 
});

// Delegación de eventos para botones de acción
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;

  // Actualizar estado 
  if (action === 'update') {
    const id = btn.dataset.id;
    const newStatus = btn.dataset.status;
    
    const ok = await confirmMsg(
      `¿Cambiar estado a "${statusLabel(newStatus)}"?`, 
      {
        okText: 'Sí, cambiar',
        cancelText: 'Cancelar',
        kind: 'info'
      }
    );
    
    if (!ok) return;

    try{
      const res = await fetch(`/api/admin/appointments/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!res.ok) {
        const err = await res.json().catch(()=>({}));
        showMsg('error', 'No se pudo actualizar: ' + (err.error || `HTTP ${res.status}`), 3500);
        return;
      }
      
      await loadAdmin();
      showMsg('success', 'Estado actualizado correctamente.', 2500);
    }catch(_){
      showMsg('error', 'No se pudo actualizar: error de red.', 3000);
    }
  }

  // Subir resultado 
  if (action === 'upload') {
    const apptId = btn.dataset.id;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png';

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      const fd = new FormData();
      fd.append('result', file);

      try{
        const res = await fetch(`/api/admin/appointments/${apptId}/result`, {
          method: 'POST',
          headers: { ...AUTH_HEADERS },
          body: fd
        });
        
        const js = await res.json().catch(()=>({}));
        if (!res.ok) throw new Error(js.error || `HTTP ${res.status}`);

        showMsg('success', 'Resultado subido correctamente.', 2500);
        await loadAdmin();
      }catch(err){
        showMsg('error', err.message || 'Error al subir el archivo', 3000);
      }
    };

    input.click();
  }
});

// Inicialización 
(async () => {
  const ok = await protectAdmin();
  if (!ok) return;
  await loadAdmin();
})();
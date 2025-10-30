// js/perfil.js
(function () {
  const token = localStorage.getItem('token');
  if (!token) { location.href = 'inicio.html'; return; }
  const AUTH = { Authorization: 'Bearer ' + token };

  // Utils
  const $ = (sel, ctx = document) => ctx.querySelector(sel);

  function fmtDate(dt) {
    if (!dt) return '-';
    try {
      const d = new Date(String(dt).replace(' ', 'T'));
      return d.toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'short' });
    } catch { return dt; }
  }

  function badgeEl(status) {
    const s = (status || '').toLowerCase();

    // Etiquetas en ambos idiomas
    const labelMap = {
      pending: 'Pendiente',
      confirmed: 'Confirmada',
      completed: 'Completada',
      cancelled: 'Cancelada',
      pendiente: 'Pendiente',
      confirmada: 'Confirmada',
      completada: 'Completada',
      cancelada: 'Cancelada'
    };

    // Para la clase CSS usamos claves "canónicas"
    const clsMap = {
      pendiente: 'pending',
      confirmada: 'confirmed',
      cancelada: 'cancelled',
      completada: 'completed'
    };

    const span = document.createElement('span');
    const canonical = clsMap[s] || s; 
    span.className = `badge badge--${canonical}`;
    span.textContent = labelMap[s] || status || '-';
    return span;
  }

  function td(label, content) {
    const cell = document.createElement('td');
    cell.setAttribute('data-th', label);
    if (typeof content === 'string') cell.textContent = content;
    else if (content instanceof Node) cell.appendChild(content);
    return cell;
  }

  // Cargar datos del usuario
  async function loadMe() {
    const box = $('#meBox');
    if (!box) return;
    try {
      const res = await fetch('/api/me', { headers: AUTH });
      if (!res.ok) throw 0;
      const me = await res.json();
      box.innerHTML = `
        <div><strong>Nombre:</strong> ${me.full_name || '-'}</div>
        <div><strong>Correo:</strong> ${me.email || '-'}</div>
        <div><strong>Teléfono:</strong> ${me.phone || '-'}</div>
      `;
    } catch {
      box.innerHTML = `<p style="color:#b91c1c">Error al cargar tus datos</p>`;
    }
  }

  // Cargar citas
  async function loadAppointments() {
    const tbody = $('#apptsBody');
    if (!tbody) return;

    // Estado inicial
    const loadingRow = document.createElement('tr');
    loadingRow.appendChild(td('Estado', 'Cargando…'));
    loadingRow.firstChild.setAttribute('colspan', '5');
    loadingRow.firstChild.classList.add('text-center');
    tbody.innerHTML = '';
    tbody.appendChild(loadingRow);

    try {
      const res = await fetch('/api/appointments', { headers: AUTH });
      if (!res.ok) throw 0;
      const citas = await res.json();

      tbody.innerHTML = '';

      if (!Array.isArray(citas) || citas.length === 0) {
        const tr = document.createElement('tr');
        const ctd = td('Estado', 'No tienes citas registradas.');
        ctd.colSpan = 5; ctd.classList.add('text-center');
        tr.appendChild(ctd);
        tbody.appendChild(tr);
        return;
      }

      citas.forEach(c => {
        const tr = document.createElement('tr');

        tr.appendChild(td('Fecha/Hora', fmtDate(c.preferred_dt)));
        tr.appendChild(td('Servicio', c.service_title || '-'));
        tr.appendChild(td('Asunto', c.subject || '-'));
        tr.appendChild(td('Estado', badgeEl(c.status)));

        // Acción
        const actionCell = td('Acción', '');
        const s = String(c.status || '').toLowerCase();
        const isCompleted = (s === 'completed' || s === 'completada');

        if (c.result_url && isCompleted) {
          const a = document.createElement('a');
          a.className = 'c-btn c-btn--sm c-btn--ghost';
          a.textContent = 'Ver';
          // Asegurar ruta absoluta
          a.href = c.result_url.startsWith('/') ? c.result_url : '/' + c.result_url;
          a.target = '_blank';
          a.rel = 'noopener';
          actionCell.appendChild(a);
        } else {
          const b = document.createElement('button');
          b.className = 'c-btn c-btn--sm c-btn--ghost';
          b.textContent = 'Ver';
          b.disabled = true;
          actionCell.appendChild(b);
        }
        tr.appendChild(actionCell);

        tbody.appendChild(tr);
      });

    } catch {
      const tr = document.createElement('tr');
      const ctd = td('Estado', 'Error al cargar citas.');
      ctd.colSpan = 5; ctd.classList.add('text-center');
      tr.appendChild(ctd);
      tbody.innerHTML = '';
      tbody.appendChild(tr);
    }
  }

  // Init
  document.addEventListener('DOMContentLoaded', () => {
    loadMe();
    loadAppointments();
  });
})();
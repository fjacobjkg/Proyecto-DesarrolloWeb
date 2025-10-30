// api/routes/appointments.routes.js
const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { auth } = require('../middlewares/auth');

// Mapeo de estados de entrada → a los valores de BD 
const STATUS_MAP_IN = {
  pending: 'pendiente',
  confirmed: 'confirmada',
  cancelled: 'cancelada',
  completed: 'completada',
  pendiente: 'pendiente',
  confirmada: 'confirmada',
  cancelada: 'cancelada',
  completada: 'completada',
};
const ALLOWED_DB_STATUS = ['pendiente', 'confirmada', 'cancelada', 'completada'];

/**
 * POST /api/appointments
 * Body: { service_id, subject, message, preferred_dt }
 * preferred_dt: "YYYY-MM-DD HH:mm" o "YYYY-MM-DDTHH:mm"
 */
router.post('/appointments', auth(), async (req, res) => {
  try {
    let { service_id, subject, message, preferred_dt } = req.body || {};
    if (!preferred_dt) {
      return res.status(400).json({ error: 'preferred_dt es obligatorio' });
    }
    preferred_dt = String(preferred_dt).replace('T', ' ').trim();

    const [result] = await pool.query(
      `INSERT INTO citas
        (usuario_id, servicio_id, asunto, mensaje, fecha_preferida, estado, creado_en)
       VALUES (?, ?, ?, ?, ?, 'pendiente', NOW())`,
      [req.user.id, service_id || null, subject || null, message || null, preferred_dt]
    );

    const [rows] = await pool.query(
      `SELECT c.id,
              c.fecha_preferida AS preferred_dt,
              c.asunto         AS subject,
              c.estado         AS status,
              s.titulo         AS service_title
         FROM citas c
    LEFT JOIN servicios s ON s.id = c.servicio_id
        WHERE c.id = ?`,
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/appointments', err);
    res.status(500).json({ error: 'Error al crear la cita' });
  }
});

/** GET /api/appointments (mis citas) */
router.get('/appointments', auth(), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.id,
              c.fecha_preferida AS preferred_dt,
              c.asunto          AS subject,
              c.estado          AS status,
              s.titulo          AS service_title
         FROM citas c
    LEFT JOIN servicios s ON s.id = c.servicio_id
        WHERE c.usuario_id = ?
     ORDER BY c.fecha_preferida DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/appointments', err);
    res.status(500).json({ error: 'Error servidor' });
  }
});

/** GET /api/appointments/mine (alias) */
router.get('/appointments/mine', auth(), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.id,
              c.fecha_preferida AS preferred_dt,
              c.asunto          AS subject,
              c.estado          AS status,
              s.titulo          AS service_title
         FROM citas c
    LEFT JOIN servicios s ON s.id = c.servicio_id
        WHERE c.usuario_id = ?
     ORDER BY c.fecha_preferida DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/appointments/mine', err);
    res.status(500).json({ error: 'Error servidor' });
  }
});

/**
 * PATCH /api/appointments/:id/status
 * Body: { status: 'pending'|'confirmed'|'cancelled'|'completed' } 
 */
router.patch('/appointments/:id/status', auth(), async (req, res) => {
  try {
    const { id } = req.params;
    const rawStatus = String(req.body?.status || '').toLowerCase();
    const status = STATUS_MAP_IN[rawStatus];

    if (!status || !ALLOWED_DB_STATUS.includes(status)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const [ok] = await pool.query(
      `UPDATE citas SET estado = ? WHERE id = ? AND usuario_id = ?`,
      [status, id, req.user.id]
    );
    if (ok.affectedRows === 0) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('PATCH /api/appointments/:id/status', err);
    res.status(500).json({ error: 'Error al actualizar la cita' });
  }
});

module.exports = router;
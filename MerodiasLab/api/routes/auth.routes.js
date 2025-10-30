// middlewares/auth.js
const jwt = require('jsonwebtoken');

function getTokenFromHeader(req){
  const h = req.headers['authorization'] || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

exports.verifyToken = (req, res, next) => {
  const token = getTokenFromHeader(req);
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // payload: { id, correo, role }
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

exports.requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'No auth' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Sin permisos' });
  }
  next();
};

// api/routes/appointments.routes.js
const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { auth } = require('../middlewares/auth');
const bcrypt = require('bcrypt');

// Mis citas
router.get('/appointments/mine', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.fecha_preferida, c.asunto, c.estado,
              s.titulo AS titulo_servicio
       FROM citas c
       LEFT JOIN servicios s ON s.id = c.id_servicio
       WHERE c.id_usuario = ?
       ORDER BY c.fecha_preferida DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/appointments/mine', err);
    res.status(500).json({ error: 'Error servidor' });
  }
});


router.patch('/appointments/:id', auth, async (req, res) => {
  try {
    const apptId = req.params.id;
    const { status } = req.body || {};

    const allowed = ['pendiente', 'confirmada', 'cancelada', 'completada'];
    if (!allowed.includes(String(status).toLowerCase())) {
      return res.status(400).json({ error: 'status inválido' });
    }

    // verificar admin
    const [rows] = await pool.query(
      `SELECT id_usuario FROM citas WHERE id = ?`,
      [apptId]
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrada' });

    const ownerId = rows[0].id_usuario;
    const isOwner = ownerId === req.user.id;
    const isAdmin = String(req.user.role).toLowerCase() === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Prohibido' });

    await pool.query(`UPDATE citas SET estado = ? WHERE id = ?`, [status, apptId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('PATCH /api/appointments/:id', err);
    res.status(500).json({ error: 'Error servidor' });
  }

});

// GET /api/me
router.get('/me', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre_completo, correo, telefono, rol FROM usuarios WHERE id = ?',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }

  });

  



  function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '2d' });
}

// POST /api/auth/register
router.post('/auth/register', async (req, res) => {
  try {
    const { nombre_completo, correo, telefono, contraseña } = req.body || {};
    if (!nombre_completo || !correo || !contraseña) {
      return res.status(400).json({ error: 'Campos obligatorios' });
    }
    const hash = await bcrypt.hash(contraseña, 12);
    const [r] = await pool.execute(
      'INSERT INTO usuarios (nombre_completo, correo, telefono, contrasena_hash) VALUES (?,?,?,?)',
      [nombre_completo.trim(), correo.trim().toLowerCase(), telefono || null, hash]
    );
    const token = signToken({ id: r.insertId, correo: correo.trim().toLowerCase(), role: 'paciente', name: nombre_completo });
    res.status(201).json({ token });
  } catch (e) {
    if (e?.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Correo ya registrado' });
    console.error(e);
    res.status(500).json({ error: 'Error al registrar' });
  }
});

// POST /api/auth/login
router.post('/auth/login', async (req, res) => {
  try {
    const { correo, contraseña } = req.body || {};
    if (!correo || !contraseña) return res.status(400).json({ error: 'Campos obligatorios' });

    const [rows] = await pool.execute(
      'SELECT id, nombre_completo, contrasena_hash, rol FROM usuarios WHERE correo=?',
      [correo.trim().toLowerCase()]
    );
    if (!rows.length) return res.status(401).json({ error: 'Credenciales inválidas' });

    const user = rows[0];
    const ok = await bcrypt.compare(contraseña, user.contrasena_hash);
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = signToken({ id: user.id, correo: correo.trim().toLowerCase(), role: user.rol, name: user.nombre_completo });
    res.json({ token });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error servidor' });
  }
});

// GET /api/me
router.get('/me', (req, res, next) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Falta token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
  next();
}, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, nombre_completo, correo, telefono, rol, fecha_creacion FROM usuarios WHERE id=?',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error servidor' });
  }
});

module.exports = router;
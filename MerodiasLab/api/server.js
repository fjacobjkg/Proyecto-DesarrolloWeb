require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();


/* MIDDLEWARES BASE */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "https://unpkg.com",
          "https://cdnjs.cloudflare.com",
          "https://cdn.jsdelivr.net" 
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://unpkg.com",
          "https://cdnjs.cloudflare.com",
          "https://cdn.jsdelivr.net",
          "https://fonts.googleapis.com"
        ],
        imgSrc: [
          "'self'",
          "https:",
          "data:",
          "blob:",
          "https://*.tile.openstreetmap.org",
          "https://*.googleapis.com",
          "https://*.gstatic.com"
        ],
        fontSrc: [
          "'self'",
          "data:",
          "https://cdn.jsdelivr.net",
          "https://fonts.gstatic.com"
        ],
        connectSrc: [
          "'self'",
          "https://*.tile.openstreetmap.org"
        ],
        frameSrc: [
          "'self'",
          "https://www.google.com"
        ],
        objectSrc: ["'none'"],
      },
    },
  })
);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));


/* POOL MYSQL */
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  timezone: 'Z',
});

/* HELPERS AUTH */
function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '2d' });
}

function auth(requiredRole) {
  return (req, res, next) => {
    const authH = req.headers.authorization || '';
    const token = authH.startsWith('Bearer ') ? authH.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Falta token' });
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (requiredRole && decoded.role !== requiredRole) {
        return res.status(403).json({ error: 'No autorizado' });
      }
      req.user = decoded;
      next();
    } catch {
      return res.status(401).json({ error: 'Token inválido' });
    }
  };
}

/* HEALTHCHECK */
app.get('/api/health', (_req, res) => res.json({ ok: true }));

/* AUTH */
app.post('/api/auth/register', async (req, res) => {
  try {
    const { full_name, email, phone, password } = req.body || {};
    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'Campos obligatorios' });
    }
    const hash = await bcrypt.hash(password, 12);
    const [r] = await pool.execute(
      'INSERT INTO usuarios (nombre_completo, correo, telefono, contrasena_hash, rol, creado_en) VALUES (?,?,?,?,?,NOW())',
      [full_name.trim(), email.trim().toLowerCase(), phone || null, hash, 'paciente']
    );
    const token = signToken({
      id: r.insertId,
      email: email.trim().toLowerCase(),
      role: 'paciente',
      name: full_name,
    });
    res.status(201).json({ token });
  } catch (e) {
    if (e && e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email ya registrado' });
    }
    console.error(e);
    res.status(500).json({ error: 'Error al registrar' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Campos obligatorios' });
    }
    const [rows] = await pool.execute(
      `SELECT id,
              nombre_completo AS full_name,
              contrasena_hash AS password_hash,
              rol            AS role
         FROM usuarios
        WHERE correo = ?`,
      [email.trim().toLowerCase()]
    );
    if (!rows.length) return res.status(401).json({ error: 'Credenciales inválidas' });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = signToken({
      id: user.id,
      email: email.trim().toLowerCase(),
      role: user.role,     // 'admin' | 'paciente'
      name: user.full_name,
    });
    res.json({ token });
  } catch (e) {
    console.error('Error en /api/auth/login:', e);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

/* SERVICIOS */
app.get('/api/services', async (_req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, slug,
              titulo      AS title,
              descripcion AS description,
              horas_ayuno AS fasting_hrs
         FROM servicios
     ORDER BY id`
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al cargar servicios' });
  }
});

/* CONTACTO*/
// /api/contact  (server.js)
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body || {};
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Campos obligatorios' });
    }

    await pool.execute(
      `INSERT INTO mensajes_contacto
         (nombre, correo, telefono, asunto, mensaje, creado_en)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [name.trim(), String(email).toLowerCase(), phone || null, subject || null, message]
    );

    res.status(201).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al enviar contacto' });
  }
});

/* CITA PACIENTE */
app.post('/api/appointments', auth(), async (req, res) => {
  try {
    let { service_id, subject, message, preferred_dt } = req.body || {};
    if (!preferred_dt) {
      return res.status(400).json({ error: 'preferred_dt requerido (YYYY-MM-DD HH:mm)' });
    }
    preferred_dt = String(preferred_dt).replace('T', ' ').trim();

    // 1) Crear la cita
    const [r] = await pool.execute(
      `INSERT INTO citas (usuario_id, servicio_id, asunto, mensaje, fecha_preferida, estado, creado_en)
       VALUES (?,?,?,?,?,'pendiente',NOW())`,
      [req.user.id, service_id || null, subject || null, message || null, preferred_dt]
    );

    // 2) Guardar también un mensaje de contacto con los datos del usuario
    await pool.execute(
      `INSERT INTO mensajes_contacto (nombre, correo, telefono, asunto, mensaje, creado_en)
       SELECT u.nombre_completo, u.correo, u.telefono, ?, ?, NOW()
         FROM usuarios u
        WHERE u.id = ?`,
      [subject || 'Cita', message || 'Solicitud de cita', req.user.id]
    );

    res.status(201).json({ ok: true, id: r.insertId });
  } catch (e) {
    console.error('POST /api/appointments error:', e);
    res.status(500).json({ error: 'Error servidor' });
  }
});

const SQL_MY_APPTS = `
  SELECT c.id,
         c.fecha_preferida AS preferred_dt,
         c.estado          AS status,
         c.asunto          AS subject,
         c.mensaje         AS message,
         s.titulo          AS service_title,
         (SELECT r.ruta_archivo
            FROM resultados_citas r
           WHERE r.cita_id = c.id
        ORDER BY r.id DESC
           LIMIT 1)        AS result_url
    FROM citas c
    LEFT JOIN servicios s ON s.id = c.servicio_id
   WHERE c.usuario_id = ?
ORDER BY c.fecha_preferida DESC
`;

app.get('/api/appointments', auth(), async (req, res) => {
  try {
    const [rows] = await pool.execute(SQL_MY_APPTS, [req.user.id]);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error servidor' });
  }
});

app.get('/api/appointments/mine', auth(), async (req, res) => {
  try {
    const [rows] = await pool.execute(SQL_MY_APPTS, [req.user.id]);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error servidor' });
  }
});

/* ADMIN */
app.get('/api/admin/appointments', auth('admin'), async (_req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT c.id,
              c.fecha_preferida AS preferred_dt,
              c.estado          AS status,
              c.asunto          AS subject,
              c.mensaje         AS message,
              u.nombre_completo AS full_name,
              u.correo          AS email,
              u.telefono        AS phone,
              s.titulo          AS service_title,
              EXISTS (SELECT 1 FROM resultados_citas r WHERE r.cita_id = c.id) AS has_result
         FROM citas c
   INNER JOIN usuarios u ON u.id = c.usuario_id
    LEFT JOIN servicios s ON s.id = c.servicio_id
     ORDER BY c.creado_en DESC`
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error servidor' });
  }
});

app.patch('/api/admin/appointments/:id/status', auth('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    let { status } = req.body || {};
    status = String(status || '').toLowerCase();

    const MAP = {
      pending:   'pendiente',
      confirmed: 'confirmada',
      cancelled: 'cancelada',
      completed: 'completada',
    };
    const normalized = MAP[status] || status; 

    const allowedES = ['pendiente','confirmada','cancelada','completada'];
    if (!allowedES.includes(normalized)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    await pool.execute(
      'UPDATE citas SET estado=?, actualizado_en=NOW() WHERE id=?',
      [normalized, id]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error servidor' });
  }
});

app.get('/api/admin/users', auth('admin'), async (_req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id,
              nombre_completo AS full_name,
              correo          AS email,
              telefono        AS phone,
              rol             AS role,
              creado_en       AS created_at
         FROM usuarios
     ORDER BY id DESC`
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error servidor' });
  }
});

app.get('/api/admin/users/:id/appointments', auth('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute(
      `SELECT c.id,
              c.fecha_preferida AS preferred_dt,
              c.estado          AS status,
              c.asunto          AS subject,
              c.mensaje         AS message,
              s.titulo          AS service_title
         FROM citas c
    LEFT JOIN servicios s ON s.id = c.servicio_id
        WHERE c.usuario_id = ?
     ORDER BY c.fecha_preferida DESC`,
      [id]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error servidor' });
  }
});

app.patch('/api/admin/users/:id/role', auth('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body || {};
    const allowed = ['paciente', 'admin'];
    if (!allowed.includes(role)) return res.status(400).json({ error: 'Rol inválido' });
    await pool.execute('UPDATE usuarios SET rol=?, actualizado_en=NOW() WHERE id=?', [role, id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error servidor' });
  }
});

/* PERFIL */
app.get('/api/me', auth(), async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id,
              nombre_completo AS full_name,
              correo          AS email,
              telefono        AS phone,
              rol             AS role,
              creado_en       AS created_at
         FROM usuarios
        WHERE id=?`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error servidor' });
  }
});


/* ARCHIVOS SUBIDOS (Resultados)*/
const UPLOAD_DIR = path.join(__dirname, 'uploads', 'results');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const safe = (file.originalname || 'archivo').replace(/[^\w.\-]+/g, '_');
    cb(null, `${ts}__${safe}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'));
    }
  }
});

// Middleware de autenticación para upload (solo admin)
function authUpload(req, res, next) {
  const authH = req.headers.authorization || '';
  const token = authH.startsWith('Bearer ') ? authH.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Falta token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'No autorizado - se requiere rol admin' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

// Ruta de upload
app.post(
  '/api/admin/appointments/:id/result',
  authUpload,
  upload.single('result'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Archivo requerido' });
      }

      const { id } = req.params;
      const url = `/uploads/results/${req.file.filename}`;

      await pool.execute(
        `INSERT INTO resultados_citas (cita_id, ruta_archivo, creado_en) VALUES (?, ?, NOW())`,
        [id, url]
      );

      await pool.execute(
        'UPDATE citas SET estado="completada", actualizado_en=NOW() WHERE id=?',
        [id]
      );

      res.status(201).json({ ok: true, url });
    } catch (e) {
      console.error('❌ Error en upload:', e);
      res.status(500).json({ error: 'Error subiendo resultado: ' + e.message });
    }
  }
);

// archivos subidos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


/* ESTÁTICOS (FRONT) */
app.use(express.static(path.join(__dirname, '..')));
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'inicio.html'));
});


/* ARRANQUE */
const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`API + Front corriendo en http://localhost:${port}`);
});

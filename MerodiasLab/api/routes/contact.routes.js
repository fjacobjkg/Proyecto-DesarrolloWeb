// api/routes/contact.routes.js
const express = require('express');
const router = express.Router();
const { pool } = require('../db');

router.post('/contact', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body || {};

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Campos obligatorios faltantes' });
    }

    await pool.query(
      `INSERT INTO mensajes_contacto (nombre, correo, telefono, asunto, mensaje, creado_en)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [name.trim(), email.trim(), phone || null, subject || '', message.trim()]
    );

    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('POST /api/contact', err);
    res.status(500).json({ error: 'Error al enviar mensaje de contacto' });
  }
});

module.exports = router;
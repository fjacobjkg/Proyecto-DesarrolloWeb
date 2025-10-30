const express = require('express');
const path = require('path');
const app = express();

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use(express.static(path.join(__dirname, '..')));
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'inicio.html'));
});

app.listen(3000, () => console.log('Mini server en http://localhost:3000'));
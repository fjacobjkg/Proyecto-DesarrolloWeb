const http = require('http');

const server = http.createServer((req, res) => {
  if (req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true }));
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hola desde ultramin');
});

// LOG al arrancar
server.listen(3000, '127.0.0.1', () => {
  console.log('✅ ultramin escuchando en http://localhost:3000');
});

// LOG si hay error
server.on('error', (err) => {
  console.error('❌ ERROR al iniciar:', err);
  process.exit(1);
});


import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { pool } from './db.js';
import { errorHandler } from './errors.js';
import authRoutes from './routes/auth.js';
import lavadorasRoutes from './routes/lavadoras.js';
import serviciosRoutes from './routes/servicios.js';
import alquileresRoutes from './routes/alquileres.js';
import ordenesRoutes from './routes/ordenes.js';
import clientesRoutes from './routes/clientes.js';
import comentariosRoutes from './routes/comentarios.js';
import statsRoutes from './routes/stats.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 3000);

const origenes = (process.env.CORS_ORIGIN || 'http://localhost:4200')
  .split(',')
  .map((origen) => origen.trim())
  .filter(Boolean);

app.use(cors({ origin: origenes }));
app.use(express.json({ limit: '100kb' }));

// El panel siempre debe leer datos frescos: evita que el navegador cachee el API.
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.get('/api/health', async (_req, res) => {
  const [rows] = await pool.query('SELECT 1 AS ok');
  res.json({ ok: rows[0].ok === 1, servicio: 'lujo-lavadoras-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api/lavadoras', lavadorasRoutes);
app.use('/api/servicios', serviciosRoutes);
app.use('/api/alquileres', alquileresRoutes);
app.use('/api/ordenes', ordenesRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/comentarios', comentariosRoutes);
app.use('/api/stats', statsRoutes);

// Si ya existe el build de Angular, el backend sirve la página completa
// desde un solo proceso (npm run build en frontend y listo).
const dist = path.resolve(__dirname, '../../frontend/dist/frontend/browser');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
    return res.sendFile(path.join(dist, 'index.html'));
  });
}

app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
});

app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`API Lujo Lavadoras en http://localhost:${PORT}`);
});

for (const senal of ['SIGINT', 'SIGTERM']) {
  process.on(senal, () => {
    server.close(() => pool.end().then(() => process.exit(0)));
  });
}

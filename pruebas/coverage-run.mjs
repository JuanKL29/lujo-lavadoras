import newman from 'newman';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Raíz del proyecto: la carpeta que contiene backend/, frontend/ y docs/.
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backend = path.join(raiz, 'backend');
const coleccion = path.join(raiz, 'docs', 'DEMO-HTTP.postman_collection.json');
const reporte = path.join(raiz, 'docs', 'postman-results.json');
const base = process.env.BASE_URL || 'http://127.0.0.1:3000';

// Arranca la API en este mismo proceso para que c8 pueda medir la cobertura.
await import(pathToFileURL(path.join(backend, 'src', 'server.js')).href);
const { pool } = await import(pathToFileURL(path.join(backend, 'src', 'db.js')).href);

async function esperarApi() {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`${base}/api/health`);
      if (r.ok) return;
    } catch {
      // La API todavía no escucha; se reintenta.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('La API no respondió en 40 segundos');
}

await esperarApi();
console.log(`API lista en ${base}. Ejecutando la colección de Postman...`);

// Deja limpios los clientes de prueba para que el flujo de alquiler cubra
// tanto la creación de un cliente nuevo como la reutilización de uno existente.
await pool.query(
  `DELETE c FROM cliente c
   LEFT JOIN alquiler a ON a.idCliente = c.id_cliente
   WHERE c.cedula IN (1099887766, 1099887700) AND a.id_alquiler IS NULL`,
);

// Si una corrida anterior falló, puede quedar un comentario de prueba visible.
// Se elimina antes y después para no ensuciar la página pública.
const CORREO_COMENTARIO = 'comentario@http.com';
await pool.query('DELETE FROM comentario WHERE correo = ?', [CORREO_COMENTARIO]);

const resumen = await new Promise((resolve, reject) => {
  newman.run(
    {
      collection: coleccion,
      reporters: ['cli', 'json'],
      reporter: { json: { export: reporte } },
      timeoutRequest: 15000,
    },
    (error, summary) => {
      if (error) reject(error);
      else resolve(summary);
    },
  );
});

const stats = resumen.run.stats;
console.log('\n=== RESUMEN NEWMAN ===');
console.log(`Solicitudes: ${stats.requests.total}`);
console.log(`Aserciones: ${stats.assertions.total}`);
console.log(`Fallidas: ${stats.requests.failed + stats.assertions.failed}`);
console.log(
  `Duración: ${Math.round(resumen.run.timings.completed - resumen.run.timings.started)} ms`,
);

if (resumen.run.failures.length) {
  console.log('\n=== FALLOS ===');
  for (const fallo of resumen.run.failures) {
    console.log(
      `- ${fallo.source?.name || '?'} :: ${fallo.error?.message || fallo.error?.name || 'error'}`,
    );
  }
}

// Limpia el cliente creado por el flujo público para dejar la base como estaba.
await pool.query(
  `DELETE c FROM cliente c
   LEFT JOIN alquiler a ON a.idCliente = c.id_cliente
   WHERE c.cedula IN (1099887766, 1099887700) AND a.id_alquiler IS NULL`,
);
await pool.query('DELETE FROM comentario WHERE correo = ?', [CORREO_COMENTARIO]);

await pool.end();
await new Promise((resolve) => setTimeout(resolve, 500));
process.exit(resumen.run.failures.length ? 1 : 0);

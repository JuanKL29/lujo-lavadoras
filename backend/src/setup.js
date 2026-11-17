import { pool } from './db.js';
import { ensureComentariosTable } from './comentarios-schema.js';

try {
  await ensureComentariosTable();
  console.log('Tabla "comentario" lista. No se modificaron las tablas existentes.');
} catch (error) {
  console.error('No se pudo preparar la tabla de comentarios:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}

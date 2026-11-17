import { pool } from './db.js';

/**
 * Crea la tabla de comentarios si no existe.
 * Es una tabla nueva: no se modifican las tablas originales de la base.
 */
export async function ensureComentariosTable(conn = pool) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS comentario (
      id_comentario int(11) NOT NULL,
      nombre varchar(80) NOT NULL,
      correo varchar(80) DEFAULT NULL,
      comentario varchar(500) NOT NULL,
      calificacion tinyint(4) NOT NULL,
      visible tinyint(1) NOT NULL DEFAULT 0,
      fecha datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id_comentario),
      KEY idx_comentario_visible (visible)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);
}

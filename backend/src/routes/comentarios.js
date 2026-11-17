import { Router } from 'express';
import { pool, nextId, withTransaction } from '../db.js';
import { HttpError, requireFields } from '../errors.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

const SELECT_PUBLICO = `
  SELECT id_comentario, nombre, comentario, calificacion, fecha
    FROM comentario
   WHERE visible = 1
   ORDER BY fecha DESC, id_comentario DESC
`;

const SELECT_ADMIN = `
  SELECT id_comentario, nombre, correo, comentario, calificacion, visible, fecha
    FROM comentario
   ORDER BY visible ASC, fecha DESC, id_comentario DESC
`;

const SELECT_UNO = `
  SELECT id_comentario, nombre, correo, comentario, calificacion, visible, fecha
    FROM comentario
   WHERE id_comentario = ?
`;

function normalizarComentario(body) {
  requireFields(body, ['nombre', 'comentario', 'calificacion']);

  const nombre = String(body.nombre).trim();
  const correo = String(body.correo ?? '').trim();
  const comentario = String(body.comentario).trim();
  const calificacion = Number(body.calificacion);

  if (nombre.length < 2 || nombre.length > 80) {
    throw new HttpError(400, 'El nombre debe tener entre 2 y 80 caracteres');
  }
  if (comentario.length < 5 || comentario.length > 500) {
    throw new HttpError(400, 'El comentario debe tener entre 5 y 500 caracteres');
  }
  if (correo.length > 80 || (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo))) {
    throw new HttpError(400, 'El correo no es válido');
  }
  if (!Number.isInteger(calificacion) || calificacion < 1 || calificacion > 5) {
    throw new HttpError(400, 'La calificación debe ser un número entero entre 1 y 5');
  }

  return { nombre, correo: correo || null, comentario, calificacion };
}

// Público: solo los comentarios aprobados por el administrador.
router.get('/', async (_req, res) => {
  const [rows] = await pool.query(SELECT_PUBLICO);
  res.json(rows);
});

// Público: cualquier visitante puede enviar un comentario; queda pendiente.
router.post('/', async (req, res) => {
  const datos = normalizarComentario(req.body);

  const id = await withTransaction(async (conn) => {
    const nuevoId = await nextId(conn, 'comentario', 'id_comentario');
    await conn.query(
      `INSERT INTO comentario (id_comentario, nombre, correo, comentario, calificacion, visible)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [nuevoId, datos.nombre, datos.correo, datos.comentario, datos.calificacion],
    );
    return nuevoId;
  });

  const [[comentario]] = await pool.query(
    'SELECT id_comentario, nombre, comentario, calificacion, visible, fecha FROM comentario WHERE id_comentario = ?',
    [id],
  );
  res.status(201).json({ ...comentario, visible: Boolean(comentario.visible) });
});

// Administración: todos los comentarios, incluidos los pendientes.
router.get('/admin', authenticate, requireAdmin, async (_req, res) => {
  const [rows] = await pool.query(SELECT_ADMIN);
  res.json(rows.map((row) => ({ ...row, visible: Boolean(row.visible) })));
});

// Administración: mostrar u ocultar un comentario en la página pública.
router.patch('/:id/visible', authenticate, requireAdmin, async (req, res) => {
  if (typeof req.body?.visible !== 'boolean') {
    throw new HttpError(400, 'El campo "visible" debe ser true o false');
  }

  const [result] = await pool.query(
    'UPDATE comentario SET visible = ? WHERE id_comentario = ?',
    [req.body.visible ? 1 : 0, req.params.id],
  );
  if (!result.affectedRows) throw new HttpError(404, 'Comentario no encontrado');

  const [[comentario]] = await pool.query(SELECT_UNO, [req.params.id]);
  res.json({ ...comentario, visible: Boolean(comentario.visible) });
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  const [result] = await pool.query('DELETE FROM comentario WHERE id_comentario = ?', [
    req.params.id,
  ]);
  if (!result.affectedRows) throw new HttpError(404, 'Comentario no encontrado');
  res.json({ ok: true });
});

export default router;

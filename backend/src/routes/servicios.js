import { Router } from 'express';
import { pool, nextId } from '../db.js';
import { HttpError, requireFields } from '../errors.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', async (_req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM tipo_de_servicio ORDER BY id_tipo_servicio ASC',
  );
  res.json(rows);
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
  requireFields(req.body, ['nombre_servicio', 'precio']);
  const { nombre_servicio, descripcion, precio } = req.body;

  const id = await nextId(pool, 'tipo_de_servicio', 'id_tipo_servicio');
  await pool.query(
    `INSERT INTO tipo_de_servicio (id_tipo_servicio, nombre_servicio, descripcion, precio)
     VALUES (?, ?, ?, ?)`,
    [id, nombre_servicio, descripcion || null, Math.round(Number(precio))],
  );

  const [rows] = await pool.query(
    'SELECT * FROM tipo_de_servicio WHERE id_tipo_servicio = ?',
    [id],
  );
  res.status(201).json(rows[0]);
});

router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  requireFields(req.body, ['nombre_servicio', 'precio']);
  const { nombre_servicio, descripcion, precio } = req.body;

  const [result] = await pool.query(
    `UPDATE tipo_de_servicio
        SET nombre_servicio = ?, descripcion = ?, precio = ?
      WHERE id_tipo_servicio = ?`,
    [nombre_servicio, descripcion || null, Math.round(Number(precio)), req.params.id],
  );
  if (!result.affectedRows) throw new HttpError(404, 'Servicio no encontrado');

  const [rows] = await pool.query(
    'SELECT * FROM tipo_de_servicio WHERE id_tipo_servicio = ?',
    [req.params.id],
  );
  res.json(rows[0]);
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  const [result] = await pool.query(
    'DELETE FROM tipo_de_servicio WHERE id_tipo_servicio = ?',
    [req.params.id],
  );
  if (!result.affectedRows) throw new HttpError(404, 'Servicio no encontrado');
  res.json({ ok: true });
});

export default router;

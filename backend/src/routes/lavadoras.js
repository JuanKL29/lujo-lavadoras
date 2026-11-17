import { Router } from 'express';
import { pool, nextId } from '../db.js';
import { HttpError, requireFields } from '../errors.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { isAvailable } from '../availability.js';

const router = Router();

router.get('/', async (req, res) => {
  const { estado, q } = req.query;
  let sql = 'SELECT * FROM lavadora WHERE 1 = 1';
  const params = [];

  if (estado) {
    sql += ' AND estado = ?';
    params.push(estado);
  }
  if (q) {
    sql += ' AND (marca LIKE ? OR modelo LIKE ? OR referencia LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  sql += ' ORDER BY id_lavadora ASC';

  const [rows] = await pool.query(sql, params);
  res.json(rows);
});

router.get('/:id/disponibilidad', async (req, res) => {
  const { inicio, fin } = req.query;
  const libre = await isAvailable(pool, req.params.id, inicio, fin);
  res.json({ disponible: libre });
});

router.get('/:id', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM lavadora WHERE id_lavadora = ?', [
    req.params.id,
  ]);
  if (!rows[0]) throw new HttpError(404, 'Lavadora no encontrada');
  res.json(rows[0]);
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
  requireFields(req.body, ['marca', 'modelo', 'referencia', 'precio_alquiler']);
  const { marca, modelo, referencia, estado, precio_alquiler } = req.body;

  const precio = Number(precio_alquiler);
  if (!Number.isFinite(precio) || precio <= 0) {
    throw new HttpError(400, 'El precio debe ser un número mayor a cero');
  }

  const id = await nextId(pool, 'lavadora', 'id_lavadora');
  await pool.query(
    `INSERT INTO lavadora (id_lavadora, marca, modelo, referencia, estado, precio_alquiler)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, marca, modelo, referencia, estado || 'Disponible', Math.round(precio)],
  );

  const [rows] = await pool.query('SELECT * FROM lavadora WHERE id_lavadora = ?', [id]);
  res.status(201).json(rows[0]);
});

router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  requireFields(req.body, ['marca', 'modelo', 'referencia', 'precio_alquiler']);
  const { marca, modelo, referencia, estado, precio_alquiler } = req.body;

  const [exists] = await pool.query('SELECT id_lavadora FROM lavadora WHERE id_lavadora = ?', [
    req.params.id,
  ]);
  if (!exists[0]) throw new HttpError(404, 'Lavadora no encontrada');

  await pool.query(
    `UPDATE lavadora
        SET marca = ?, modelo = ?, referencia = ?, estado = ?, precio_alquiler = ?
      WHERE id_lavadora = ?`,
    [
      marca,
      modelo,
      referencia,
      estado || 'Disponible',
      Math.round(Number(precio_alquiler)),
      req.params.id,
    ],
  );

  const [rows] = await pool.query('SELECT * FROM lavadora WHERE id_lavadora = ?', [
    req.params.id,
  ]);
  res.json(rows[0]);
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  const [result] = await pool.query('DELETE FROM lavadora WHERE id_lavadora = ?', [
    req.params.id,
  ]);
  if (!result.affectedRows) throw new HttpError(404, 'Lavadora no encontrada');
  res.json({ ok: true });
});

export default router;

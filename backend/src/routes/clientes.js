import { Router } from 'express';
import { pool, nextId, withTransaction } from '../db.js';
import { HttpError, requireFields } from '../errors.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// La columna `cedula` es INT(11): el máximo representable es 2.147.483.647.
const CEDULA_MAX = 2147483647;

const SELECT_CLIENTES = `
  SELECT c.*,
         COUNT(a.id_alquiler) AS total_alquileres,
         MAX(a.fecha_inicio) AS ultimo_alquiler
    FROM cliente c
    LEFT JOIN alquiler a ON a.idCliente = c.id_cliente
   GROUP BY c.id_cliente
   ORDER BY c.id_cliente DESC
`;

const SELECT_CLIENTE = `
  SELECT c.*,
         (SELECT COUNT(*) FROM alquiler a WHERE a.idCliente = c.id_cliente) AS total_alquileres,
         (SELECT MAX(a.fecha_inicio) FROM alquiler a WHERE a.idCliente = c.id_cliente) AS ultimo_alquiler
    FROM cliente c
   WHERE c.id_cliente = ?
`;

function validarCedula(valor) {
  const cedula = String(valor ?? '').trim();
  if (!/^\d{5,10}$/.test(cedula)) {
    throw new HttpError(400, 'La cédula debe tener entre 5 y 10 dígitos');
  }
  if (Number(cedula) > CEDULA_MAX) {
    throw new HttpError(400, 'La cédula no puede superar 2.147.483.647');
  }
  return Number(cedula);
}

router.get('/', authenticate, requireAdmin, async (_req, res) => {
  const [rows] = await pool.query(SELECT_CLIENTES);
  res.json(rows);
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
  requireFields(req.body, ['nombre', 'cedula', 'telefono', 'correo']);
  const { nombre, telefono, correo, direccion } = req.body;
  const cedula = validarCedula(req.body.cedula);

  const id = await withTransaction(async (conn) => {
    const [existe] = await conn.query(
      'SELECT id_cliente FROM cliente WHERE cedula = ? LIMIT 1',
      [cedula],
    );
    if (existe[0]) throw new HttpError(409, 'Ya existe un cliente con esa cédula');

    const nuevoId = await nextId(conn, 'cliente', 'id_cliente');
    await conn.query(
      `INSERT INTO cliente (id_cliente, nombre, cedula, telefono, correo, direccion)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nuevoId, nombre, cedula, telefono, correo, direccion || null],
    );
    return nuevoId;
  });

  const [[cliente]] = await pool.query(SELECT_CLIENTE, [id]);
  res.status(201).json(cliente);
});

router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  requireFields(req.body, ['nombre', 'cedula', 'telefono', 'correo']);
  const { nombre, telefono, correo, direccion } = req.body;
  const cedula = validarCedula(req.body.cedula);

  const [[actual]] = await pool.query(
    'SELECT id_cliente FROM cliente WHERE id_cliente = ? LIMIT 1',
    [req.params.id],
  );
  if (!actual) throw new HttpError(404, 'Cliente no encontrado');

  const [existe] = await pool.query(
    'SELECT id_cliente FROM cliente WHERE cedula = ? AND id_cliente <> ? LIMIT 1',
    [cedula, req.params.id],
  );
  if (existe[0]) throw new HttpError(409, 'Ya existe un cliente con esa cédula');

  await pool.query(
    `UPDATE cliente
        SET nombre = ?, cedula = ?, telefono = ?, correo = ?, direccion = ?
      WHERE id_cliente = ?`,
    [nombre, cedula, telefono, correo, direccion || null, req.params.id],
  );

  const [[cliente]] = await pool.query(SELECT_CLIENTE, [req.params.id]);
  res.json(cliente);
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  const [alquileres] = await pool.query(
    'SELECT id_alquiler FROM alquiler WHERE idCliente = ? LIMIT 1',
    [req.params.id],
  );
  if (alquileres[0]) {
    throw new HttpError(
      409,
      'No se puede eliminar un cliente con alquileres. Elimina primero sus alquileres.',
    );
  }

  const [result] = await pool.query('DELETE FROM cliente WHERE id_cliente = ?', [
    req.params.id,
  ]);
  if (!result.affectedRows) throw new HttpError(404, 'Cliente no encontrado');
  res.json({ ok: true });
});

export default router;

import { Router } from 'express';
import { pool, nextId, withTransaction } from '../db.js';
import { HttpError, parseDate, requireFields } from '../errors.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { ensureLavadora, isAvailable } from '../availability.js';

const router = Router();

const ESTADOS = ['Pendiente', 'Activo', 'Finalizado', 'Cancelado'];
const CEDULA_MAX = 2147483647;

const SELECT_ALQUILERES = `
  SELECT a.*,
         DATEDIFF(a.fecha_fin, a.fecha_inicio) + 1 AS dias,
         ROUND(
           (DATEDIFF(a.fecha_fin, a.fecha_inicio) + 1) * l.precio_alquiler / 30,
           -3
         ) AS total,
         c.nombre AS cliente_nombre,
         c.cedula,
         c.telefono,
         c.correo,
         c.direccion,
         l.marca,
         l.modelo,
         l.referencia,
         l.precio_alquiler
    FROM alquiler a
    LEFT JOIN cliente c ON c.id_cliente = a.idCliente
    LEFT JOIN lavadora l ON l.id_lavadora = a.idLavadora
`;

/** Solicitud pública de alquiler: crea/actualiza el cliente y registra el alquiler. */
router.post('/', async (req, res) => {
  const { cliente, idLavadora, fecha_inicio, fecha_fin } = req.body || {};

  requireFields(cliente, ['nombre', 'cedula', 'telefono', 'correo']);
  requireFields(req.body, ['idLavadora', 'fecha_inicio', 'fecha_fin']);

  const inicio = parseDate(fecha_inicio, 'fecha_inicio');
  const fin = parseDate(fecha_fin, 'fecha_fin');
  if (fin < inicio) {
    throw new HttpError(400, 'La fecha de fin no puede ser anterior a la de inicio');
  }

  const cedula = String(cliente.cedula).trim();
  if (!/^\d{5,10}$/.test(cedula)) {
    throw new HttpError(400, 'La cédula debe tener entre 5 y 10 dígitos');
  }
  if (Number(cedula) > CEDULA_MAX) {
    throw new HttpError(400, 'La cédula no puede superar 2.147.483.647');
  }

  const resultado = await withTransaction(async (conn) => {
    const lavadora = await ensureLavadora(conn, idLavadora);
    if (lavadora.estado === 'Mantenimiento') {
      throw new HttpError(409, 'Esa lavadora está en mantenimiento');
    }
    if (!(await isAvailable(conn, idLavadora, inicio, fin))) {
      throw new HttpError(409, 'La lavadora ya está alquilada en esas fechas');
    }

    const [clientes] = await conn.query(
      'SELECT id_cliente FROM cliente WHERE cedula = ? LIMIT 1',
      [cedula],
    );

    let idCliente;
    if (clientes[0]) {
      idCliente = clientes[0].id_cliente;
      await conn.query(
        'UPDATE cliente SET nombre = ?, telefono = ?, correo = ?, direccion = ? WHERE id_cliente = ?',
        [
          cliente.nombre,
          cliente.telefono,
          cliente.correo,
          cliente.direccion || null,
          idCliente,
        ],
      );
    } else {
      idCliente = await nextId(conn, 'cliente', 'id_cliente');
      await conn.query(
        `INSERT INTO cliente (id_cliente, nombre, cedula, telefono, correo, direccion)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          idCliente,
          cliente.nombre,
          Number(cedula),
          cliente.telefono,
          cliente.correo,
          cliente.direccion || null,
        ],
      );
    }

    const idAlquiler = await nextId(conn, 'alquiler', 'id_alquiler');
    await conn.query(
      `INSERT INTO alquiler (id_alquiler, fecha_inicio, fecha_fin, estado, idCliente, idLavadora)
       VALUES (?, ?, ?, 'Pendiente', ?, ?)`,
      [idAlquiler, inicio, fin, idCliente, idLavadora],
    );

    await conn.query('UPDATE lavadora SET estado = ? WHERE id_lavadora = ?', [
      'Reservada',
      idLavadora,
    ]);

    return { idAlquiler, idCliente };
  });

  const [[alquiler]] = await pool.query(
    `${SELECT_ALQUILERES} WHERE a.id_alquiler = ?`,
    [resultado.idAlquiler],
  );

  res.status(201).json({
    mensaje: 'Solicitud registrada. Te contactaremos para confirmar el alquiler.',
    alquiler,
  });
});

router.get('/', authenticate, requireAdmin, async (req, res) => {
  const { estado } = req.query;
  let sql = SELECT_ALQUILERES;
  const params = [];
  if (estado) {
    sql += ' WHERE a.estado = ?';
    params.push(estado);
  }
  sql += ' ORDER BY a.fecha_inicio DESC, a.id_alquiler DESC';
  const [rows] = await pool.query(sql, params);
  res.json(rows);
});

router.patch('/:id/estado', authenticate, requireAdmin, async (req, res) => {
  const { estado } = req.body || {};
  if (!ESTADOS.includes(estado)) {
    throw new HttpError(400, `Estado inválido. Usa: ${ESTADOS.join(', ')}`);
  }

  const [rows] = await pool.query('SELECT * FROM alquiler WHERE id_alquiler = ?', [
    req.params.id,
  ]);
  const alquiler = rows[0];
  if (!alquiler) throw new HttpError(404, 'Alquiler no encontrado');

  await pool.query('UPDATE alquiler SET estado = ? WHERE id_alquiler = ?', [
    estado,
    req.params.id,
  ]);

  const nuevoEstadoLavadora =
    estado === 'Activo'
      ? 'Alquilada'
      : estado === 'Pendiente'
        ? 'Reservada'
        : 'Disponible';

  const [[lavadora]] = await pool.query(
    'SELECT estado FROM lavadora WHERE id_lavadora = ?',
    [alquiler.idLavadora],
  );
  if (lavadora && lavadora.estado !== 'Mantenimiento') {
    await pool.query('UPDATE lavadora SET estado = ? WHERE id_lavadora = ?', [
      nuevoEstadoLavadora,
      alquiler.idLavadora,
    ]);
  }

  const [[actualizado]] = await pool.query(`${SELECT_ALQUILERES} WHERE a.id_alquiler = ?`, [
    req.params.id,
  ]);
  res.json(actualizado);
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM alquiler WHERE id_alquiler = ?', [
    req.params.id,
  ]);
  const alquiler = rows[0];
  if (!alquiler) throw new HttpError(404, 'Alquiler no encontrado');

  await pool.query('DELETE FROM alquiler WHERE id_alquiler = ?', [req.params.id]);

  const [[lavadora]] = await pool.query(
    'SELECT estado FROM lavadora WHERE id_lavadora = ?',
    [alquiler.idLavadora],
  );
  if (lavadora && lavadora.estado !== 'Mantenimiento') {
    await pool.query('UPDATE lavadora SET estado = ? WHERE id_lavadora = ?', [
      'Disponible',
      alquiler.idLavadora,
    ]);
  }
  res.json({ ok: true });
});

export default router;

import { Router } from 'express';
import { pool, nextId, withTransaction } from '../db.js';
import { HttpError, requireFields } from '../errors.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

const ESTADOS = ['Pendiente', 'En proceso', 'Completado', 'Cancelado'];

// El estado de la orden de servicio impulsa el estado del alquiler asociado.
const ESTADO_ALQUILER_POR_ORDEN = {
  Pendiente: 'Pendiente',
  'En proceso': 'Activo',
  Completado: 'Finalizado',
  Cancelado: 'Cancelado',
};

async function sincronizarAlquiler(conn, idAlquiler, estadoOrden) {
  if (!idAlquiler) return;

  const estadoAlquiler = ESTADO_ALQUILER_POR_ORDEN[estadoOrden];
  if (!estadoAlquiler) return;

  const [[alquiler]] = await conn.query(
    'SELECT idLavadora FROM alquiler WHERE id_alquiler = ?',
    [idAlquiler],
  );
  if (!alquiler) return;

  await conn.query('UPDATE alquiler SET estado = ? WHERE id_alquiler = ?', [
    estadoAlquiler,
    idAlquiler,
  ]);

  const estadoLavadora =
    estadoAlquiler === 'Activo'
      ? 'Alquilada'
      : estadoAlquiler === 'Pendiente'
        ? 'Reservada'
        : 'Disponible';

  const [[lavadora]] = await conn.query(
    'SELECT estado FROM lavadora WHERE id_lavadora = ?',
    [alquiler.idLavadora],
  );
  if (lavadora && lavadora.estado !== 'Mantenimiento') {
    await conn.query('UPDATE lavadora SET estado = ? WHERE id_lavadora = ?', [
      estadoLavadora,
      alquiler.idLavadora,
    ]);
  }
}

const SELECT_ORDENES = `
  SELECT o.*,
         a.fecha_inicio,
         a.fecha_fin,
         a.idLavadora,
         l.marca,
         l.modelo,
         l.referencia,
         c.nombre AS cliente_nombre,
         c.cedula,
         t.nombre_servicio,
         t.precio AS precio_servicio
    FROM orden_de_servicio o
    LEFT JOIN alquiler a ON a.id_alquiler = o.idAlquiler
    LEFT JOIN lavadora l ON l.id_lavadora = a.idLavadora
    LEFT JOIN cliente c ON c.id_cliente = a.idCliente
    LEFT JOIN tipo_de_servicio t ON t.id_tipo_servicio = o.idTipo_servicio
`;

router.get('/', authenticate, requireAdmin, async (_req, res) => {
  const [rows] = await pool.query(
    `${SELECT_ORDENES} ORDER BY o.fecha_orden DESC, o.id_orden_servicio DESC`,
  );
  res.json(rows);
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
  requireFields(req.body, ['idAlquiler', 'idTipo_servicio']);

  const estado = req.body.estado || 'Pendiente';
  if (!ESTADOS.includes(estado)) {
    throw new HttpError(400, `Estado inválido. Usa: ${ESTADOS.join(', ')}`);
  }

  const id = await withTransaction(async (conn) => {
    const [[alquiler]] = await conn.query('SELECT * FROM alquiler WHERE id_alquiler = ?', [
      req.body.idAlquiler,
    ]);
    if (!alquiler) throw new HttpError(404, 'Alquiler no encontrado');

    const [[servicio]] = await conn.query(
      'SELECT * FROM tipo_de_servicio WHERE id_tipo_servicio = ?',
      [req.body.idTipo_servicio],
    );
    if (!servicio) throw new HttpError(404, 'Servicio no encontrado');

    const nuevoId = await nextId(conn, 'orden_de_servicio', 'id_orden_servicio');
    await conn.query(
      `INSERT INTO orden_de_servicio
         (id_orden_servicio, fecha_orden, estado, observaciones, idAlquiler, idTipo_servicio)
       VALUES (?, CURDATE(), ?, ?, ?, ?)`,
      [
        nuevoId,
        estado,
        req.body.observaciones || null,
        req.body.idAlquiler,
        req.body.idTipo_servicio,
      ],
    );

    // Si la orden nace en un estado de avance, sincroniza el alquiler.
    if (estado !== 'Pendiente') {
      await sincronizarAlquiler(conn, req.body.idAlquiler, estado);
    }

    return nuevoId;
  });

  const [[orden]] = await pool.query(`${SELECT_ORDENES} WHERE o.id_orden_servicio = ?`, [id]);
  res.status(201).json(orden);
});

router.patch('/:id/estado', authenticate, requireAdmin, async (req, res) => {
  const { estado, observaciones } = req.body || {};
  if (!ESTADOS.includes(estado)) {
    throw new HttpError(400, `Estado inválido. Usa: ${ESTADOS.join(', ')}`);
  }

  await withTransaction(async (conn) => {
    const [result] = await conn.query(
      'UPDATE orden_de_servicio SET estado = ?, observaciones = COALESCE(?, observaciones) WHERE id_orden_servicio = ?',
      [estado, observaciones ?? null, req.params.id],
    );
    if (!result.affectedRows) throw new HttpError(404, 'Orden no encontrada');

    const [[orden]] = await conn.query(
      'SELECT idAlquiler FROM orden_de_servicio WHERE id_orden_servicio = ?',
      [req.params.id],
    );
    await sincronizarAlquiler(conn, orden?.idAlquiler, estado);
  });

  const [[orden]] = await pool.query(
    `${SELECT_ORDENES} WHERE o.id_orden_servicio = ?`,
    [req.params.id],
  );
  res.json(orden);
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  const [result] = await pool.query(
    'DELETE FROM orden_de_servicio WHERE id_orden_servicio = ?',
    [req.params.id],
  );
  if (!result.affectedRows) throw new HttpError(404, 'Orden no encontrada');
  res.json({ ok: true });
});

export default router;

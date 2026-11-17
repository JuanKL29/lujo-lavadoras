import { Router } from 'express';
import { pool } from '../db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, requireAdmin, async (_req, res) => {
  const [[conteos]] = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM lavadora) AS lavadoras,
      (SELECT COUNT(*) FROM lavadora WHERE estado = 'Disponible') AS disponibles,
      (SELECT COUNT(*) FROM alquiler) AS alquileres,
      (SELECT COUNT(*) FROM alquiler WHERE estado = 'Pendiente') AS pendientes,
      (SELECT COUNT(*) FROM alquiler WHERE estado = 'Activo') AS activos,
      (SELECT COUNT(*) FROM cliente) AS clientes,
      (SELECT COUNT(*) FROM orden_de_servicio WHERE estado IN ('Pendiente', 'En proceso')) AS ordenes_abiertas,
      (SELECT COALESCE(SUM(
         ROUND((DATEDIFF(a.fecha_fin, a.fecha_inicio) + 1) * l.precio_alquiler / 30, -3)
       ), 0)
         FROM alquiler a
         JOIN lavadora l ON l.id_lavadora = a.idLavadora
        WHERE a.estado NOT IN ('Cancelado')) AS ingreso_estimado
  `);

  const [porEstado] = await pool.query(
    'SELECT estado, COUNT(*) AS total FROM alquiler GROUP BY estado',
  );

  const [recientes] = await pool.query(`
    SELECT a.id_alquiler, a.fecha_inicio, a.fecha_fin, a.estado,
           c.nombre AS cliente_nombre, l.marca, l.modelo
      FROM alquiler a
      LEFT JOIN cliente c ON c.id_cliente = a.idCliente
      LEFT JOIN lavadora l ON l.id_lavadora = a.idLavadora
     ORDER BY a.id_alquiler DESC
     LIMIT 6
  `);

  res.json({ ...conteos, por_estado: porEstado, recientes });
});

export default router;

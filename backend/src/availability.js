import { HttpError } from './errors.js';

const ESTADOS_CERRADOS = ['Cancelado', 'Finalizado'];

/** true si la lavadora no tiene alquileres activos que se crucen con el rango. */
export async function isAvailable(conn, idLavadora, inicio, fin) {
  if (!inicio || !fin) return true;
  const [[row]] = await conn.query(
    `SELECT COUNT(*) AS total
       FROM alquiler
      WHERE idLavadora = ?
        AND estado NOT IN (?, ?)
        AND fecha_inicio <= ?
        AND fecha_fin >= ?`,
    [idLavadora, ...ESTADOS_CERRADOS, fin, inicio],
  );
  return Number(row.total) === 0;
}

export async function ensureLavadora(conn, idLavadora) {
  const [[lavadora]] = await conn.query(
    'SELECT * FROM lavadora WHERE id_lavadora = ?',
    [idLavadora],
  );
  if (!lavadora) throw new HttpError(404, 'Lavadora no encontrada');
  return lavadora;
}

export { ESTADOS_CERRADOS };

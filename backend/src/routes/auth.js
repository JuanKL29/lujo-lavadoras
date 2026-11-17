import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { HttpError, requireFields } from '../errors.js';
import { authenticate, signToken } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  requireFields(req.body, ['correo', 'password']);
  const correo = String(req.body.correo).trim().toLowerCase();
  const password = String(req.body.password);

  const [rows] = await pool.query(
    'SELECT id_usuario, nombre, correo, rol, `contraseña` AS password FROM usuario WHERE LOWER(correo) = ? LIMIT 1',
    [correo],
  );
  const usuario = rows[0];
  if (!usuario) throw new HttpError(401, 'Correo o contraseña incorrectos');

  const guardada = usuario.password || '';
  const valida = guardada.startsWith('$2')
    ? await bcrypt.compare(password, guardada)
    : password === guardada;

  if (!valida) throw new HttpError(401, 'Correo o contraseña incorrectos');

  res.json({
    token: signToken(usuario),
    usuario: {
      id: usuario.id_usuario,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
    },
  });
});

router.get('/me', authenticate, async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id_usuario AS id, nombre, correo, rol FROM usuario WHERE id_usuario = ?',
    [req.user.id],
  );
  if (!rows[0]) throw new HttpError(401, 'Usuario no encontrado');
  res.json(rows[0]);
});

export default router;

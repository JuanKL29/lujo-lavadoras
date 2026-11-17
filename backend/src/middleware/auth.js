import jwt from 'jsonwebtoken';
import { HttpError } from '../errors.js';

const SECRET = process.env.JWT_SECRET || 'lujo-lavadoras-dev-secret';

export function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new HttpError(401, 'Debes iniciar sesión'));

  try {
    req.user = jwt.verify(token, SECRET);
    return next();
  } catch {
    return next(new HttpError(401, 'Sesión inválida o expirada'));
  }
}

export function requireAdmin(req, _res, next) {
  const rol = String(req.user?.rol || '').toLowerCase();
  if (!rol.includes('admin')) {
    return next(new HttpError(403, 'No tienes permisos de administrador'));
  }
  return next();
}

export function signToken(usuario) {
  return jwt.sign(
    { id: usuario.id_usuario, nombre: usuario.nombre, rol: usuario.rol },
    SECRET,
    { expiresIn: '8h' },
  );
}

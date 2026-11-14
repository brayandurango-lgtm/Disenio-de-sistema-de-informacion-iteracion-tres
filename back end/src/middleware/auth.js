import jwt from 'jsonwebtoken';
import config from '../config.js';
import { pool } from '../db.js';
import { errores } from '../errors.js';
import { logger } from '../logger.js';
import { huellaPassword } from '../auth/password.js';

// Verifica el Bearer JWT y carga el usuario fresco desde la BD (rol y activo
// pueden haber cambiado desde que se emitió el token).
export async function autenticar(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
    if (!token) throw errores.noAutenticado();

    let payload;
    try {
      payload = jwt.verify(token, config.jwt.secret);
    } catch {
      throw errores.noAutenticado('Token inválido o expirado');
    }

    const [rows] = await pool.query(
      'SELECT id, nombre_usuario, rol, activo, password_hash FROM usuarios WHERE id = ?',
      [payload.sub],
    );
    const usuario = rows[0];
    if (!usuario || !usuario.activo) {
      throw errores.noAutenticado('Usuario inexistente o desactivado');
    }
    // Un cambio de contraseña invalida los tokens emitidos antes
    // (p. ej. sesiones abiertas con la contraseña anterior).
    if (payload.pwd !== huellaPassword(usuario.password_hash)) {
      throw errores.noAutenticado('Sesión inválida: la contraseña cambió');
    }
    const { password_hash: _omitido, ...usuarioPublico } = usuario;
    req.usuario = usuarioPublico;
    next();
  } catch (err) {
    next(err);
  }
}

// Guardia de roles. Uso: router.post('/x', autenticar, requireRol('administrador'), ...)
export function requireRol(...roles) {
  return (req, _res, next) => {
    if (!req.usuario) return next(errores.noAutenticado());
    if (!roles.includes(req.usuario.rol)) {
      logger.warn('permiso denegado', { ruta: req.originalUrl, usuario: req.usuario.nombre_usuario, rol: req.usuario.rol });
      return next(errores.permisoDenegado());
    }
    next();
  };
}

export function emitirToken(usuario) {
  return jwt.sign(
    {
      sub: usuario.id,
      rol: usuario.rol,
      nombre_usuario: usuario.nombre_usuario,
      pwd: huellaPassword(usuario.password_hash),
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn },
  );
}

import express from 'express';
import { pool } from '../db.js';
import { errores } from '../errors.js';
import { autenticar, emitirToken } from '../middleware/auth.js';
import {
  verificarLimiteLogin,
  registrarIntentoFallido,
  limpiarIntentos,
} from '../middleware/loginLimiter.js';
import { verificarPassword } from '../auth/password.js';
import { logger } from '../logger.js';

const router = express.Router();

// POST /api/auth/login
// body: { "nombre_usuario": "...", "password": "..." }
// → 200 { token, usuario: { id, nombre_usuario, rol } }
// Errores: VALIDACION, NO_AUTENTICADO (credenciales inválidas, mensaje único),
// DEMASIADOS_INTENTOS (429).
router.post('/login', async (req, res, next) => {
  try {
    const { nombre_usuario, password } = req.body ?? {};
    if (typeof nombre_usuario !== 'string' || nombre_usuario.trim() === '' ||
        typeof password !== 'string' || password === '') {
      throw errores.validacion('nombre_usuario y password son obligatorios');
    }
    const usuarioLogin = nombre_usuario.trim();

    verificarLimiteLogin(req, usuarioLogin);

    const [rows] = await pool.query(
      'SELECT id, nombre_usuario, correo, password_hash, rol, activo FROM usuarios WHERE nombre_usuario = ?',
      [usuarioLogin],
    );
    const usuario = rows[0];

    // Mismo mensaje para usuario inexistente, contraseña incorrecta o cuenta
    // inactiva: no revelar cuál falló. El hash ficticio iguala el tiempo de
    // respuesta cuando el usuario no existe (anti enumeración).
    const DUMMY_HASH = '$2b$12$pEXUUN1QEeUK9cQNPeErTeSyQ9nNGE5jL7X.PJpAfZgh9y16r2Eju';
    const passwordOk = usuario
      ? await verificarPassword(password, usuario.password_hash)
      : await verificarPassword(password, DUMMY_HASH);

    if (!usuario || !usuario.activo || !passwordOk) {
      registrarIntentoFallido(req, usuarioLogin);
      logger.warn('login fallido', { usuario: usuarioLogin });
      throw errores.noAutenticado('Credenciales inválidas');
    }

    limpiarIntentos(req, usuarioLogin);
    const token = emitirToken(usuario);
    logger.info('login exitoso', { usuario: usuario.nombre_usuario, rol: usuario.rol });

    res.json({
      token,
      usuario: { id: usuario.id, nombre_usuario: usuario.nombre_usuario, correo: usuario.correo, rol: usuario.rol },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/yo — datos del usuario autenticado (para que el frontend
// conozca su rol tras recargar).
router.get('/yo', autenticar, (req, res) => {
  res.json({ usuario: req.usuario });
});

export default router;

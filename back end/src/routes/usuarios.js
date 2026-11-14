import express from 'express';
import { pool } from '../db.js';
import { errores } from '../errors.js';
import { autenticar, requireRol } from '../middleware/auth.js';
import { hashPassword, verificarPassword } from '../auth/password.js';
import { paginacion, paginadoResult, idParam } from '../utils/paginacion.js';
import { logger } from '../logger.js';

const router = express.Router();
router.use(autenticar);

const ROLES = ['administrador', 'operador'];
const SELECT_PUBLICO = 'id, cliente_id, nombre_usuario, correo, rol, activo, creado_en';

function validarUsuario(body, { esEdicion = false, esPassword = false } = {}) {
  const out = {};
  const falta = (c) => { throw errores.validacion(`Campo obligatorio: ${c}`); };
  if (!esEdicion || body.nombre_usuario !== undefined) {
    if (typeof body.nombre_usuario !== 'string') falta('nombre_usuario');
    const v = body.nombre_usuario.trim();
    if (v.length < 3 || v.length > 50 || !/^[a-zA-Z0-9_.-]+$/.test(v)) {
      throw errores.validacion('nombre_usuario: 3-50 caracteres, solo letras, números, _ . -');
    }
    out.nombre_usuario = v;
  }
  if (!esEdicion || body.correo !== undefined) {
    if (typeof body.correo !== 'string') falta('correo');
    const v = body.correo.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) || v.length > 120) {
      throw errores.validacion('correo con formato inválido');
    }
    out.correo = v;
  }
  if (body.password !== undefined || (!esEdicion && !esPassword)) {
    if (typeof body.password !== 'string' || body.password.length < 10 || body.password.length > 128) {
      throw errores.validacion('password debe tener entre 10 y 128 caracteres');
    }
    out.password = body.password;
  }
  if (body.rol !== undefined) {
    if (!ROLES.includes(body.rol)) throw errores.validacion(`rol debe ser uno de: ${ROLES.join(', ')}`);
    out.rol = body.rol;
  }
  if (body.cliente_id !== undefined) {
    if (body.cliente_id === null) { out.cliente_id = null; }
    else {
      const id = Number(body.cliente_id);
      if (!Number.isInteger(id) || id <= 0) throw errores.validacion('cliente_id inválido');
      out.cliente_id = id;
    }
  }
  if (body.activo !== undefined) {
    if (typeof body.activo !== 'boolean') throw errores.validacion('activo debe ser booleano');
    out.activo = body.activo ? 1 : 0;
  }
  return out;
}

// GET /api/usuarios — solo administrador.
router.get('/', requireRol('administrador'), async (req, res, next) => {
  try {
    const { pagina, tamano, offset } = paginacion(req);
    const [rows] = await pool.query(
      `SELECT ${SELECT_PUBLICO} FROM usuarios ORDER BY nombre_usuario LIMIT ? OFFSET ?`,
      [tamano, offset],
    );
    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM usuarios');
    res.json(paginadoResult(total, rows, { pagina, tamano }));
  } catch (err) { next(err); }
});

// POST /api/usuarios — solo administrador. El password nunca se devuelve.
router.post('/', requireRol('administrador'), async (req, res, next) => {
  try {
    const d = validarUsuario(req.body ?? {});
    if (d.cliente_id) {
      const [c] = await pool.query('SELECT id FROM clientes WHERE id = ?', [d.cliente_id]);
      if (!c[0]) throw errores.noEncontrado('Cliente no encontrado');
    }
    const hash = await hashPassword(d.password);
    const [r] = await pool.query(
      `INSERT INTO usuarios (cliente_id, nombre_usuario, correo, password_hash, rol, activo)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [d.cliente_id ?? null, d.nombre_usuario, d.correo, hash, d.rol ?? 'operador'],
    );
    const [rows] = await pool.query(`SELECT ${SELECT_PUBLICO} FROM usuarios WHERE id = ?`, [r.insertId]);
    logger.info('usuario creado', { por: req.usuario.nombre_usuario, nuevo: d.nombre_usuario, rol: d.rol ?? 'operador' });
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// PATCH /api/usuarios/:id — solo administrador (datos, rol, activar/desactivar).
// No permite cambiar password aquí; usar /cambiar-password.
router.patch('/:id', requireRol('administrador'), async (req, res, next) => {
  try {
    const id = idParam(req);
    const d = validarUsuario(req.body ?? {}, { esEdicion: true });
    delete d.password; // el cambio de contraseña va por su endpoint
    const campos = Object.keys(d);
    if (campos.length === 0) throw errores.validacion('No hay campos para actualizar');
    if (d.cliente_id) {
      const [c] = await pool.query('SELECT id FROM clientes WHERE id = ?', [d.cliente_id]);
      if (!c[0]) throw errores.noEncontrado('Cliente no encontrado');
    }
    const sets = campos.map((c) => `${c} = ?`).join(', ');
    await pool.query(`UPDATE usuarios SET ${sets} WHERE id = ?`, [...campos.map((c) => d[c]), id]);
    const [rows] = await pool.query(`SELECT ${SELECT_PUBLICO} FROM usuarios WHERE id = ?`, [id]);
    if (!rows[0]) throw errores.noEncontrado('Usuario no encontrado');
    logger.info('usuario actualizado', { por: req.usuario.nombre_usuario, usuario_id: id, campos });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// POST /api/usuarios/:id/cambiar-password
// Administrador puede cambiar la de cualquiera; un usuario solo la suya
// (debe enviar additionally password_actual para verificar identidad).
router.post('/:id/cambiar-password', async (req, res, next) => {
  try {
    const id = idParam(req);
    const esPropio = req.usuario.id === id;
    const esAdmin = req.usuario.rol === 'administrador';
    if (!esPropio && !esAdmin) throw errores.permisoDenegado();

    const { password, password_actual } = req.body ?? {};
    if (typeof password !== 'string' || password.length < 10 || password.length > 128) {
      throw errores.validacion('password debe tener entre 10 y 128 caracteres');
    }

    const [rows] = await pool.query('SELECT id, password_hash, activo FROM usuarios WHERE id = ?', [id]);
    const objetivo = rows[0];
    if (!objetivo) throw errores.noEncontrado('Usuario no encontrado');

    if (esPropio && !esAdmin) {
      if (typeof password_actual !== 'string' ||
          !(await verificarPassword(password_actual, objetivo.password_hash))) {
        throw errores.noAutenticado('La contraseña actual es incorrecta');
      }
    }
    if (!objetivo.activo) throw errores.estadoInvalido('La cuenta está desactivada');

    const hash = await hashPassword(password);
    await pool.query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [hash, id]);
    logger.info('contraseña cambiada', { por: req.usuario.nombre_usuario, usuario_id: id });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;

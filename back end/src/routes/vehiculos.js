import express from 'express';
import { pool } from '../db.js';
import { errores } from '../errors.js';
import { autenticar } from '../middleware/auth.js';
import { paginacion, paginadoResult, idParam } from '../utils/paginacion.js';
import { normalizarPlaca } from '../utils/placa.js';

const router = express.Router();
router.use(autenticar);

function validarVehiculo(body, parcial = false) {
  const out = {};
  const falta = (c) => { throw errores.validacion(`Campo obligatorio: ${c}`); };
  const texto = (c, max, obligatorio) => {
    if (body[c] === undefined) { if (obligatorio && !parcial) falta(c); return; }
    if (body[c] === null) { if (obligatorio) falta(c); out[c] = null; return; }
    if (typeof body[c] !== 'string') throw errores.validacion(`${c} debe ser texto`);
    const v = body[c].trim();
    if (v === '') { if (obligatorio) falta(c); out[c] = null; return; }
    if (v.length > max) throw errores.validacion(`${c} excede ${max} caracteres`);
    out[c] = v;
  };
  if (!parcial) {
    if (body.cliente_id === undefined) falta('cliente_id');
    texto('marca', 50, true);
    texto('modelo', 50, true);
  } else {
    texto('marca', 50, false);
    texto('modelo', 50, false);
  }
  texto('color', 30, false);
  if (body.cliente_id !== undefined) {
    const id = Number(body.cliente_id);
    if (!Number.isInteger(id) || id <= 0) throw errores.validacion('cliente_id inválido');
    out.cliente_id = id;
  }
  if (body.anio !== undefined && body.anio !== null) {
    const anio = Number(body.anio);
    if (!Number.isInteger(anio) || anio < 1950 || anio > 2100) {
      throw errores.validacion('anio fuera de rango (1950-2100)');
    }
    out.anio = anio;
  } else if (!parcial) {
    out.anio = null;
  }
  if (body.placa !== undefined) {
    const placa = normalizarPlaca(body.placa);
    if (!placa) throw errores.validacion('placa inválida: 2-10 caracteres alfanuméricos');
    out.placa = placa;
  } else if (!parcial) {
    falta('placa');
  }
  return out;
}

// GET /api/vehiculos?cliente_id=&placa=&pagina=&tamano=
router.get('/', async (req, res, next) => {
  try {
    const { pagina, tamano, offset } = paginacion(req);
    const where = [];
    const params = [];
    if (req.query.cliente_id) {
      const cid = Number(req.query.cliente_id);
      if (!Number.isInteger(cid) || cid <= 0) throw errores.validacion('cliente_id inválido');
      where.push('v.cliente_id = ?'); params.push(cid);
    }
    if (req.query.placa) {
      const placa = normalizarPlaca(String(req.query.placa));
      if (!placa) throw errores.validacion('placa inválida');
      where.push('v.placa = ?'); params.push(placa);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [rows] = await pool.query(
      `SELECT v.id, v.cliente_id, v.placa, v.marca, v.modelo, v.anio, v.color, v.creado_en,
              CONCAT(c.nombres, ' ', c.apellidos) AS cliente_nombre
       FROM vehiculos v JOIN clientes c ON c.id = v.cliente_id
       ${whereSql} ORDER BY v.placa LIMIT ? OFFSET ?`,
      [...params, tamano, offset],
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM vehiculos v ${whereSql}`, params);
    res.json(paginadoResult(total, rows, { pagina, tamano }));
  } catch (err) { next(err); }
});

// GET /api/vehiculos/:id
router.get('/:id', async (req, res, next) => {
  try {
    const id = idParam(req);
    const [rows] = await pool.query(
      `SELECT v.*, CONCAT(c.nombres, ' ', c.apellidos) AS cliente_nombre
       FROM vehiculos v JOIN clientes c ON c.id = v.cliente_id WHERE v.id = ?`, [id]);
    if (!rows[0]) throw errores.noEncontrado('Vehículo no encontrado');
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// POST /api/vehiculos
router.post('/', async (req, res, next) => {
  try {
    const d = validarVehiculo(req.body ?? {});
    const [cli] = await pool.query('SELECT id FROM clientes WHERE id = ?', [d.cliente_id]);
    if (!cli[0]) throw errores.noEncontrado('Cliente no encontrado');
    const [r] = await pool.query(
      `INSERT INTO vehiculos (cliente_id, placa, marca, modelo, anio, color)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [d.cliente_id, d.placa, d.marca, d.modelo, d.anio ?? null, d.color ?? null],
    );
    const [rows] = await pool.query('SELECT * FROM vehiculos WHERE id = ?', [r.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// PATCH /api/vehiculos/:id — incluye corrección de placa con auditoría.
router.patch('/:id', async (req, res, next) => {
  try {
    const id = idParam(req);
    const d = validarVehiculo(req.body ?? {}, true);
    const campos = Object.keys(d);
    if (campos.length === 0) throw errores.validacion('No hay campos para actualizar');

    if (d.cliente_id !== undefined) {
      const [cli] = await pool.query('SELECT id FROM clientes WHERE id = ?', [d.cliente_id]);
      if (!cli[0]) throw errores.noEncontrado('Cliente no encontrado');
    }
    if (d.placa !== undefined) {
      const [dup] = await pool.query('SELECT id FROM vehiculos WHERE placa = ? AND id <> ?', [d.placa, id]);
      if (dup[0]) throw errores.duplicado('La placa ya está registrada en otro vehículo', { placa: d.placa });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [antes] = await conn.query('SELECT placa FROM vehiculos WHERE id = ? FOR UPDATE', [id]);
      if (!antes[0]) throw errores.noEncontrado('Vehículo no encontrado');
      const placaAnterior = antes[0].placa;

      const sets = campos.map((c) => `${c} = ?`).join(', ');
      await conn.query(`UPDATE vehiculos SET ${sets} WHERE id = ?`, [...campos.map((c) => d[c]), id]);

      if (d.placa !== undefined && d.placa !== placaAnterior) {
        await conn.query(
          `INSERT INTO auditoria_operaciones (entidad, entidad_id, accion, usuario_id, detalle)
           VALUES ('vehiculo', ?, 'cambiar_placa', ?, ?)`,
          [id, req.usuario.id, JSON.stringify({ placa_anterior: placaAnterior, placa_nueva: d.placa })],
        );
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    const [rows] = await pool.query('SELECT * FROM vehiculos WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

export default router;
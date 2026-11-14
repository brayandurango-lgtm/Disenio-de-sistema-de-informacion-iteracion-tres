import express from 'express';
import { pool } from '../db.js';
import { errores } from '../errors.js';
import { autenticar } from '../middleware/auth.js';
import { paginacion, paginadoResult, idParam } from '../utils/paginacion.js';

const router = express.Router();
router.use(autenticar);

const TIPOS_DOC = ['CC', 'CE', 'PA', 'NIT', 'TI'];
const CAMPOS = ['nombres', 'apellidos', 'tipo_documento', 'numero_documento', 'telefono', 'correo', 'direccion'];
// El esquema define estos campos como NULL; omitirlos equivale a null.
const CAMPOS_OPCIONALES = ['telefono', 'correo', 'direccion'];

function validarBody(body, parcial = false) {
  const out = {};
  const falta = (c) => { throw errores.validacion(`Campo obligatorio: ${c}`); };
  for (const c of CAMPOS) {
    if (body[c] === undefined) {
      if (parcial) continue;
      if (CAMPOS_OPCIONALES.includes(c)) { out[c] = null; continue; }
      falta(c);
    }
    let v = body[c];
    if (v === null) { if (CAMPOS_OPCIONALES.includes(c)) { out[c] = null; continue; } falta(c); }
    if (typeof v !== 'string') throw errores.validacion(`${c} debe ser texto`);
    v = v.trim();
    if (v === '') { if (CAMPOS_OPCIONALES.includes(c)) { out[c] = null; continue; } falta(c); }
    const max = { nombres: 80, apellidos: 80, numero_documento: 20, telefono: 30, correo: 120, direccion: 160 }[c];
    if (max && v.length > max) throw errores.validacion(`${c} excede ${max} caracteres`);
    if (c === 'correo' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) {
      throw errores.validacion('correo con formato inválido');
    }
    out[c] = v;
  }
  if (body.tipo_documento !== undefined) {
    if (!TIPOS_DOC.includes(out.tipo_documento)) {
      throw errores.validacion(`tipo_documento debe ser uno de: ${TIPOS_DOC.join(', ')}`);
    }
  }
  return out;
}

// GET /api/clientes?q=&pagina=&tamano=
router.get('/', async (req, res, next) => {
  try {
    const { pagina, tamano, offset } = paginacion(req);
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    let where = '';
    const params = [];
    if (q) {
      where = 'WHERE (nombres LIKE ? OR apellidos LIKE ? OR numero_documento LIKE ? OR correo LIKE ?)';
      const like = `%${q}%`;
      params.push(like, like, like, like);
    }
    const [rows] = await pool.query(
      `SELECT id, nombres, apellidos, tipo_documento, numero_documento, telefono, correo, direccion, creado_en
       FROM clientes ${where} ORDER BY apellidos, nombres LIMIT ? OFFSET ?`,
      [...params, tamano, offset],
    );
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM clientes ${where}`, params);
    res.json(paginadoResult(total, rows, { pagina, tamano }));
  } catch (err) { next(err); }
});

// GET /api/clientes/:id
router.get('/:id', async (req, res, next) => {
  try {
    const id = idParam(req);
    const [rows] = await pool.query('SELECT * FROM clientes WHERE id = ?', [id]);
    if (!rows[0]) throw errores.noEncontrado('Cliente no encontrado');
    const [vehiculos] = await pool.query(
      'SELECT id, placa, marca, modelo, anio, color FROM vehiculos WHERE cliente_id = ? ORDER BY placa', [id]);
    const [contratos] = await pool.query(
      `SELECT c.id, c.vehiculo_id, c.tarifa_mensual, c.fecha_inicio, c.fecha_fin, c.estado
       FROM contratos_mensualidad c WHERE c.cliente_id = ? ORDER BY c.id`, [id]);
    res.json({ ...rows[0], vehiculos, contratos });
  } catch (err) { next(err); }
});

// POST /api/clientes
router.post('/', async (req, res, next) => {
  try {
    const datos = validarBody(req.body ?? {});
    const [r] = await pool.query(
      `INSERT INTO clientes (nombres, apellidos, tipo_documento, numero_documento, telefono, correo, direccion)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [datos.nombres, datos.apellidos, datos.tipo_documento ?? 'CC', datos.numero_documento,
       datos.telefono ?? null, datos.correo ?? null, datos.direccion ?? null],
    );
    const [rows] = await pool.query('SELECT * FROM clientes WHERE id = ?', [r.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// PATCH /api/clientes/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const id = idParam(req);
    const datos = validarBody(req.body ?? {}, true);
    const campos = Object.keys(datos);
    if (campos.length === 0) throw errores.validacion('No hay campos para actualizar');
    if (datos.tipo_documento !== undefined && !TIPOS_DOC.includes(datos.tipo_documento)) {
      throw errores.validacion(`tipo_documento debe ser uno de: ${TIPOS_DOC.join(', ')}`);
    }
    const sets = campos.map((c) => `${c} = ?`).join(', ');
    await pool.query(`UPDATE clientes SET ${sets} WHERE id = ?`, [...campos.map((c) => datos[c]), id]);
    const [rows] = await pool.query('SELECT * FROM clientes WHERE id = ?', [id]);
    if (!rows[0]) throw errores.noEncontrado('Cliente no encontrado');
    res.json(rows[0]);
  } catch (err) { next(err); }
});

export default router;

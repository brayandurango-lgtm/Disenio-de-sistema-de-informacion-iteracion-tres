import express from 'express';
import { conTransaccion, pool } from '../db.js';
import { errores } from '../errors.js';
import { autenticar, requireRol } from '../middleware/auth.js';
import { paginacion, paginadoResult, idParam } from '../utils/paginacion.js';
import { ocupacionDe } from './estancias.js';

const router = express.Router();
router.use(autenticar);

const TIPOS = ['cubierta', 'techada'];
const ESTADOS = ['habilitada', 'fuera_de_servicio'];

function validarCelda(body, parcial = false) {
  const out = {};
  const falta = (c) => { throw errores.validacion(`Campo obligatorio: ${c}`); };
  if (body.codigo !== undefined) {
    if (typeof body.codigo !== 'string') falta('codigo');
    const v = body.codigo.trim().toUpperCase();
    if (!/^[A-Z0-9-]{1,10}$/.test(v)) throw errores.validacion('codigo: 1-10 caracteres alfanuméricos o guion');
    out.codigo = v;
  } else if (!parcial) falta('codigo');
  if (body.tipo !== undefined) {
    if (!TIPOS.includes(body.tipo)) throw errores.validacion(`tipo debe ser uno de: ${TIPOS.join(', ')}`);
    out.tipo = body.tipo;
  } else if (!parcial) out.tipo = 'cubierta';
  if (body.estado !== undefined) {
    if (!ESTADOS.includes(body.estado)) throw errores.validacion(`estado debe ser uno de: ${ESTADOS.join(', ')}`);
    out.estado = body.estado;
  } else if (!parcial) out.estado = 'habilitada';
  return out;
}

// GET /api/celdas?estado=&ocupada=true|false&pagina=&tamano=
router.get('/', async (req, res, next) => {
  try {
    const { pagina, tamano, offset } = paginacion(req);
    const where = [];
    const params = [];
    if (req.query.estado) {
      if (!ESTADOS.includes(req.query.estado)) throw errores.validacion('estado inválido');
      where.push('c.estado = ?'); params.push(req.query.estado);
    }
    if (req.query.ocupada === 'true') {
      where.push('EXISTS (SELECT 1 FROM estancias e WHERE e.celda_ocupada_id = c.id)');
    } else if (req.query.ocupada === 'false') {
      where.push('NOT EXISTS (SELECT 1 FROM estancias e WHERE e.celda_ocupada_id = c.id)');
    } else if (req.query.ocupada !== undefined) {
      throw errores.validacion("ocupada debe ser 'true' o 'false'");
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [rows] = await pool.query(
      `SELECT c.id, c.codigo, c.tipo, c.estado, c.creado_en,
              e.id AS estancia_abierta_id, e.vehiculo_id AS vehiculo_ocupante_id, v.placa AS placa_ocupante
       FROM celdas c
       LEFT JOIN estancias e ON e.celda_ocupada_id = c.id
       LEFT JOIN vehiculos v ON v.id = e.vehiculo_id
       ${whereSql} ORDER BY c.codigo LIMIT ? OFFSET ?`,
      [...params, tamano, offset],
    );
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM celdas c ${whereSql}`, params);
    const datos = rows.map((r) => ({
      id: r.id, codigo: r.codigo, tipo: r.tipo, estado: r.estado, creado_en: r.creado_en,
      ocupada: r.estancia_abierta_id !== null,
      ocupacion: r.estancia_abierta_id === null ? null : {
        estancia_id: r.estancia_abierta_id,
        vehiculo_id: r.vehiculo_ocupante_id,
        placa: r.placa_ocupante,
      },
    }));
    res.json({ datos, paginacion: { pagina, tamano, total: Number(total), paginas: Math.max(1, Math.ceil(Number(total) / tamano)) } });
  } catch (err) { next(err); }
});

// GET /api/celdas/:id
router.get('/:id', async (req, res, next) => {
  try {
    const id = idParam(req);
    const [rows] = await pool.query('SELECT * FROM celdas WHERE id = ?', [id]);
    if (!rows[0]) throw errores.noEncontrado('Celda no encontrada');
    const ocupacion = await ocupacionDe(id);
    res.json({ ...rows[0], ocupada: ocupacion !== null, ocupacion });
  } catch (err) { next(err); }
});

// POST /api/celdas — solo administrador.
router.post('/', requireRol('administrador'), async (req, res, next) => {
  try {
    const d = validarCelda(req.body ?? {});
    const [r] = await pool.query('INSERT INTO celdas (codigo, tipo, estado) VALUES (?, ?, ?)',
      [d.codigo, d.tipo, d.estado]);
    const [rows] = await pool.query('SELECT * FROM celdas WHERE id = ?', [r.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// PATCH /api/celdas/:id — solo administrador. No se puede pasar a
// fuera_de_servicio una celda con estancia abierta.
router.patch('/:id', requireRol('administrador'), async (req, res, next) => {
  try {
    const id = idParam(req);
    const d = validarCelda(req.body ?? {}, true);
    const campos = Object.keys(d);
    if (campos.length === 0) throw errores.validacion('No hay campos para actualizar');

    await conTransaccion(async (conn) => {
      const [rows] = await conn.query('SELECT * FROM celdas WHERE id = ? FOR UPDATE', [id]);
      const celda = rows[0];
      if (!celda) throw errores.noEncontrado('Celda no encontrada');
      if (d.estado === 'fuera_de_servicio' && celda.estado === 'habilitada') {
        const [ocupada] = await conn.query(
          'SELECT id FROM estancias WHERE celda_ocupada_id = ? LIMIT 1', [id]);
        if (ocupada[0]) {
          throw errores.estadoInvalido('No se puede deshabilitar una celda con estancia abierta', { celda_id: id });
        }
      }
      const sets = campos.map((c) => `${c} = ?`).join(', ');
      await conn.query(`UPDATE celdas SET ${sets} WHERE id = ?`, [...campos.map((c) => d[c]), id]);
      await conn.query(
        `INSERT INTO auditoria_operaciones (entidad, entidad_id, accion, usuario_id, detalle)
         VALUES ('celda', ?, 'actualizar', ?, ?)`,
        [id, req.usuario.id, JSON.stringify(d)],
      );
    });

    const [rows] = await pool.query('SELECT * FROM celdas WHERE id = ?', [id]);
    const ocupacion = await ocupacionDe(id);
    res.json({ ...rows[0], ocupada: ocupacion !== null, ocupacion });
  } catch (err) { next(err); }
});

export default router;

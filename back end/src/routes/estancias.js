import express from 'express';
import { conTransaccion, pool } from '../db.js';
import { errores } from '../errors.js';
import { autenticar } from '../middleware/auth.js';
import { aHoraBogota, ahoraBogota } from '../utils/fechas.js';

const router = express.Router();
router.use(autenticar);

const RE_ESTADO = /^(abierta|cerrada)$/;

function serializarEstancia(e) {
  return {
    ...e,
    estado: e.fecha_hora_salida === null ? 'abierta' : 'cerrada',
  };
}

async function ocupacionDe(celdaId) {
  const [rows] = await pool.query(
    `SELECT e.id, e.vehiculo_id, v.placa, e.fecha_hora_entrada
     FROM estancias e JOIN vehiculos v ON v.id = e.vehiculo_id
     WHERE e.celda_ocupada_id = ?`, [celdaId]);
  return rows[0] ?? null;
}

// POST /api/estancias — registrar entrada.
// body: { vehiculo_id, celda_id, fecha_hora_entrada? (ISO, default ahora Bogotá) }
router.post('/', async (req, res, next) => {
  try {
    const { vehiculo_id, celda_id, fecha_hora_entrada } = req.body ?? {};
    const vid = Number(vehiculo_id);
    const cid = Number(celda_id);
    if (!Number.isInteger(vid) || vid <= 0) throw errores.validacion('vehiculo_id inválido');
    if (!Number.isInteger(cid) || cid <= 0) throw errores.validacion('celda_id inválido');

    let entrada;
    try {
      entrada = fecha_hora_entrada === undefined || fecha_hora_entrada === null
        ? ahoraBogota()
        : aHoraBogota(String(fecha_hora_entrada));
    } catch {
      throw errores.validacion('fecha_hora_entrada debe ser ISO 8601');
    }

    const estancia = await conTransaccion(async (conn) => {
      // Bloquea la fila del vehículo para serializar entradas simultáneas del
      // mismo vehículo; la UNIQUE de columna generada es la guarda final.
      const [veh] = await conn.query('SELECT id FROM vehiculos WHERE id = ? FOR UPDATE', [vid]);
      if (!veh[0]) throw errores.noEncontrado('Vehículo no encontrado');

      // Bloquea la celda: serializa la entrada con una deshabilitación
      // concurrente (celdas PATCH usa el mismo bloqueo de fila).
      const [celda] = await conn.query(
        'SELECT id, estado FROM celdas WHERE id = ? FOR UPDATE', [cid]);
      const c = celda[0];
      if (!c) throw errores.noEncontrado('Celda no encontrada');
      if (c.estado !== 'habilitada') {
        throw errores.celdaNoDisponible('La celda no está habilitada', { celda_id: cid, estado: c.estado });
      }
      const [ocupada] = await conn.query(
        'SELECT id FROM estancias WHERE celda_ocupada_id = ? LIMIT 1', [cid]);
      if (ocupada[0]) {
        throw errores.celdaNoDisponible('La celda está ocupada', { celda_id: cid });
      }

      try {
        const [r] = await conn.query(
          `INSERT INTO estancias (vehiculo_id, celda_id, usuario_registro_id, fecha_hora_entrada)
           VALUES (?, ?, ?, ?)`,
          [vid, cid, req.usuario.id, entrada],
        );
        const [rows] = await conn.query('SELECT * FROM estancias WHERE id = ?', [r.insertId]);
        await conn.query(
          `INSERT INTO auditoria_operaciones (entidad, entidad_id, accion, usuario_id, detalle)
           VALUES ('estancia', ?, 'entrada', ?, ?)`,
          [r.insertId, req.usuario.id, JSON.stringify({ vehiculo_id: vid, celda_id: cid })],
        );
        return serializarEstancia(rows[0]);
      } catch (err) {
        // Carrera: otro request insertó la estancia abierta primero.
        if (err.code === 'ER_DUP_ENTRY') {
          throw errores.conflictoConcurrencia('El vehículo o la celda ya tienen una estancia abierta; reintente');
        }
        throw err;
      }
    });

    res.status(201).json(estancia);
  } catch (err) { next(err); }
});

// GET /api/estancias?estado=abierta|cerrada&vehiculo_id=&celda_id=&pagina=&tamano=
router.get('/', async (req, res, next) => {
  try {
    const pagina = Math.max(1, parseInt(req.query.pagina ?? '1', 10) || 1);
    const tamano = Math.min(100, Math.max(1, parseInt(req.query.tamano ?? '20', 10) || 20));
    const offset = (pagina - 1) * tamano;
    const where = [];
    const params = [];
    if (req.query.estado && RE_ESTADO.test(req.query.estado)) {
      where.push(req.query.estado === 'abierta' ? 'e.fecha_hora_salida IS NULL' : 'e.fecha_hora_salida IS NOT NULL');
    } else if (req.query.estado) {
      throw errores.validacion("estado debe ser 'abierta' o 'cerrada'");
    }
    if (req.query.vehiculo_id) {
      const v = Number(req.query.vehiculo_id);
      if (!Number.isInteger(v) || v <= 0) throw errores.validacion('vehiculo_id inválido');
      where.push('e.vehiculo_id = ?'); params.push(v);
    }
    if (req.query.celda_id) {
      const c = Number(req.query.celda_id);
      if (!Number.isInteger(c) || c <= 0) throw errores.validacion('celda_id inválido');
      where.push('e.celda_id = ?'); params.push(c);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [rows] = await pool.query(
      `SELECT e.*, v.placa, cel.codigo AS celda_codigo
       FROM estancias e
       JOIN vehiculos v ON v.id = e.vehiculo_id
       JOIN celdas cel ON cel.id = e.celda_id
       ${whereSql} ORDER BY e.fecha_hora_entrada DESC, e.id DESC LIMIT ? OFFSET ?`,
      [...params, tamano, offset],
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM estancias e ${whereSql}`, params);
    res.json({
      datos: rows.map(serializarEstancia),
      paginacion: { pagina, tamano, total: Number(total), paginas: Math.max(1, Math.ceil(Number(total) / tamano)) },
    });
  } catch (err) { next(err); }
});

// GET /api/estancias/:id
router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) throw errores.validacion('id inválido');
    const [rows] = await pool.query(
      `SELECT e.*, v.placa, cel.codigo AS celda_codigo
       FROM estancias e JOIN vehiculos v ON v.id = e.vehiculo_id
       JOIN celdas cel ON cel.id = e.celda_id WHERE e.id = ?`, [id]);
    if (!rows[0]) throw errores.noEncontrado('Estancia no encontrada');
    res.json(serializarEstancia(rows[0]));
  } catch (err) { next(err); }
});

// POST /api/estancias/:id/salida — cierra la estancia y libera la celda.
// body: { fecha_hora_salida?, motivo_salida? }
router.post('/:id/salida', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) throw errores.validacion('id inválido');
    const { fecha_hora_salida, motivo_salida } = req.body ?? {};

    let salida;
    if (fecha_hora_salida === undefined || fecha_hora_salida === null) {
      salida = ahoraBogota();
    } else {
      try { salida = aHoraBogota(String(fecha_hora_salida)); }
      catch { throw errores.validacion('fecha_hora_salida debe ser ISO 8601'); }
    }
    if (motivo_salida !== undefined && motivo_salida !== null &&
        (typeof motivo_salida !== 'string' || motivo_salida.length > 200)) {
      throw errores.validacion('motivo_salida máximo 200 caracteres');
    }

    const estancia = await conTransaccion(async (conn) => {
      const [rows] = await conn.query('SELECT * FROM estancias WHERE id = ? FOR UPDATE', [id]);
      const e = rows[0];
      if (!e) throw errores.noEncontrado('Estancia no encontrada');
      if (e.fecha_hora_salida !== null) {
        throw errores.estadoInvalido('La estancia ya está cerrada');
      }
      if (salida < e.fecha_hora_entrada) {
        throw errores.validacion('fecha_hora_salida no puede ser anterior a la entrada');
      }
      await conn.query(
        'UPDATE estancias SET fecha_hora_salida = ?, motivo_salida = ? WHERE id = ?',
        [salida, motivo_salida ?? null, id],
      );
      const [despues] = await conn.query(
        `SELECT e.*, v.placa, cel.codigo AS celda_codigo
         FROM estancias e JOIN vehiculos v ON v.id = e.vehiculo_id
         JOIN celdas cel ON cel.id = e.celda_id WHERE e.id = ?`, [id]);
      await conn.query(
        `INSERT INTO auditoria_operaciones (entidad, entidad_id, accion, usuario_id, detalle)
         VALUES ('estancia', ?, 'salida', ?, ?)`,
        [id, req.usuario.id, JSON.stringify({ fecha_hora_salida: salida })],
      );
      return serializarEstancia(despues[0]);
    });

    res.json(estancia);
  } catch (err) { next(err); }
});

export { ocupacionDe };
export default router;

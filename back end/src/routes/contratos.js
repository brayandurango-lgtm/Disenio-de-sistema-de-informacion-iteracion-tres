import express from 'express';
import { conTransaccion, pool } from '../db.js';
import { errores } from '../errors.js';
import { autenticar } from '../middleware/auth.js';
import { paginacion, paginadoResult, idParam } from '../utils/paginacion.js';
import { aDecimalStr } from '../utils/dinero.js';
import { exigirFecha, periodosDeVigencia, periodosEntre, esPeriodoValido, exigirPeriodo } from '../utils/periodos.js';
import { sumarMeses, hoyBogota } from '../utils/fechas.js';

const router = express.Router();
router.use(autenticar);

const SELECT_C = `SELECT c.*, v.placa, CONCAT(cli.nombres, ' ', cli.apellidos) AS cliente_nombre
  FROM contratos_mensualidad c
  JOIN vehiculos v ON v.id = c.vehiculo_id
  JOIN clientes cli ON cli.id = c.cliente_id`;

const ESTADOS = ['activo', 'finalizado', 'cancelado'];

async function verificarSolape(conn, vehiculoId, fechaInicio, fechaFin, excluirId = null) {
  // fecha_fin NULL del contrato existente = vigente indefinidamente.
  // fecha_fin NULL del nuevo = se trata como '9999-12-31' para la comparación.
  let sql = `SELECT c.id FROM contratos_mensualidad c
         WHERE c.vehiculo_id = ? AND c.estado <> 'cancelado'
           AND (c.fecha_fin IS NULL OR c.fecha_fin >= ?)
           AND (? IS NULL OR ? >= c.fecha_inicio)`;
  const args = [vehiculoId, fechaInicio, fechaFin, fechaFin, fechaInicio];
  if (excluirId) { sql += ' AND c.id <> ?'; args.push(excluirId); }
  const [rows] = await conn.query(sql, args);
  if (rows[0]) {
    throw errores.estadoInvalido('El vehículo ya tiene un contrato vigente en ese periodo', { contrato_conflictivo: rows[0].id });
  }
}

function validarBodyContrato(body, parcial = false) {
  const out = {};
  const falta = (c) => { throw errores.validacion(`Campo obligatorio: ${c}`); };
  if (body.vehiculo_id !== undefined || !parcial) {
    const v = Number(body.vehiculo_id);
    if (!Number.isInteger(v) || v <= 0) falta('vehiculo_id');
    out.vehiculo_id = v;
  }
  if (body.cliente_id !== undefined || !parcial) {
    const c = Number(body.cliente_id);
    if (!Number.isInteger(c) || c <= 0) falta('cliente_id');
    out.cliente_id = c;
  }
  if (body.tarifa_mensual !== undefined || !parcial) {
    out.tarifa_mensual = aDecimalStr(body.tarifa_mensual, 'tarifa_mensual');
  }
  if (body.fecha_inicio !== undefined || !parcial) {
    out.fecha_inicio = exigirFecha(body.fecha_inicio, 'fecha_inicio');
  }
  if (body.fecha_fin !== undefined) {
    out.fecha_fin = body.fecha_fin === null ? null : exigirFecha(body.fecha_fin, 'fecha_fin');
  } else if (!parcial) {
    out.fecha_fin = null;
  }
  if (body.estado !== undefined) {
    if (!ESTADOS.includes(body.estado)) throw errores.validacion(`estado debe ser uno de: ${ESTADOS.join(', ')}`);
    out.estado = body.estado;
  }
  return out;
}

// GET /api/contratos?cliente_id=&vehiculo_id=&estado=
router.get('/', async (req, res, next) => {
  try {
    const { pagina, tamano, offset } = paginacion(req);
    const where = [];
    const params = [];
    for (const [campo, col] of [['cliente_id', 'c.cliente_id'], ['vehiculo_id', 'c.vehiculo_id']]) {
      if (req.query[campo]) {
        const v = Number(req.query[campo]);
        if (!Number.isInteger(v) || v <= 0) throw errores.validacion(`${campo} inválido`);
        where.push(`${col} = ?`); params.push(v);
      }
    }
    if (req.query.estado) {
      if (!ESTADOS.includes(req.query.estado)) throw errores.validacion('estado inválido');
      where.push('c.estado = ?'); params.push(req.query.estado);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [rows] = await pool.query(
      `${SELECT_C} ${whereSql} ORDER BY c.id DESC LIMIT ? OFFSET ?`, [...params, tamano, offset]);
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM contratos_mensualidad c ${whereSql}`, params);
    res.json({ datos: rows, paginacion: { pagina, tamano, total: Number(total), paginas: Math.max(1, Math.ceil(Number(total) / tamano)) } });
  } catch (err) { next(err); }
});

// GET /api/contratos/:id — detalle + obligaciones.
router.get('/:id', async (req, res, next) => {
  try {
    const id = idParam(req);
    const [rows] = await pool.query(`${SELECT_C} WHERE c.id = ?`, [id]);
    if (!rows[0]) throw errores.noEncontrado('Contrato no encontrado');
    const [obligaciones] = await pool.query(
      `SELECT o.*, CASE WHEN o.estado = 'pagada' THEN 'pagada'
                        WHEN o.fecha_vencimiento < ? THEN 'vencida' ELSE 'pendiente' END AS estado_efectivo
       FROM obligaciones_pago o WHERE o.contrato_id = ? ORDER BY o.periodo`,
      [hoyBogota(), id]);
    res.json({ ...rows[0], obligaciones });
  } catch (err) { next(err); }
});

// POST /api/contratos
router.post('/', async (req, res, next) => {
  try {
    const d = validarBodyContrato(req.body ?? {});
    periodosDeVigencia(d.fecha_inicio, d.fecha_fin); // valida día 1 / fin de mes
    const contrato = await conTransaccion(async (conn) => {
      // Bloqueo de la fila del vehículo: serializa creaciones simultáneas de
      // contratos del mismo vehículo para la verificación de solapes.
      const [v] = await conn.query('SELECT id FROM vehiculos WHERE id = ? FOR UPDATE', [d.vehiculo_id]);
      if (!v[0]) throw errores.noEncontrado('Vehículo no encontrado');
      const [c] = await conn.query('SELECT id FROM clientes WHERE id = ?', [d.cliente_id]);
      if (!c[0]) throw errores.noEncontrado('Cliente no encontrado');
      await verificarSolape(conn, d.vehiculo_id, d.fecha_inicio, d.fecha_fin);
      const [r] = await conn.query(
        `INSERT INTO contratos_mensualidad (vehiculo_id, cliente_id, tarifa_mensual, fecha_inicio, fecha_fin, estado)
         VALUES (?, ?, ?, ?, ?, 'activo')`,
        [d.vehiculo_id, d.cliente_id, d.tarifa_mensual, d.fecha_inicio, d.fecha_fin],
      );
      const [rows] = await conn.query(`${SELECT_C} WHERE c.id = ?`, [r.insertId]);
      await conn.query(
        `INSERT INTO auditoria_operaciones (entidad, entidad_id, accion, usuario_id, detalle)
         VALUES ('contrato', ?, 'crear', ?, ?)`,
        [r.insertId, req.usuario.id, JSON.stringify({ vehiculo_id: d.vehiculo_id, cliente_id: d.cliente_id })],
      );
      return rows[0];
    });
    res.status(201).json(contrato);
  } catch (err) { next(err); }
});

// PATCH /api/contratos/:id — tarifa, fecha_fin, estado. No se edita
// vehículo/cliente ni fecha_inicio (integridad del historial).
router.patch('/:id', async (req, res, next) => {
  try {
    const id = idParam(req);
    const body = req.body ?? {};
    const permitidos = ['tarifa_mensual', 'fecha_fin', 'estado'];
    const extra = Object.keys(body).filter((k) => !permitidos.includes(k));
    if (extra.length) throw errores.validacion(`Campos no editables: ${extra.join(', ')}`);
    const d = validarBodyContrato({ ...body }, true);
    const campos = Object.keys(d).filter((k) => permitidos.includes(k));
    if (campos.length === 0) throw errores.validacion('No hay campos para actualizar');

    const contrato = await conTransaccion(async (conn) => {
      // Mismo orden de bloqueo que la creación (vehículo → contrato): una
      // edición concurrente de otro contrato del mismo vehículo no puede
      // introducir solapes.
      const [pre] = await conn.query(
        'SELECT vehiculo_id FROM contratos_mensualidad WHERE id = ?', [id]);
      if (!pre[0]) throw errores.noEncontrado('Contrato no encontrado');
      await conn.query('SELECT id FROM vehiculos WHERE id = ? FOR UPDATE', [pre[0].vehiculo_id]);
      const [rows] = await conn.query('SELECT * FROM contratos_mensualidad WHERE id = ? FOR UPDATE', [id]);
      const actual = rows[0];
      if (!actual) throw errores.noEncontrado('Contrato no encontrado');

      const nuevoInicio = actual.fecha_inicio;
      const nuevoFin = d.fecha_fin !== undefined ? d.fecha_fin : actual.fecha_fin;
      const nuevoEstado = d.estado ?? actual.estado;
      periodosDeVigencia(nuevoInicio, nuevoFin);
      if (nuevoEstado !== 'cancelado') {
        await verificarSolape(conn, actual.vehiculo_id, nuevoInicio, nuevoFin, id);
      }
      const sets = campos.map((c) => `${c} = ?`).join(', ');
      await conn.query(
        `UPDATE contratos_mensualidad SET ${sets} WHERE id = ?`,
        [...campos.map((c) => d[c]), id],
      );
      const [despues] = await conn.query(`${SELECT_C} WHERE c.id = ?`, [id]);
      await conn.query(
        `INSERT INTO auditoria_operaciones (entidad, entidad_id, accion, usuario_id, detalle)
         VALUES ('contrato', ?, 'actualizar', ?, ?)`,
        [id, req.usuario.id, JSON.stringify(d)],
      );
      return despues[0];
    });
    res.json(contrato);
  } catch (err) { next(err); }
});

// POST /api/contratos/:id/obligaciones/generar — generación explícita.
// body: {
//   periodos?: ['YYYY-MM', ...]              // lista explícita, o
//   desde?: 'YYYY-MM', hasta?: 'YYYY-MM',    // rango inclusivo
//   dia_vencimiento: 1..28,                  // OBLIGATORIO: vencimiento = ese día
//                                            // del mes siguiente al periodo
//   vencimientos?: { 'YYYY-MM': 'AAAA-MM-DD' } // overrides puntuales
// }
// Idempotente: UNIQUE(contrato_id, periodo) hace que reintentos devuelvan las
// obligaciones ya existentes sin duplicar ni fallar.
router.post('/:id/obligaciones/generar', async (req, res, next) => {
  try {
    const contratoId = idParam(req);
    const body = req.body ?? {};

    const diaVenc = Number(body.dia_vencimiento);
    if (!Number.isInteger(diaVenc) || diaVenc < 1 || diaVenc > 28) {
      throw errores.validacion('dia_vencimiento es obligatorio (entero 1-28): día de corte del mes siguiente');
    }

    let periodosPedido;
    if (Array.isArray(body.periodos) && body.periodos.length > 0) {
      periodosPedido = body.periodos.map((p) => exigirPeriodo(p, 'periodos[]'));
    } else if (body.desde || body.hasta) {
      const desde = exigirPeriodo(body.desde, 'desde');
      const hasta = exigirPeriodo(body.hasta ?? body.desde, 'hasta');
      if (hasta < desde) throw errores.validacion('hasta no puede ser anterior a desde');
      periodosPedido = periodosEntre(desde, hasta);
    } else {
      throw errores.validacion('Indique "periodos" o el rango "desde"/"hasta"');
    }
    periodosPedido = [...new Set(periodosPedido)].sort();
    if (periodosPedido.length === 0 || periodosPedido.length > 240) {
      throw errores.validacion('Cantidad de periodos inválida (1-240)');
    }

    const vencimientos = {};
    if (body.vencimientos !== undefined) {
      if (typeof body.vencimientos !== 'object' || body.vencimientos === null || Array.isArray(body.vencimientos)) {
        throw errores.validacion('vencimientos debe ser un objeto { "YYYY-MM": "AAAA-MM-DD" }');
      }
      for (const [p, f] of Object.entries(body.vencimientos)) {
        if (!esPeriodoValido(p)) throw errores.validacion(`vencimientos: periodo inválido '${p}'`);
        vencimientos[p] = exigirFecha(f, `vencimientos.${p}`);
      }
    }

    const resultado = await conTransaccion(async (conn) => {
      const [cRows] = await conn.query(
        'SELECT * FROM contratos_mensualidad WHERE id = ? FOR UPDATE', [contratoId]);
      const contrato = cRows[0];
      if (!contrato) throw errores.noEncontrado('Contrato no encontrado');
      if (contrato.estado === 'cancelado') {
        throw errores.estadoInvalido('No se pueden generar obligaciones de un contrato cancelado');
      }
      const { pInicio, pFin } = periodosDeVigencia(contrato.fecha_inicio, contrato.fecha_fin);
      const fuera = periodosPedido.filter((p) => p < pInicio || p > pFin);
      if (fuera.length) {
        throw errores.validacion(
          `Los periodos ${fuera.join(', ')} están fuera de la vigencia del contrato (${pInicio} a ${pFin === '9999-12' ? 'indefinida' : pFin})`,
          { fuera_de_vigencia: fuera },
        );
      }

      const [existentesRows] = await conn.query(
        'SELECT periodo FROM obligaciones_pago WHERE contrato_id = ?', [contratoId]);
      const existentes = new Set(existentesRows.map((r) => r.periodo));

      const generadas = [];
      let omitidas = 0;
      for (const p of periodosPedido) {
        if (existentes.has(p)) { omitidas += 1; continue; }
        const venc = vencimientos[p]
          ?? `${sumarMeses(p, 1)}-${String(diaVenc).padStart(2, '0')}`;
        try {
          const [r] = await conn.query(
            `INSERT INTO obligaciones_pago (contrato_id, periodo, importe, fecha_vencimiento, estado)
             VALUES (?, ?, ?, ?, 'pendiente')`,
            [contratoId, p, contrato.tarifa_mensual, venc],
          );
          generadas.push({ id: r.insertId, contrato_id: contratoId, periodo: p, importe: contrato.tarifa_mensual, fecha_vencimiento: venc, estado: 'pendiente' });
        } catch (err) {
          if (err.code === 'ER_DUP_ENTRY') { omitidas += 1; continue; } // carrera concurrente
          throw err;
        }
      }
      if (generadas.length) {
        await conn.query(
          `INSERT INTO auditoria_operaciones (entidad, entidad_id, accion, usuario_id, detalle)
           VALUES ('contrato', ?, 'generar_obligaciones', ?, ?)`,
          [contratoId, req.usuario.id, JSON.stringify({ periodos: generadas.map((g) => g.periodo), dia_vencimiento: diaVenc })],
        );
      }
      const [todas] = await conn.query(
        `SELECT id, contrato_id, periodo, importe, fecha_vencimiento, estado, creado_en
         FROM obligaciones_pago WHERE contrato_id = ? ORDER BY periodo`, [contratoId]);
      return { generadas: generadas.length, omitidas, obligaciones: todas };
    });

    res.status(201).json(resultado);
  } catch (err) { next(err); }
});

export default router;

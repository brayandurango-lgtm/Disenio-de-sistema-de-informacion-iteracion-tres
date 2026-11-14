import { randomUUID } from 'node:crypto';
import express from 'express';
import { conTransaccion, pool } from '../db.js';
import { errores } from '../errors.js';
import { autenticar, requireRol } from '../middleware/auth.js';
import { paginacion, paginadoResult, idParam } from '../utils/paginacion.js';
import { aHoraBogota, ahoraBogota } from '../utils/fechas.js';
import { logger } from '../logger.js';

const router = express.Router();
router.use(autenticar);

const METODOS = ['efectivo', 'transferencia'];
const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SELECT_PAGO = `SELECT p.*, o.periodo AS obligacion_periodo, o.contrato_id,
        c.vehiculo_id, v.placa, cli.id AS cliente_id,
        CONCAT(cli.nombres, ' ', cli.apellidos) AS cliente_nombre
     FROM pagos p
     JOIN obligaciones_pago o ON o.id = p.obligacion_id
     JOIN contratos_mensualidad c ON c.id = o.contrato_id
     JOIN vehiculos v ON v.id = c.vehiculo_id
     JOIN clientes cli ON cli.id = c.cliente_id`;

function serializarPago(p) {
  const { obligacion_periodo, ...resto } = p;
  return { ...resto, obligacion: { periodo: obligacion_periodo } };
}

// Consecutivo interno 'CMP-AAAA-NNNNNN' por año de la fecha del pago.
// Usa la tabla secuencias_comprobante con bloqueo de fila dentro de la
// transacción (INSERT ... ON DUPLICATE KEY UPDATE): sin MAX()+1.
async function siguienteComprobante(conn, anio) {
  await conn.query(
    `INSERT INTO secuencias_comprobante (anio, ultimo) VALUES (?, 1)
     ON DUPLICATE KEY UPDATE ultimo = ultimo + 1`,
    [anio],
  );
  const [rows] = await conn.query(
    'SELECT ultimo FROM secuencias_comprobante WHERE anio = ? FOR UPDATE', [anio]);
  const n = rows[0].ultimo;
  return `CMP-${anio}-${String(n).padStart(6, '0')}`;
}

// POST /api/pagos — registra el pago completo de una obligación.
// body: { obligacion_id, metodo_pago, clave_idempotencia (UUID v4 del cliente),
//         fecha_hora? (ISO), monto? (debe coincidir con la obligación) }
// Idempotente por clave_idempotencia. Una sola obligación → un solo pago válido.
router.post('/', async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const obligacionId = Number(body.obligacion_id);
    if (!Number.isInteger(obligacionId) || obligacionId <= 0) {
      throw errores.validacion('obligacion_id inválido');
    }
    if (!METODOS.includes(body.metodo_pago)) {
      throw errores.validacion(`metodo_pago debe ser uno de: ${METODOS.join(', ')}`);
    }
    if (typeof body.clave_idempotencia !== 'string' || !RE_UUID.test(body.clave_idempotencia)) {
      throw errores.validacion('clave_idempotencia obligatoria: UUID generado por el cliente por intento');
    }
    const clave = body.clave_idempotencia.toLowerCase();

    let fechaHora;
    if (body.fecha_hora === undefined || body.fecha_hora === null) {
      fechaHora = ahoraBogota();
    } else {
      try { fechaHora = aHoraBogota(String(body.fecha_hora)); }
      catch { throw errores.validacion('fecha_hora debe ser ISO 8601'); }
      // Rechaza fechas claramente futuras (tolerancia 5 minutos de reloj).
      const diff = new Date(`${fechaHora.replace(' ', 'T')}-05:00`).getTime() - Date.now();
      if (diff > 5 * 60 * 1000) throw errores.validacion('fecha_hora no puede estar en el futuro');
    }

    const resultado = await conTransaccion(async (conn) => {
      // 1) Bloqueo de la obligación: serializa pagos concurrentes de la misma
      //    obligación y coordina con la anulación (mismo orden de bloqueo).
      const [oRows] = await conn.query(
        'SELECT * FROM obligaciones_pago WHERE id = ? FOR UPDATE', [obligacionId]);
      const obligacion = oRows[0];
      if (!obligacion) throw errores.noEncontrado('Obligación no encontrada');

      // 2) Idempotencia: si la clave ya existe, comparar datos relevantes.
      const [dup] = await conn.query('SELECT * FROM pagos WHERE clave_idempotencia = ?', [clave]);
      if (dup[0]) {
        const p = dup[0];
        const equivalente =
          Number(p.obligacion_id) === obligacionId &&
          p.metodo_pago === body.metodo_pago &&
          String(p.monto) === String(obligacion.importe);
        if (!equivalente) {
          throw errores.idempotenciaConflicto('La clave_idempotencia ya fue usada con datos diferentes', {
            pago_existente: p.id,
          });
        }
        const [full] = await conn.query(`${SELECT_PAGO} WHERE p.id = ?`, [p.id]);
        return { pago: serializarPago(full[0]), idempotente: true };
      }

      // 3) La obligación debe estar pendiente de pago.
      if (obligacion.estado !== 'pendiente') {
        const [vigente] = await conn.query(
          'SELECT id FROM pagos WHERE obligacion_valida_id = ?', [obligacionId]);
        throw errores.pagoYaPagada('La obligación ya tiene un pago registrado', {
          pago_existente: vigente[0]?.id ?? null,
        });
      }

      // 4) Monto: lo fija el servidor desde la obligación (fuente de verdad).
      //    Si el cliente envía 'monto' debe coincidir.
      if (body.monto !== undefined && body.monto !== null) {
        const enviado = String(body.monto).trim();
        if (enviado !== String(obligacion.importe)) {
          throw errores.validacion('El monto no coincide con el importe de la obligación', {
            importe_obligacion: obligacion.importe,
          });
        }
      }

      // 5) Comprobante interno: consecutivo por año, con bloqueo de fila.
      const anio = fechaHora.slice(0, 4);
      const comprobante = await siguienteComprobante(conn, Number(anio));
      const identificador = randomUUID();

      let pagoId;
      try {
        const [r] = await conn.query(
          `INSERT INTO pagos (identificador, comprobante, obligacion_id, metodo_pago, monto,
                              moneda, fecha_hora, usuario_registro_id, clave_idempotencia, estado)
           VALUES (?, ?, ?, ?, ?, 'COP', ?, ?, ?, 'confirmado')`,
          [identificador, comprobante, obligacionId, body.metodo_pago,
           obligacion.importe, fechaHora, req.usuario.id, clave],
        );
        pagoId = r.insertId;
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          // Carrera sobre la misma clave de idempotencia: devolver el existente
          // si es equivalente; si no, conflicto de idempotencia.
          const [otro] = await conn.query('SELECT * FROM pagos WHERE clave_idempotencia = ?', [clave]);
          if (otro[0]) {
            if (Number(otro[0].obligacion_id) === obligacionId &&
                otro[0].metodo_pago === body.metodo_pago) {
              const [full] = await conn.query(`${SELECT_PAGO} WHERE p.id = ?`, [otro[0].id]);
              return { pago: serializarPago(full[0]), idempotente: true };
            }
            throw errores.idempotenciaConflicto('La clave_idempotencia ya fue usada con datos diferentes', {
              pago_existente: otro[0].id,
            });
          }
          // Dup sobre obligacion_valida_id u otro UNIQUE: la obligación ya fue
          // cubierta por otro pago concurrente.
          throw errores.pagoYaPagada('La obligación ya tiene un pago registrado', {
            obligacion_id: obligacionId,
          });
        }
        throw err;
      }

      // 6) La obligación pasa a 'pagada' dentro de la misma transacción.
      await conn.query(
        `UPDATE obligaciones_pago SET estado = 'pagada' WHERE id = ? AND estado = 'pendiente'`,
        [obligacionId],
      );
      await conn.query(
        `INSERT INTO auditoria_operaciones (entidad, entidad_id, accion, usuario_id, detalle)
         VALUES ('pago', ?, 'registrar', ?, ?)`,
        [pagoId, req.usuario.id, JSON.stringify({ obligacion_id: obligacionId, comprobante, metodo_pago: body.metodo_pago })],
      );
      await conn.query(
        `INSERT INTO auditoria_operaciones (entidad, entidad_id, accion, usuario_id, detalle)
         VALUES ('obligacion', ?, 'pagar', ?, ?)`,
        [obligacionId, req.usuario.id, JSON.stringify({ pago_id: pagoId, comprobante })],
      );

      const [full] = await conn.query(`${SELECT_PAGO} WHERE p.id = ?`, [pagoId]);
      return { pago: serializarPago(full[0]), idempotente: false };
    });

    if (resultado.idempotente) {
      logger.info('pago idempotente devuelto', { pago_id: resultado.pago.id });
      return res.status(200).json(resultado.pago);
    }
    logger.info('pago registrado', { pago_id: resultado.pago.id, comprobante: resultado.pago.comprobante, por: req.usuario.nombre_usuario });
    res.status(201).json(resultado.pago);
  } catch (err) { next(err); }
});

// GET /api/pagos?obligacion_id=&contrato_id=&cliente_id=&desde=&hasta=&estado=&pagina=&tamano=
router.get('/', async (req, res, next) => {
  try {
    const { pagina, tamano, offset } = paginacion(req);
    const where = [];
    const params = [];
    const num = (campo) => {
      const v = Number(req.query[campo]);
      if (!Number.isInteger(v) || v <= 0) throw errores.validacion(`${campo} inválido`);
      return v;
    };
    if (req.query.obligacion_id) { where.push('p.obligacion_id = ?'); params.push(num('obligacion_id')); }
    if (req.query.contrato_id) { where.push('o.contrato_id = ?'); params.push(num('contrato_id')); }
    if (req.query.cliente_id) { where.push('cli.id = ?'); params.push(num('cliente_id')); }
    if (req.query.desde) {
      try { params.push(aHoraBogota(String(req.query.desde))); }
      catch { throw errores.validacion('desde debe ser ISO 8601'); }
      where.push('p.fecha_hora >= ?');
    }
    if (req.query.hasta) {
      try { params.push(aHoraBogota(String(req.query.hasta))); }
      catch { throw errores.validacion('hasta debe ser ISO 8601'); }
      where.push('p.fecha_hora <= ?');
    }
    if (req.query.estado) {
      if (!['confirmado', 'anulado'].includes(req.query.estado)) {
        throw errores.validacion("estado debe ser 'confirmado' o 'anulado'");
      }
      where.push('p.estado = ?'); params.push(req.query.estado);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [rows] = await pool.query(
      `${SELECT_PAGO} ${whereSql} ORDER BY p.id DESC LIMIT ? OFFSET ?`, [...params, tamano, offset]);
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM pagos p
       JOIN obligaciones_pago o ON o.id = p.obligacion_id
       JOIN contratos_mensualidad c ON c.id = o.contrato_id
       JOIN vehiculos v ON v.id = c.vehiculo_id
       JOIN clientes cli ON cli.id = c.cliente_id ${whereSql}`, params);
    res.json({
      datos: rows.map(serializarPago),
      paginacion: { pagina, tamano, total: Number(total), paginas: Math.max(1, Math.ceil(Number(total) / tamano)) },
    });
  } catch (err) { next(err); }
});

// GET /api/pagos/:id — detalle + comprobante.
router.get('/:id', async (req, res, next) => {
  try {
    const id = idParam(req);
    const [rows] = await pool.query(`${SELECT_PAGO} WHERE p.id = ?`, [id]);
    if (!rows[0]) throw errores.noEncontrado('Pago no encontrado');
    res.json(serializarPago(rows[0]));
  } catch (err) { next(err); }
});

// POST /api/pagos/:id/anular — solo administrador. Ajuste de registro:
// no ejecuta devoluciones. La obligación vuelve a 'pendiente' (la guarda
// obligacion_valida_id garantiza que no queda otro pago confirmado).
router.post('/:id/anular', requireRol('administrador'), async (req, res, next) => {
  try {
    const id = idParam(req);
    const motivo = req.body?.motivo;
    if (typeof motivo !== 'string' || motivo.trim() === '' || motivo.trim().length > 300) {
      throw errores.validacion('motivo obligatorio (máx. 300 caracteres)');
    }

    const pago = await conTransaccion(async (conn) => {
      // Mismo orden de bloqueo que el registro de pago: primero la obligación.
      const [pRows] = await conn.query('SELECT * FROM pagos WHERE id = ?', [id]);
      const p = pRows[0];
      if (!p) throw errores.noEncontrado('Pago no encontrado');
      await conn.query('SELECT id FROM obligaciones_pago WHERE id = ? FOR UPDATE', [p.obligacion_id]);
      const [bloqueado] = await conn.query('SELECT * FROM pagos WHERE id = ? FOR UPDATE', [id]);
      const pagoActual = bloqueado[0];
      if (pagoActual.estado !== 'confirmado') {
        throw errores.estadoInvalido('El pago ya está anulado');
      }
      const anuladoEn = ahoraBogota();
      await conn.query(
        `UPDATE pagos SET estado = 'anulado', motivo_anulacion = ?, anulado_por_id = ?, anulado_en = ?
         WHERE id = ?`,
        [motivo.trim(), req.usuario.id, anuladoEn, id],
      );
      // Vuelve a pendiente (no puede quedar otra confirmada por la UNIQUE).
      await conn.query(
        `UPDATE obligaciones_pago SET estado = 'pendiente' WHERE id = ? AND estado = 'pagada'`,
        [p.obligacion_id],
      );
      await conn.query(
        `INSERT INTO auditoria_operaciones (entidad, entidad_id, accion, usuario_id, detalle)
         VALUES ('pago', ?, 'anular', ?, ?)`,
        [id, req.usuario.id, JSON.stringify({ motivo: motivo.trim(), obligacion_id: p.obligacion_id })],
      );
      const [full] = await conn.query(`${SELECT_PAGO} WHERE p.id = ?`, [id]);
      return serializarPago(full[0]);
    });

    logger.info('pago anulado', { pago_id: id, por: req.usuario.nombre_usuario });
    res.json(pago);
  } catch (err) { next(err); }
});

// GET /api/pagos/:id/comprobante — alias de detalle (el comprobante ya viaja
// en el detalle). Se mantiene por claridad del contrato.
router.get('/:id/comprobante', async (req, res, next) => {
  try {
    const id = idParam(req);
    const [rows] = await pool.query(
      `SELECT p.id, p.comprobante, p.identificador, p.monto, p.moneda, p.metodo_pago,
              p.fecha_hora, p.estado, p.creado_en
       FROM pagos p WHERE p.id = ?`, [id]);
    if (!rows[0]) throw errores.noEncontrado('Pago no encontrado');
    res.json(rows[0]);
  } catch (err) { next(err); }
});

export default router;

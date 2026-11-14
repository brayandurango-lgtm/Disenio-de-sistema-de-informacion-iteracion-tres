import express from 'express';
import { conTransaccion, pool } from '../db.js';
import { errores } from '../errors.js';
import { autenticar } from '../middleware/auth.js';
import { idParam } from '../utils/paginacion.js';
import { hoyBogota } from '../utils/fechas.js';
import {
  esPeriodoValido, exigirPeriodo, exigirFecha,
  periodosDeVigencia, periodosEntre,
} from '../utils/periodos.js';

const router = express.Router();
router.use(autenticar);

const ESTADOS_OBLIGACION = ['pendiente', 'pagada', 'vencida'];

// Estado efectivo de una obligación: 'pagada' si tiene pago confirmado;
// 'vencida' si está pendiente y su fecha_vencimiento ya pasó; si no, 'pendiente'.
export function estadoEfectivo(fila, hoy) {
  if (fila.estado === 'pagada') return 'pagada';
  if (fila.fecha_vencimiento < hoy) return 'vencida';
  return 'pendiente';
}

function conEstadoEfectivo(fila, hoy = hoyBogota()) {
  return { ...fila, estado_efectivo: estadoEfectivo(fila, hoy) };
}

// GET /api/obligaciones?contrato_id=&estado=&periodo_desde=&periodo_hasta=&incluir_vencidas=
router.get('/', async (req, res, next) => {
  try {
    const pagina = Math.max(1, parseInt(req.query.pagina ?? '1', 10) || 1);
    const tamano = Math.min(100, Math.max(1, parseInt(req.query.tamano ?? '50', 10) || 50));
    const offset = (pagina - 1) * tamano;
    const hoy = hoyBogota();
    const where = [];
    const params = [];
    if (req.query.contrato_id) {
      const v = Number(req.query.contrato_id);
      if (!Number.isInteger(v) || v <= 0) throw errores.validacion('contrato_id inválido');
      where.push('o.contrato_id = ?'); params.push(v);
    }
    if (req.query.periodo_desde) {
      exigirPeriodo(req.query.periodo_desde, 'periodo_desde');
      where.push('o.periodo >= ?'); params.push(req.query.periodo_desde);
    }
    if (req.query.periodo_hasta) {
      exigirPeriodo(req.query.periodo_hasta, 'periodo_hasta');
      where.push('o.periodo <= ?'); params.push(req.query.periodo_hasta);
    }
    // Filtro por estado efectivo (incluye 'vencida' derivada).
    const estado = req.query.estado;
    if (estado) {
      if (!ESTADOS_OBLIGACION.includes(estado)) {
        throw errores.validacion(`estado debe ser uno de: ${ESTADOS_OBLIGACION.join(', ')}`);
      }
      if (estado === 'pagada') where.push("o.estado = 'pagada'");
      else if (estado === 'pendiente') where.push("o.estado = 'pendiente' AND o.fecha_vencimiento >= ?");
      else where.push("o.estado = 'pendiente' AND o.fecha_vencimiento < ?");
      if (estado !== 'pagada') params.push(hoy);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [rows] = await pool.query(
      `SELECT o.*, c.vehiculo_id, v.placa, cli.id AS cliente_id,
              CONCAT(cli.nombres, ' ', cli.apellidos) AS cliente_nombre,
              CASE WHEN o.estado = 'pagada' THEN 'pagada'
                   WHEN o.fecha_vencimiento < ? THEN 'vencida' ELSE 'pendiente' END AS estado_efectivo
       FROM obligaciones_pago o
       JOIN contratos_mensualidad c ON c.id = o.contrato_id
       JOIN vehiculos v ON v.id = c.vehiculo_id
       JOIN clientes cli ON cli.id = c.cliente_id
       ${whereSql} ORDER BY o.periodo DESC, o.id DESC LIMIT ? OFFSET ?`,
      [hoy, ...params, tamano, offset],
    );
    const countWhere = whereSql; // mismos filtros (el CASE no afecta el WHERE)
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM obligaciones_pago o ${countWhere}`, params);
    res.json({
      datos: rows,
      paginacion: { pagina, tamano, total: Number(total), paginas: Math.max(1, Math.ceil(Number(total) / tamano)) },
    });
  } catch (err) { next(err); }
});

// GET /api/obligaciones/:id — detalle + pagos asociados.
router.get('/:id', async (req, res, next) => {
  try {
    const id = idParam(req);
    const hoy = hoyBogota();
    const [rows] = await pool.query(
      `SELECT o.*, c.vehiculo_id, v.placa, cli.id AS cliente_id,
              CONCAT(cli.nombres, ' ', cli.apellidos) AS cliente_nombre,
              CASE WHEN o.estado = 'pagada' THEN 'pagada'
                   WHEN o.fecha_vencimiento < ? THEN 'vencida' ELSE 'pendiente' END AS estado_efectivo
       FROM obligaciones_pago o
       JOIN contratos_mensualidad c ON c.id = o.contrato_id
       JOIN vehiculos v ON v.id = c.vehiculo_id
       JOIN clientes cli ON cli.id = c.cliente_id
       WHERE o.id = ?`, [hoy, id]);
    if (!rows[0]) throw errores.noEncontrado('Obligación no encontrada');
    const [pagos] = await pool.query(
      `SELECT id, identificador, comprobante, metodo_pago, monto, moneda, fecha_hora,
              estado, motivo_anulacion, anulado_en, creado_en
       FROM pagos WHERE obligacion_id = ? ORDER BY id`, [id]);
    res.json({ ...rows[0], pagos });
  } catch (err) { next(err); }
});

// La generación explícita de obligaciones vive en contratos.js:
// POST /api/contratos/:id/obligaciones/generar
export { conEstadoEfectivo };
export default router;

import express from 'express';
import { pool } from '../db.js';
import { errores } from '../errors.js';
import { autenticar } from '../middleware/auth.js';
import { hoyBogota } from '../utils/fechas.js';
import { sumarDecimales } from '../utils/dinero.js';

const router = express.Router();
router.use(autenticar);

// GET /api/resumen/cliente/:id — deuda actual del cliente:
// obligaciones pendientes/vencidas de sus contratos + estancias abiertas de
// sus vehículos. La deuda es alerta; no bloquea entradas ni salidas.
router.get('/cliente/:id', async (req, res, next) => {
  try {
    const clienteId = Number(req.params.id);
    if (!Number.isInteger(clienteId) || clienteId <= 0) throw errores.validacion('id inválido');
    const hoy = hoyBogota();

    const [cliente] = await pool.query('SELECT id FROM clientes WHERE id = ?', [clienteId]);
    if (!cliente[0]) throw errores.noEncontrado('Cliente no encontrado');

    const [obligaciones] = await pool.query(
      `SELECT o.id, o.contrato_id, o.periodo, o.importe, o.fecha_vencimiento, o.estado,
              CASE WHEN o.estado = 'pagada' THEN 'pagada'
                   WHEN o.fecha_vencimiento < ? THEN 'vencida' ELSE 'pendiente' END AS estado_efectivo,
              v.id AS vehiculo_id, v.placa
       FROM obligaciones_pago o
       JOIN contratos_mensualidad c ON c.id = o.contrato_id
       JOIN vehiculos v ON v.id = c.vehiculo_id
       WHERE c.cliente_id = ? AND o.estado = 'pendiente'
       ORDER BY o.fecha_vencimiento, o.periodo`,
      [hoy, clienteId],
    );

    const [estanciasAbiertas] = await pool.query(
      `SELECT e.id, e.vehiculo_id, v.placa, cel.codigo AS celda_codigo, e.fecha_hora_entrada
       FROM estancias e
       JOIN vehiculos v ON v.id = e.vehiculo_id
       JOIN celdas cel ON cel.id = e.celda_id
       WHERE e.fecha_hora_salida IS NULL AND v.cliente_id = ?
       ORDER BY e.fecha_hora_entrada`,
      [clienteId],
    );

    const pendientes = obligaciones.filter((o) => o.estado_efectivo === 'pendiente');
    const vencidas = obligaciones.filter((o) => o.estado_efectivo === 'vencida');
    res.json({
      cliente_id: clienteId,
      obligaciones_pendientes: obligaciones,
      estancias_abiertas: estanciasAbiertas,
      deuda: {
        pendiente: sumarDecimales(pendientes.map((o) => o.importe)),
        vencida: sumarDecimales(vencidas.map((o) => o.importe)),
        total: sumarDecimales(obligaciones.map((o) => o.importe)),
        moneda: 'COP',
      },
    });
  } catch (err) { next(err); }
});

export default router;

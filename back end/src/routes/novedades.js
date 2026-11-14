import express from 'express';
import { pool } from '../db.js';
import { errores } from '../errors.js';
import { autenticar } from '../middleware/auth.js';
import { idParam } from '../utils/paginacion.js';
import { exigirFecha } from '../utils/periodos.js';

const router = express.Router({ mergeParams: true });
router.use(autenticar);

// POST /api/vehiculos/:id/novedades
// body: { descripcion, fecha ('AAAA-MM-DD'), responsable }
router.post('/', async (req, res, next) => {
  try {
    const vehiculoId = idParam(req);
    const { descripcion, fecha, responsable } = req.body ?? {};
    if (typeof descripcion !== 'string' || descripcion.trim() === '' || descripcion.trim().length > 300) {
      throw errores.validacion('descripcion obligatoria (máx. 300 caracteres)');
    }
    exigirFecha(fecha, 'fecha');
    if (typeof responsable !== 'string' || responsable.trim() === '' || responsable.trim().length > 120) {
      throw errores.validacion('responsable obligatorio (máx. 120 caracteres)');
    }
    const [v] = await pool.query('SELECT id FROM vehiculos WHERE id = ?', [vehiculoId]);
    if (!v[0]) throw errores.noEncontrado('Vehículo no encontrado');
    const [r] = await pool.query(
      'INSERT INTO novedades_vehiculo (vehiculo_id, descripcion, fecha, responsable) VALUES (?, ?, ?, ?)',
      [vehiculoId, descripcion.trim(), fecha, responsable.trim()],
    );
    const [rows] = await pool.query('SELECT * FROM novedades_vehiculo WHERE id = ?', [r.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// GET /api/vehiculos/:id/novedades
router.get('/', async (req, res, next) => {
  try {
    const vehiculoId = idParam(req);
    const [rows] = await pool.query(
      'SELECT * FROM novedades_vehiculo WHERE vehiculo_id = ? ORDER BY fecha DESC, id DESC',
      [vehiculoId],
    );
    res.json({ datos: rows });
  } catch (err) { next(err); }
});

export default router;

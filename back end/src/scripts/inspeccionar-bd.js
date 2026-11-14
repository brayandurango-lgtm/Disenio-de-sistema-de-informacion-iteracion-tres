// Inspección de SOLO LECTURA de la base configurada.
// Uso (desde "back end"):
//   node src/scripts/inspeccionar-bd.js
//   node --env-file=.env.test src/scripts/inspeccionar-bd.js   # base _test
// No imprime credenciales, no habilita multi-statement y no modifica datos.
import config from '../config.js';
import { pool, cerrarPool } from '../db.js';

const TABLAS_001 = [
  'clientes', 'usuarios', 'vehiculos', 'novedades_vehiculo', 'celdas',
  'estancias', 'contratos_mensualidad', 'obligaciones_pago', 'pagos',
  'auditoria_operaciones',
];
const TABLAS_002 = ['secuencias_comprobante'];

async function main() {
  const [[info]] = await pool.query('SELECT VERSION() AS version, DATABASE() AS base');
  console.log(`servidor_mysql=${info.version}`);
  console.log(`base_actual=${info.base}`);
  // Windows usa lower_case_table_names=1: el servidor devuelve el nombre en
  // minúsculas. La comparación es case-insensitive pero exige el mismo nombre.
  if (info.base.toLowerCase() !== config.db.database.toLowerCase()) {
    throw new Error(`DATABASE()='${info.base}' no coincide con DB_NAME='${config.db.database}'`);
  }

  const [tablas] = await pool.query(
    `SELECT TABLE_NAME AS tabla FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
     ORDER BY TABLE_NAME`,
  );
  const nombres = tablas.map((t) => t.tabla);
  console.log(`tablas=${nombres.length}`);
  for (const nombre of nombres) {
    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM ??', [nombre]);
    console.log(`  ${nombre}=${total}`);
  }

  const faltan = (lista) => lista.filter((t) => !nombres.includes(t));
  const f1 = faltan(TABLAS_001);
  const f2 = faltan(TABLAS_002);
  console.log(`migracion_001=${f1.length ? `faltan:${f1.join(',')}` : 'completa'}`);
  console.log(`migracion_002=${f2.length ? `faltan:${f2.join(',')}` : 'completa'}`);
}

main()
  .then(() => cerrarPool())
  .catch(async (err) => {
    console.error(`ERROR: ${err.message}`);
    await cerrarPool().catch(() => {});
    process.exitCode = 1;
  });

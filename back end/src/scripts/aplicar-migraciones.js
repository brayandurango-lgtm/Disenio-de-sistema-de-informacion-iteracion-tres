// Aplicación controlada de migraciones 001/002 con mysql2.
// Conexión dedicada con multi-statement (la API NO la habilita).
// Guardas: solo base principal o _test; principal vacía; nunca DROP/TRUNCATE.
// Uso (desde "back end"):
//   node src/scripts/aplicar-migraciones.js --crear-test     # crea _test si falta
//   node --env-file=.env.test src/scripts/aplicar-migraciones.js
//   node src/scripts/aplicar-migraciones.js --confirmar-base-principal
import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';
import config from '../config.js';

const PRINCIPAL = 'Disenio_de_sistema_de_informacion_iteracion_tres';
const TEST = `${PRINCIPAL}_test`;
const TABLAS_001 = [
  'clientes', 'usuarios', 'vehiculos', 'novedades_vehiculo', 'celdas',
  'estancias', 'contratos_mensualidad', 'obligaciones_pago', 'pagos',
  'auditoria_operaciones',
];
const TABLAS_002 = ['secuencias_comprobante'];

const args = new Set(process.argv.slice(2));
const base = config.db.database;
const esTest = base.toLowerCase() === TEST.toLowerCase();
const esPrincipal = base.toLowerCase() === PRINCIPAL.toLowerCase();

if (!esTest && !esPrincipal) {
  console.error(`Base no autorizada: '${base}'. Solo se permite la principal o la de pruebas.`);
  process.exit(1);
}
if (esTest && process.env.TEST_MODE !== '1') {
  console.error('Base de pruebas exige TEST_MODE=1 (use --env-file=.env.test).');
  process.exit(1);
}
if (esPrincipal && !args.has('--confirmar-base-principal')) {
  console.error('Para la base principal agregue --confirmar-base-principal (solo si está vacía).');
  process.exit(1);
}

function conexion(opciones = {}) {
  return mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    ...opciones,
  });
}

async function crearBaseTestSiFalta() {
  if (!args.has('--crear-test')) return;
  if (!esTest) {
    console.error('--crear-test solo aplica con DB_NAME=_test.');
    process.exit(1);
  }
  const conn = await conexion();
  try {
    const [filas] = await conn.query(
      'SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE LOWER(SCHEMA_NAME)=LOWER(?)', [TEST]);
    if (filas.length === 0) {
      await conn.query(`CREATE DATABASE \`${TEST}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      console.log('base_test=creada');
    } else {
      console.log('base_test=ya_existe');
    }
  } finally {
    await conn.end();
  }
}

async function tablasActuales(conn) {
  const [filas] = await conn.query(
    `SELECT TABLE_NAME AS t FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'`);
  return filas.map((f) => String(f.t));
}

async function main() {
  await crearBaseTestSiFalta();

  const conn = await conexion({ database: base, multipleStatements: true });
  try {
    const [[info]] = await conn.query('SELECT VERSION() AS v, DATABASE() AS db');
    console.log(`servidor=${info.v} base=${info.db}`);
    if (String(info.db).toLowerCase() !== base.toLowerCase()) {
      throw new Error(`DATABASE()='${info.db}' no coincide con DB_NAME='${base}'`);
    }

    let tablas = await tablasActuales(conn);
    console.log(`tablas_iniciales=${tablas.length}`);

    const esperadas = new Set([...TABLAS_001, ...TABLAS_002]);
    const inesperadas = tablas.filter((t) => !esperadas.has(t));
    if (inesperadas.length) {
      console.error(`DETENIDO: tablas no reconocidas: ${inesperadas.join(', ')}. Revise antes de alterar.`);
      process.exit(2);
    }

    const faltan001 = TABLAS_001.filter((t) => !tablas.includes(t));
    const faltan002 = TABLAS_002.filter((t) => !tablas.includes(t));

    if (faltan001.length && faltan001.length !== TABLAS_001.length) {
      console.error('DETENIDO: 001 está aplicada parcialmente. Diagnóstico manual requerido (sin pérdida de datos).');
      process.exit(2);
    }

    if (faltan001.length === TABLAS_001.length) {
      if (tablas.length !== 0) {
        console.error('DETENIDO: hay tablas pero falta 001 completa; revise el estado.');
        process.exit(2);
      }
      const sql = fs.readFileSync(path.join('migrations', '001_esquema_integrado.sql'), 'utf8');
      await conn.query(sql);
      console.log('migracion_001=aplicada');
      tablas = await tablasActuales(conn);
    } else {
      console.log('migracion_001=ya_aplicada');
    }

    const faltan002Ahora = TABLAS_002.filter((t) => !tablas.includes(t));
    if (faltan002Ahora.length) {
      const sql = fs.readFileSync(path.join('migrations', '002_secuencias_comprobante.sql'), 'utf8');
      await conn.query(sql);
      console.log('migracion_002=aplicada');
      tablas = await tablasActuales(conn);
    } else {
      console.log('migracion_002=ya_aplicada');
    }

    const faltanFinal = [...TABLAS_001, ...TABLAS_002].filter((t) => !tablas.includes(t));
    console.log(`tablas_finales=${tablas.length}`);
    console.log(faltanFinal.length ? `INCOMPLETO: faltan ${faltanFinal.join(', ')}` : 'esquema=completo');
    process.exitCode = faltanFinal.length ? 3 : 0;
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`);
  process.exitCode = 1;
});

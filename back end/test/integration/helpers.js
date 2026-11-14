// Helper de pruebas de integración contra MySQL real.
// Solo se activa con TEST_MODE=1 y DB_NAME=Disenio_de_sistema_de_informacion_iteracion_tres_test.
import assert from 'node:assert/strict';
import { once } from 'node:events';
import bcrypt from 'bcryptjs';
import { DB_TEST_NOMBRE, assertBaseDePruebas, assertPermisoReset } from '../../src/utils/testdb.js';

export const integrationDisponible =
  process.env.TEST_MODE === '1' && process.env.DB_NAME === DB_TEST_NOMBRE;

let ctx = null;

export async function preparar() {
  if (!integrationDisponible) return null;
  if (ctx) return ctx;
  const { createApp } = await import('../../src/app.js');
  const app = createApp();
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  ctx = { server, base, app };
  return ctx;
}

export async function cerrar() {
  if (!ctx) return;
  const { cerrarPool } = await import('../../src/db.js');
  ctx.server.close();
  await cerrarPool().catch(() => {});
  ctx = null;
}

export async function api(base, metodo, ruta, { token, body } = {}) {
  const res = await fetch(`${base}/api${ruta}`, {
    method: metodo,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* sin cuerpo */ }
  return { status: res.status, json };
}

export async function login(base, nombreUsuario, password) {
  const r = await api(base, 'POST', '/auth/login', { body: { nombre_usuario: nombreUsuario, password } });
  assert.equal(r.status, 200, `login ${nombreUsuario} falló: ${JSON.stringify(r.json)}`);
  return r.json.token;
}

// Conexión directa a la base de pruebas. Verifica con SELECT DATABASE() que
// el servidor realmente esté usando la base autorizada antes de operar.
async function conexionPruebas() {
  await import('../../src/config.js'); // carga .env (dotenv no sobrescribe .env.test)
  assertBaseDePruebas(process.env.DB_NAME);
  const mysql = (await import('mysql2/promise')).default;
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  try {
    const [[fila]] = await conn.query('SELECT DATABASE() AS db');
    // En Windows (lower_case_table_names=1) el servidor devuelve minúsculas.
    assert.equal(
      String(fila.db).toLowerCase(),
      DB_TEST_NOMBRE.toLowerCase(),
      `La conexión apunta a '${fila.db}', no a la base de pruebas '${DB_TEST_NOMBRE}'`,
    );
  } catch (err) {
    await conn.end();
    throw err;
  }
  return conn;
}

// Limpieza total de la base de pruebas (con guardas) + usuarios semilla.
export async function resetDb() {
  assertPermisoReset();
  const conn = await conexionPruebas();
  try {
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    const [tablas] = await conn.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'`, [process.env.DB_NAME]);
    for (const t of tablas) {
      await conn.query(`DELETE FROM \`${t.TABLE_NAME}\``);
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    const usuarios = [
      ['admin.autoscolombia', 'admin@autoscolombia.example', 'administrador', 'Prueba.Admin.2026'],
      ['operador.autoscolombia', 'operador@autoscolombia.example', 'operador', 'Prueba.Operador.2026'],
    ];
    for (const [nombre, correo, rol, pass] of usuarios) {
      const hash = await bcrypt.hash(pass, 12);
      await conn.query(
        `INSERT INTO usuarios (cliente_id, nombre_usuario, correo, password_hash, rol, activo)
         VALUES (NULL, ?, ?, ?, ?, 1)`, [nombre, correo, hash, rol]);
    }
  } finally {
    await conn.end();
  }
}

// Consulta de solo lectura para validar el estado final en la base.
export async function consultaDb(sql, params = []) {
  if (!integrationDisponible) throw new Error('Pruebas de integración no habilitadas');
  const conn = await conexionPruebas();
  try {
    const [rows] = await conn.query(sql, params);
    return rows;
  } finally {
    await conn.end();
  }
}

// Marcadores aleatorios y exactos para el flujo frontend. Permiten recuperar
// los IDs incluso si una respuesta HTTP de creación no llega al test.
export function marcadoresFlujoFrontend(runId) {
  assert.match(runId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  const hex = runId.replaceAll('-', '').toLowerCase();
  const doc = BigInt(`0x${hex.slice(0, 12)}`).toString().padStart(15, '0');
  return {
    correo: `flow-${runId}@ficticio.example`,
    documento: `99${doc}`,
    placa: `F${hex.slice(0, 9).toUpperCase()}`,
    codigoCelda: `T-${hex.slice(0, 8).toUpperCase()}`,
  };
}

// Comprueba la base del pool usado por la propia API (no solo otra conexión).
export async function verificarPoolBaseDePruebas() {
  assertBaseDePruebas(process.env.DB_NAME);
  const { pool } = await import('../../src/db.js');
  const [[fila]] = await pool.query('SELECT DATABASE() AS db');
  assert.equal(String(fila.db).toLowerCase(), DB_TEST_NOMBRE.toLowerCase(),
    'El pool de la API no está conectado a la base exacta de pruebas');
}

// Borra únicamente el fixture identificado por su UUID. No usa resetDb, no
// toca usuarios semilla, datos sin marcador ni secuencias globales.
export async function limpiarFlujoFrontend(runId) {
  if (!integrationDisponible) throw new Error('Limpieza frontend bloqueada: pruebas no habilitadas');
  assertBaseDePruebas(process.env.DB_NAME);
  const marca = marcadoresFlujoFrontend(runId);
  const conn = await conexionPruebas();
  const resultado = { auditoria: 0, pagos: 0, obligaciones: 0, contratos: 0, estancias: 0, vehiculos: 0, clientes: 0, celdas: 0 };

  const ids = (rows) => rows.map((row) => row.id);
  const placeholders = (valores) => valores.map(() => '?').join(', ');
  const borrarIds = async (tabla, valores) => {
    if (!valores.length) return 0;
    const [r] = await conn.query(`DELETE FROM ${tabla} WHERE id IN (${placeholders(valores)})`, valores);
    assert.ok(r.affectedRows <= valores.length, `Limpieza inesperada en ${tabla}`);
    return r.affectedRows;
  };

  try {
    await conn.beginTransaction();
    const [clientes] = await conn.query(
      'SELECT id FROM clientes WHERE correo = ? AND numero_documento = ?',
      [marca.correo, marca.documento],
    );
    assert.ok(clientes.length <= 1, 'Marcador de cliente no es único');
    const clienteIds = ids(clientes);
    const [vehiculos] = clienteIds.length
      ? await conn.query('SELECT id FROM vehiculos WHERE cliente_id = ? AND placa = ?', [clienteIds[0], marca.placa])
      : [[]];
    assert.ok(vehiculos.length <= 1, 'Marcador de vehículo no es único');
    const vehiculoIds = ids(vehiculos);
    const [celdas] = await conn.query('SELECT id FROM celdas WHERE codigo = ?', [marca.codigoCelda]);
    assert.ok(celdas.length <= 1, 'Marcador de celda no es único');
    const celdaIds = ids(celdas);

    const contratos = vehiculoIds.length && clienteIds.length
      ? await conn.query(
        'SELECT id FROM contratos_mensualidad WHERE vehiculo_id = ? AND cliente_id = ? AND tarifa_mensual = ? AND fecha_inicio = ?',
        [vehiculoIds[0], clienteIds[0], '135000.00', '2026-11-01'],
      )
      : [[]];
    const contratoIds = ids(contratos[0]);
    const obligaciones = contratoIds.length
      ? await conn.query(
        `SELECT id FROM obligaciones_pago WHERE contrato_id IN (${placeholders(contratoIds)}) AND periodo = ? AND importe = ? AND fecha_vencimiento = ?`,
        [...contratoIds, '2026-11', '135000.00', '2026-12-05'],
      )
      : [[]];
    const obligacionIds = ids(obligaciones[0]);
    const pagos = obligacionIds.length
      ? await conn.query(`SELECT id FROM pagos WHERE obligacion_id IN (${placeholders(obligacionIds)})`, obligacionIds)
      : [[]];
    const pagoIds = ids(pagos[0]);
    const estancias = vehiculoIds.length && celdaIds.length
      ? await conn.query(
        `SELECT id FROM estancias WHERE vehiculo_id IN (${placeholders(vehiculoIds)}) AND celda_id IN (${placeholders(celdaIds)})`,
        [...vehiculoIds, ...celdaIds],
      )
      : [[]];
    const estanciaIds = ids(estancias[0]);

    const auditRefs = [
      ['cliente', clienteIds], ['vehiculo', vehiculoIds], ['celda', celdaIds],
      ['contrato', contratoIds], ['obligacion', obligacionIds],
      ['pago', pagoIds], ['estancia', estanciaIds],
    ].filter(([, refIds]) => refIds.length);
    if (auditRefs.length) {
      const auditParams = [];
      const auditWhere = auditRefs.map(([entidad, refIds]) => {
        auditParams.push(entidad, ...refIds);
        return `(entidad = ? AND entidad_id IN (${placeholders(refIds)}))`;
      }).join(' OR ');
      const [r] = await conn.query(`DELETE FROM auditoria_operaciones WHERE ${auditWhere}`, auditParams);
      resultado.auditoria = r.affectedRows;
    }
    resultado.pagos = await borrarIds('pagos', pagoIds);
    resultado.obligaciones = await borrarIds('obligaciones_pago', obligacionIds);
    resultado.contratos = await borrarIds('contratos_mensualidad', contratoIds);
    resultado.estancias = await borrarIds('estancias', estanciaIds);
    resultado.vehiculos = await borrarIds('vehiculos', vehiculoIds);
    resultado.clientes = await borrarIds('clientes', clienteIds);
    resultado.celdas = await borrarIds('celdas', celdaIds);
    await conn.commit();

    const [[residuos]] = await conn.query(
      `SELECT
        (SELECT COUNT(*) FROM clientes WHERE correo = ? AND numero_documento = ?) AS clientes,
        (SELECT COUNT(*) FROM celdas WHERE codigo = ?) AS celdas,
        (SELECT COUNT(*) FROM vehiculos WHERE cliente_id IN (SELECT id FROM clientes WHERE correo = ?) AND placa = ?) AS vehiculos`,
      [marca.correo, marca.documento, marca.codigoCelda, marca.correo, marca.placa],
    );
    assert.equal(Number(residuos.clientes) + Number(residuos.celdas) + Number(residuos.vehiculos), 0,
      'Quedaron entidades raíz del fixture frontend');
    return { ...resultado, residuos: { clientes: Number(residuos.clientes), celdas: Number(residuos.celdas), vehiculos: Number(residuos.vehiculos) } };
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    await conn.end();
  }
}

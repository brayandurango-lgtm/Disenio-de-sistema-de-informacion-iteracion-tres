// Pruebas de integración contra MySQL real (base de pruebas _test).
// Requiere: TEST_MODE=1, ALLOW_TEST_DB_RESET=1 y DB_NAME=..._test en .env.
// Ejecutar: node --test "test/integration/*.test.js"
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  integrationDisponible, preparar, cerrar, api, login, resetDb, consultaDb,
} from './helpers.js';

const skip = !integrationDisponible
  ? 'Requiere TEST_MODE=1 y DB_NAME=Disenio_de_sistema_de_informacion_iteracion_tres_test'
  : false;

let base, tokenAdmin, tokenOp;
const ids = {};

before(async () => {
  if (!integrationDisponible) return;
  const ctx = await preparar();
  base = ctx.base;
  await resetDb();
  tokenAdmin = await login(base, 'admin.autoscolombia', 'Prueba.Admin.2026');
  tokenOp = await login(base, 'operador.autoscolombia', 'Prueba.Operador.2026');
});

after(async () => { await cerrar(); });

const post = (ruta, body, token = tokenOp) => api(base, 'POST', ruta, { token, body });
const get = (ruta, token = tokenOp) => api(base, 'GET', ruta, { token });
const patch = (ruta, body, token = tokenOp) => api(base, 'PATCH', ruta, { token, body });

// ---------- Autenticación y permisos ----------

test('auth: login válido e inválido', { skip }, async () => {
  const ok = await api(base, 'POST', '/auth/login', {
    body: { nombre_usuario: 'operador.autoscolombia', password: 'Prueba.Operador.2026' },
  });
  assert.equal(ok.status, 200);
  assert.ok(ok.json.token);
  assert.equal(ok.json.usuario.rol, 'operador');

  const mal = await api(base, 'POST', '/auth/login', {
    body: { nombre_usuario: 'operador.autoscolombia', password: 'incorrecta' },
  });
  assert.equal(mal.status, 401);
  assert.equal(mal.json.error.codigo, 'NO_AUTENTICADO');

  const sinToken = await api(base, 'GET', '/clientes');
  assert.equal(sinToken.status, 401);
});

test('auth: operador no puede crear usuarios ni anular pagos', { skip }, async () => {
  const r1 = await post('/usuarios', { nombre_usuario: 'x.nuevo', correo: 'x@x.co', password: '1234567890' }, tokenOp);
  assert.equal(r1.status, 403);
  assert.equal(r1.json.error.codigo, 'PERMISO_DENEGADO');
});

test('auth: bloqueo tras 5 intentos fallidos del mismo usuario', { skip }, async () => {
  // Usuario inexistente para no afectar a las cuentas usadas en otras pruebas.
  const usuario = 'bloqueo.ficticio';
  for (let i = 0; i < 5; i += 1) {
    const r = await api(base, 'POST', '/auth/login', {
      body: { nombre_usuario: usuario, password: 'incorrecta' },
    });
    assert.equal(r.status, 401, `intento ${i + 1} debía ser 401`);
  }
  const sexto = await api(base, 'POST', '/auth/login', {
    body: { nombre_usuario: usuario, password: 'incorrecta' },
  });
  assert.equal(sexto.status, 429);
  assert.equal(sexto.json.error.codigo, 'DEMASIADOS_INTENTOS');

  // Un solo fallo no bloquea: la cuenta del operador sigue pudiendo entrar.
  const ok = await api(base, 'POST', '/auth/login', {
    body: { nombre_usuario: 'admin.autoscolombia', password: 'Prueba.Admin.2026' },
  });
  assert.equal(ok.status, 200);
});

// ---------- Iteración 2 base: clientes, celdas, usuarios ----------

test('clientes: CRUD y duplicado de documento', { skip }, async () => {
  const c1 = await post('/clientes', {
    nombres: 'Prueba', apellidos: 'Uno', tipo_documento: 'CC',
    numero_documento: '900000001', correo: 'p1@ficticio.example',
  });
  assert.equal(c1.status, 201);
  ids.cliente1 = c1.json.id;

  const dup = await post('/clientes', {
    nombres: 'Otro', apellidos: 'Dos', tipo_documento: 'CC',
    numero_documento: '900000001',
  });
  assert.equal(dup.status, 409);

  const lista = await get('/clientes?q=Prueba');
  assert.ok(lista.json.datos.some((c) => c.id === ids.cliente1));
});

test('celdas: crear (admin), listar con ocupación, deshabilitar ocupada', { skip }, async () => {
  const c1 = await post('/celdas', { codigo: 'T-01', tipo: 'cubierta' }, tokenAdmin);
  assert.equal(c1.status, 201);
  ids.celda1 = c1.json.id;

  const opCrea = await post('/celdas', { codigo: 'T-99' }, tokenOp);
  assert.equal(opCrea.status, 403);

  const lista = await get('/celdas');
  const celda = lista.json.datos.find((c) => c.id === ids.celda1);
  assert.equal(celda.ocupada, false);
});

// ---------- Iteración 1: vehículos, estancias, novedades ----------

test('vehiculos: crear, placa duplicada, normalización', { skip }, async () => {
  const v1 = await post('/vehiculos', {
    cliente_id: ids.cliente1, placa: ' t-123 ', marca: 'Mazda', modelo: '3', anio: 2020,
  });
  assert.equal(v1.status, 201);
  ids.vehiculo1 = v1.json.id;
  assert.equal(v1.json.placa, 'T123');

  const dup = await post('/vehiculos', {
    cliente_id: ids.cliente1, placa: 'T123', marca: 'X', modelo: 'Y',
  });
  assert.equal(dup.status, 409);
});

test('estancias: entrada, doble entrada mismo vehículo, celda ocupada, salida', { skip }, async () => {
  const celda2 = await post('/celdas', { codigo: 'T-02' }, tokenAdmin);
  ids.celda2 = celda2.json.id;

  const e1 = await post('/estancias', { vehiculo_id: ids.vehiculo1, celda_id: ids.celda1 });
  assert.equal(e1.status, 201);
  assert.equal(e1.json.estado, 'abierta');
  ids.estancia1 = e1.json.id;

  // Mismo vehículo → 409 (doble estancia abierta)
  const doble = await post('/estancias', { vehiculo_id: ids.vehiculo1, celda_id: ids.celda2 });
  assert.equal(doble.status, 409);

  // Otra entrada a la misma celda con OTRO vehículo → 409 celda ocupada
  const v2 = await post('/vehiculos', {
    cliente_id: ids.cliente1, placa: 'T999', marca: 'Kia', modelo: 'Picanto',
  });
  ids.vehiculo2 = v2.json.id;
  const celdaOcupada = await post('/estancias', { vehiculo_id: ids.vehiculo2, celda_id: ids.celda1 });
  assert.equal(celdaOcupada.status, 409);
  assert.equal(celdaOcupada.json.error.codigo, 'CELDA_NO_DISPONIBLE');

  // Celda fuera de servicio → 409
  const celda3 = await post('/celdas', { codigo: 'T-03', estado: 'fuera_de_servicio' }, tokenAdmin);
  ids.celda3 = celda3.json.id;
  const fs = await post('/estancias', { vehiculo_id: ids.vehiculo2, celda_id: ids.celda3 });
  assert.equal(fs.status, 409);

  // No se puede deshabilitar celda ocupada
  const deshab = await patch(`/celdas/${ids.celda1}`, { estado: 'fuera_de_servicio' }, tokenAdmin);
  assert.equal(deshab.status, 409);

  // Salida válida
  const salida = await post(`/estancias/${ids.estancia1}/salida`, { motivo_salida: 'Prueba fin' });
  assert.equal(salida.status, 200);
  assert.equal(salida.json.estado, 'cerrada');

  // Doble salida → 409
  const dobleSalida = await post(`/estancias/${ids.estancia1}/salida`, {});
  assert.equal(dobleSalida.status, 409);
});

test('estancias: ocupación concurrente de celda y vehículo', { skip }, async () => {
  // Misma celda, dos vehículos distintos: solo una entrada debe pasar.
  const celda = await post('/celdas', { codigo: 'T-CC' }, tokenAdmin);
  assert.equal(celda.status, 201);
  const celdaId = celda.json.id;

  const v4 = await post('/vehiculos', {
    cliente_id: ids.cliente1, placa: 'T444', marca: 'Renault', modelo: 'Logan',
  });
  const v5 = await post('/vehiculos', {
    cliente_id: ids.cliente1, placa: 'T555', marca: 'Chevrolet', modelo: 'Spark',
  });
  assert.equal(v4.status, 201);
  assert.equal(v5.status, 201);

  const [a, b] = await Promise.all([
    post('/estancias', { vehiculo_id: v4.json.id, celda_id: celdaId }),
    post('/estancias', { vehiculo_id: v5.json.id, celda_id: celdaId }),
  ]);
  assert.deepEqual([a.status, b.status].sort(), [201, 409]);

  const abiertasCelda = await consultaDb(
    'SELECT COUNT(*) AS n FROM estancias WHERE celda_id = ? AND fecha_hora_salida IS NULL',
    [celdaId],
  );
  assert.equal(Number(abiertasCelda[0].n), 1);

  // Mismo vehículo, dos celdas distintas: solo una entrada debe pasar.
  const c1 = await post('/celdas', { codigo: 'T-CD' }, tokenAdmin);
  const c2 = await post('/celdas', { codigo: 'T-CE' }, tokenAdmin);
  const v6 = await post('/vehiculos', {
    cliente_id: ids.cliente1, placa: 'T666', marca: 'Nissan', modelo: 'Versa',
  });
  assert.equal(v6.status, 201);

  const [c, d] = await Promise.all([
    post('/estancias', { vehiculo_id: v6.json.id, celda_id: c1.json.id }),
    post('/estancias', { vehiculo_id: v6.json.id, celda_id: c2.json.id }),
  ]);
  assert.deepEqual([c.status, d.status].sort(), [201, 409]);

  const abiertasVehiculo = await consultaDb(
    'SELECT COUNT(*) AS n FROM estancias WHERE vehiculo_id = ? AND fecha_hora_salida IS NULL',
    [v6.json.id],
  );
  assert.equal(Number(abiertasVehiculo[0].n), 1);
});

test('novedades: registrar y listar', { skip }, async () => {
  const n = await post(`/vehiculos/${ids.vehiculo1}/novedades`, {
    descripcion: 'Cambio de aceite', fecha: '2026-11-01', responsable: 'Taller X',
  });
  assert.equal(n.status, 201);
  const lista = await get(`/vehiculos/${ids.vehiculo1}/novedades`);
  assert.equal(lista.json.datos.length, 1);
});

// ---------- Iteración 3: contratos, obligaciones, pagos ----------

test('contratos: crear, solape rechazado, solape concurrente', { skip }, async () => {
  const c1 = await post('/contratos', {
    vehiculo_id: ids.vehiculo1, cliente_id: ids.cliente1,
    tarifa_mensual: '120000.00', fecha_inicio: '2026-01-01', fecha_fin: null,
  });
  assert.equal(c1.status, 201);
  ids.contrato1 = c1.json.id;

  // Solape directo → 409
  const solape = await post('/contratos', {
    vehiculo_id: ids.vehiculo1, cliente_id: ids.cliente1,
    tarifa_mensual: '100000.00', fecha_inicio: '2026-06-01', fecha_fin: '2026-12-31',
  });
  assert.equal(solape.status, 409);

  // Solape concurrente sobre OTRO vehículo sin contrato vigente:
  // dos requests simultáneos, solo uno debe pasar.
  const v3 = await post('/vehiculos', {
    cliente_id: ids.cliente1, placa: 'T777', marca: 'Ford', modelo: 'Fiesta',
  });
  ids.vehiculo3 = v3.json.id;
  const [r1, r2] = await Promise.all([
    post('/contratos', {
      vehiculo_id: ids.vehiculo3, cliente_id: ids.cliente1,
      tarifa_mensual: '90000.00', fecha_inicio: '2027-01-01', fecha_fin: null,
    }),
    post('/contratos', {
      vehiculo_id: ids.vehiculo3, cliente_id: ids.cliente1,
      tarifa_mensual: '95000.00', fecha_inicio: '2027-06-01', fecha_fin: '2028-12-31',
    }),
  ]);
  const codigos = [r1.status, r2.status].sort();
  assert.deepEqual(codigos, [201, 409]);

  // Estado final en la base: una sola fila de contrato para ese vehículo.
  const contratosV3 = await consultaDb(
    'SELECT COUNT(*) AS n FROM contratos_mensualidad WHERE vehiculo_id = ?',
    [ids.vehiculo3],
  );
  assert.equal(Number(contratosV3[0].n), 1);
});

test('obligaciones: generación explícita, idempotencia, vigencia', { skip }, async () => {
  // Sin dia_vencimiento → 400
  const sinVenc = await post(`/contratos/${ids.contrato1}/obligaciones/generar`, {
    periodos: ['2026-11', '2026-12'],
  });
  assert.equal(sinVenc.status, 400);

  // Periodo fuera de vigencia → 400
  const fuera = await post(`/contratos/${ids.contrato1}/obligaciones/generar`, {
    periodos: ['2025-12'], dia_vencimiento: 5,
  });
  assert.equal(fuera.status, 400);

  // Generación válida
  const gen = await post(`/contratos/${ids.contrato1}/obligaciones/generar`, {
    periodos: ['2026-11', '2026-12'], dia_vencimiento: 5,
  });
  assert.equal(gen.status, 201);
  assert.equal(gen.json.generadas, 2);
  ids.obligacion1 = gen.json.obligaciones.find((o) => o.periodo === '2026-11').id;
  ids.obligacion2 = gen.json.obligaciones.find((o) => o.periodo === '2026-12').id;

  // Vencimiento explícito = día 5 del mes siguiente
  const ob1 = gen.json.obligaciones.find((o) => o.periodo === '2026-11');
  assert.equal(ob1.fecha_vencimiento, '2026-12-05');

  // Re-generar los mismos periodos → idempotente, no duplica
  const regen = await post(`/contratos/${ids.contrato1}/obligaciones/generar`, {
    periodos: ['2026-11', '2026-12'], dia_vencimiento: 5,
  });
  assert.equal(regen.status, 201);
  assert.equal(regen.json.generadas, 0);
  assert.equal(regen.json.omitidas, 2);
});

test('pagos: válido, monto incorrecto, duplicado concurrente, idempotencia', { skip }, async () => {
  // Monto enviado que no coincide → 400
  const malMonto = await post('/pagos', {
    obligacion_id: ids.obligacion1, metodo_pago: 'efectivo',
    clave_idempotencia: crypto.randomUUID(), monto: '1.00',
  });
  assert.equal(malMonto.status, 400);

  // Pago válido
  const clave = crypto.randomUUID();
  const pago = await post('/pagos', {
    obligacion_id: ids.obligacion1, metodo_pago: 'efectivo', clave_idempotencia: clave,
  });
  assert.equal(pago.status, 201);
  assert.equal(pago.json.estado, 'confirmado');
  assert.match(pago.json.comprobante, /^CMP-\d{4}-\d{6}$/);
  assert.equal(pago.json.monto, '120000.00');
  ids.pago1 = pago.json.id;

  // Obligación quedó pagada
  const ob = await get(`/obligaciones/${ids.obligacion1}`);
  assert.equal(ob.json.estado_efectivo, 'pagada');

  // Reintento idempotente: misma clave + mismos datos → 200 mismo pago
  const reintento = await post('/pagos', {
    obligacion_id: ids.obligacion1, metodo_pago: 'efectivo', clave_idempotencia: clave,
  });
  assert.equal(reintento.status, 200);
  assert.equal(reintento.json.id, ids.pago1);

  // Misma clave con datos diferentes → 409 IDEMPOTENCIA_CONFLICTO
  const conflicto = await post('/pagos', {
    obligacion_id: ids.obligacion2, metodo_pago: 'efectivo', clave_idempotencia: clave,
  });
  assert.equal(conflicto.status, 409);
  assert.equal(conflicto.json.error.codigo, 'IDEMPOTENCIA_CONFLICTO');

  // Pago duplicado concurrente sobre obligación2 (claves distintas)
  const [p1, p2] = await Promise.all([
    post('/pagos', { obligacion_id: ids.obligacion2, metodo_pago: 'efectivo', clave_idempotencia: crypto.randomUUID() }),
    post('/pagos', { obligacion_id: ids.obligacion2, metodo_pago: 'transferencia', clave_idempotencia: crypto.randomUUID() }),
  ]);
  const estados = [p1.status, p2.status].sort((a, b) => a - b);
  assert.deepEqual(estados, [201, 409]);

  // Estado final en la base: un solo pago confirmado para la obligación.
  const pagosOb2 = await consultaDb(
    `SELECT COUNT(*) AS n FROM pagos WHERE obligacion_id = ? AND estado = 'confirmado'`,
    [ids.obligacion2],
  );
  assert.equal(Number(pagosOb2[0].n), 1);
});

test('pagos: anulación solo admin, repetida, y nuevo pago posterior', { skip }, async () => {
  // Operador intenta anular → 403
  const denegado = await post(`/pagos/${ids.pago1}/anular`, { motivo: 'prueba' }, tokenOp);
  assert.equal(denegado.status, 403);

  // Admin anula → 200
  const anul = await post(`/pagos/${ids.pago1}/anular`, { motivo: 'Error de digitación' }, tokenAdmin);
  assert.equal(anul.status, 200);
  assert.equal(anul.json.estado, 'anulado');
  assert.ok(anul.json.motivo_anulacion);
  assert.ok(anul.json.anulado_en);

  // Obligación vuelve a pendiente
  const ob = await get(`/obligaciones/${ids.obligacion1}`);
  assert.equal(ob.json.estado, 'pendiente');
  assert.equal(ob.json.estado_efectivo, 'pendiente'); // no vencida aún

  // Anulación repetida → 409
  const repite = await post(`/pagos/${ids.pago1}/anular`, { motivo: 'otra vez' }, tokenAdmin);
  assert.equal(repite.status, 409);

  // Nuevo pago tras anulación → 201 (obligacion_valida_id quedó NULL)
  const nuevo = await post('/pagos', {
    obligacion_id: ids.obligacion1, metodo_pago: 'transferencia',
    clave_idempotencia: crypto.randomUUID(),
  });
  assert.equal(nuevo.status, 201);
  assert.notEqual(nuevo.json.id, ids.pago1);
  assert.match(nuevo.json.comprobante, /^CMP-\d{4}-\d{6}$/);

  // Estado final en la base: pago original anulado y auditoría coherente.
  const pagoDb = await consultaDb('SELECT estado FROM pagos WHERE id = ?', [ids.pago1]);
  assert.equal(pagoDb[0].estado, 'anulado');

  const auditoria = await consultaDb(
    `SELECT accion FROM auditoria_operaciones
     WHERE entidad = 'pago' AND entidad_id = ? ORDER BY id`,
    [ids.pago1],
  );
  const acciones = auditoria.map((a) => a.accion);
  assert.ok(acciones.includes('registrar'), 'falta auditoría de registro del pago');
  assert.ok(acciones.includes('anular'), 'falta auditoría de anulación del pago');
});

test('pagos: historial, detalle y comprobante', { skip }, async () => {
  const hist = await get('/pagos?contrato_id=' + ids.contrato1);
  assert.ok(hist.json.datos.length >= 2);
  const det = await get(`/pagos/${hist.json.datos[0].id}`);
  assert.equal(det.status, 200);
  const comp = await get(`/pagos/${hist.json.datos[0].id}/comprobante`);
  assert.match(comp.json.comprobante, /^CMP-\d{4}-\d{6}$/);
});

test('resumen: deuda del cliente', { skip }, async () => {
  const r = await get(`/resumen/cliente/${ids.cliente1}`);
  assert.equal(r.status, 200);
  assert.equal(r.json.cliente_id, ids.cliente1);
  assert.ok(r.json.deuda);
});

test('reversión: pago inválido no deja efectos', { skip }, async () => {
  const antes = await get(`/obligaciones/${ids.obligacion2}`);
  const malo = await post('/pagos', {
    obligacion_id: ids.obligacion2, metodo_pago: 'tarjeta', clave_idempotencia: crypto.randomUUID(),
  });
  assert.equal(malo.status, 400);
  const despues = await get(`/obligaciones/${ids.obligacion2}`);
  assert.equal(despues.json.estado, antes.json.estado);
  assert.equal(despues.json.pagos.length, antes.json.pagos.length);
});

test('auth: cambio de contraseña invalida tokens anteriores', { skip }, async () => {
  const yo = await get('/auth/yo', tokenOp);
  assert.equal(yo.status, 200);
  const idOp = yo.json.usuario.id;

  const cambio = await post(`/usuarios/${idOp}/cambiar-password`, {
    password: 'Nueva.Operador.2026',
    password_actual: 'Prueba.Operador.2026',
  }, tokenOp);
  assert.equal(cambio.status, 200);

  // El token emitido antes del cambio deja de ser válido.
  const conTokenViejo = await get('/clientes', tokenOp);
  assert.equal(conTokenViejo.status, 401);
  assert.equal(conTokenViejo.json.error.codigo, 'NO_AUTENTICADO');

  // Un login nuevo con la contraseña nueva sí funciona.
  const reLogin = await api(base, 'POST', '/auth/login', {
    body: { nombre_usuario: 'operador.autoscolombia', password: 'Nueva.Operador.2026' },
  });
  assert.equal(reLogin.status, 200);
  tokenOp = reLogin.json.token;

  const conTokenNuevo = await get('/clientes', tokenOp);
  assert.equal(conTokenNuevo.status, 200);
});

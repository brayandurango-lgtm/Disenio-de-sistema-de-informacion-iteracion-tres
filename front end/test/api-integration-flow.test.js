import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { preparar, cerrar, login, api, integrationDisponible, marcadoresFlujoFrontend, limpiarFlujoFrontend, verificarPoolBaseDePruebas } from '../../back end/test/integration/helpers.js';

test('flujo integrado frontend: recorrido completo de cliente, estancia, pago e idempotencia', async (t) => {
  if (!integrationDisponible) {
    t.skip('Pruebas de integración requieren TEST_MODE=1 y base _test');
    return;
  }

  const runId = randomUUID();
  const marca = marcadoresFlujoFrontend(runId);
  t.after(async () => {
    await cerrar();
    const limpieza = await limpiarFlujoFrontend(runId);
    assert.deepEqual(limpieza.residuos, { clientes: 0, celdas: 0, vehiculos: 0 });
  });

  const ctx = await preparar();
  await verificarPoolBaseDePruebas();

  const base = ctx.base;

  // 1. Salud
  const s = await api(base, 'GET', '/salud');
  assert.equal(s.status, 200);
  assert.equal(s.json.estado, 'ok');

  const sdb = await api(base, 'GET', '/salud/db');
  assert.equal(sdb.status, 200);
  assert.equal(sdb.json.db, 'conectada');

  // 2. Autenticación
  const tokenAdmin = await login(base, 'admin.autoscolombia', 'Prueba.Admin.2026');
  const tokenOp = await login(base, 'operador.autoscolombia', 'Prueba.Operador.2026');
  assert.ok(tokenAdmin);
  assert.ok(tokenOp);

  // 3. Permisos: operador no crea celdas ni anula pagos
  const opCelda = await api(base, 'POST', '/celdas', {
    token: tokenOp,
    body: { codigo: 'X-99', tipo: 'cubierta', estado: 'habilitada' }
  });
  assert.equal(opCelda.status, 403, 'Operador debe recibir 403 al intentar crear celdas');

  // 4. Admin crea celda de prueba
  const celdaCodigo = marca.codigoCelda;
  const adminCelda = await api(base, 'POST', '/celdas', {
    token: tokenAdmin,
    body: { codigo: celdaCodigo, tipo: 'cubierta', estado: 'habilitada' }
  });
  assert.equal(adminCelda.status, 201);
  const celdaId = adminCelda.json.id;

  // 5. Crear Cliente
  const docNum = marca.documento;
  const rCliente = await api(base, 'POST', '/clientes', {
    token: tokenOp,
    body: {
      tipo_documento: 'CC',
      numero_documento: docNum,
      nombres: 'Prueba',
      apellidos: 'Frontend Flow',
      telefono: '3001234567',
      correo: marca.correo
    }
  });
  assert.equal(rCliente.status, 201);
  const clienteId = rCliente.json.id;

  // 6. Crear Vehículo con placa normalizada
  const placaTest = marca.placa;
  const rVeh = await api(base, 'POST', '/vehiculos', {
    token: tokenOp,
    body: {
      cliente_id: clienteId,
      placa: placaTest,
      marca: 'Mazda',
      modelo: 'CX-30',
      anio: 2023,
      color: 'Gris'
    }
  });
  assert.equal(rVeh.status, 201);
  const vehiculoId = rVeh.json.id;

  // 7. Entrada a la celda
  const rEntrada = await api(base, 'POST', '/estancias', {
    token: tokenOp,
    body: { vehiculo_id: vehiculoId, celda_id: celdaId }
  });
  assert.equal(rEntrada.status, 201);
  const estanciaId = rEntrada.json.id;

  // 8. Celda ocupada rechaza nueva entrada simultánea
  const rDobleEntrada = await api(base, 'POST', '/estancias', {
    token: tokenOp,
    body: { vehiculo_id: vehiculoId, celda_id: celdaId }
  });
  assert.equal(rDobleEntrada.status, 409, 'Debe rechazar entrada si la celda o el vehículo están ocupados');

  // 9. Salida y liberación de celda
  const rSalida = await api(base, 'POST', `/estancias/${estanciaId}/salida`, {
    token: tokenOp,
    body: { motivo_salida: 'Fin de recorrido de prueba' }
  });
  assert.equal(rSalida.status, 200);

  // 10. Crear Contrato de Mensualidad
  const rContrato = await api(base, 'POST', '/contratos', {
    token: tokenOp,
    body: {
      cliente_id: clienteId,
      vehiculo_id: vehiculoId,
      tarifa_mensual: '135000.00',
      fecha_inicio: '2026-11-01',
      fecha_fin: null
    }
  });
  assert.equal(rContrato.status, 201);
  const contratoId = rContrato.json.id;

  // 11. Generar Obligación
  const rGen = await api(base, 'POST', `/contratos/${contratoId}/obligaciones/generar`, {
    token: tokenOp,
    body: {
      periodos: ['2026-11'],
      dia_vencimiento: 5
    }
  });
  assert.equal(rGen.status, 201);
  assert.equal(rGen.json.generadas, 1);
  const obligacionId = rGen.json.obligaciones[0].id;

  // 12. Pago Idempotente
  const claveIdempotencia = randomUUID();
  const rPago1 = await api(base, 'POST', '/pagos', {
    token: tokenOp,
    body: {
      obligacion_id: obligacionId,
      metodo_pago: 'efectivo',
      clave_idempotencia: claveIdempotencia,
      monto: '135000.00'
    }
  });
  assert.equal(rPago1.status, 201);
  assert.match(rPago1.json.comprobante, /^CMP-\d{4}-\d{6}$/);
  const pagoId = rPago1.json.id;

  // 13. Reintento con la misma clave e idénticos datos -> debe devolver el mismo pago con HTTP 200
  const rPagoReintento = await api(base, 'POST', '/pagos', {
    token: tokenOp,
    body: {
      obligacion_id: obligacionId,
      metodo_pago: 'efectivo',
      clave_idempotencia: claveIdempotencia,
      monto: '135000.00'
    }
  });
  assert.equal(rPagoReintento.status, 200, 'Reintento idempotente debe retornar HTTP 200');
  assert.equal(rPagoReintento.json.id, pagoId);
  assert.equal(rPagoReintento.json.comprobante, rPago1.json.comprobante);

  // 14. Misma clave con datos distintos -> HTTP 409 IDEMPOTENCIA_CONFLICTO
  const rPagoConflicto = await api(base, 'POST', '/pagos', {
    token: tokenOp,
    body: {
      obligacion_id: obligacionId,
      metodo_pago: 'transferencia',
      clave_idempotencia: claveIdempotencia,
      monto: '135000.00'
    }
  });
  assert.equal(rPagoConflicto.status, 409);
  assert.equal(rPagoConflicto.json.error.codigo, 'IDEMPOTENCIA_CONFLICTO');

  // 15. Consultar comprobante
  const rComp = await api(base, 'GET', `/pagos/${pagoId}/comprobante`, { token: tokenOp });
  assert.equal(rComp.status, 200);
  assert.equal(rComp.json.comprobante, rPago1.json.comprobante);

  // 16. Operador no puede anular pago (403)
  const rAnularOp = await api(base, 'POST', `/pagos/${pagoId}/anular`, {
    token: tokenOp,
    body: { motivo: 'Intento de operador' }
  });
  assert.equal(rAnularOp.status, 403);

  // 17. Admin anula pago con motivo
  const rAnularAdmin = await api(base, 'POST', `/pagos/${pagoId}/anular`, {
    token: tokenAdmin,
    body: { motivo: 'Corrección contable en prueba automatizada' }
  });
  assert.equal(rAnularAdmin.status, 200);
  assert.equal(rAnularAdmin.json.estado, 'anulado');

  // 18. Obligación vuelve a 'pendiente' y admite re-pago
  const rOblVerif = await api(base, 'GET', `/obligaciones/${obligacionId}`, { token: tokenOp });
  assert.equal(rOblVerif.status, 200);
  assert.equal(rOblVerif.json.estado, 'pendiente');

  // 19. Re-pago con nueva clave
  const claveRepago = randomUUID();
  const rRepago = await api(base, 'POST', '/pagos', {
    token: tokenOp,
    body: {
      obligacion_id: obligacionId,
      metodo_pago: 'transferencia',
      clave_idempotencia: claveRepago,
      monto: '135000.00'
    }
  });
  assert.equal(rRepago.status, 201);
  assert.notEqual(rRepago.json.comprobante, rPago1.json.comprobante);

  // 20. Resumen de cliente refleja pagos
  const rResumen = await api(base, 'GET', `/resumen/cliente/${clienteId}`, { token: tokenOp });
  assert.equal(rResumen.status, 200);
  assert.equal(rResumen.json.cliente_id, clienteId);
  assert.ok(rResumen.json.deuda);
});

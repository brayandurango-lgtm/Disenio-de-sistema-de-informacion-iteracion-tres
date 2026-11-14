import test from 'node:test';
import assert from 'node:assert/strict';
import { generarUUIDv4, obtenerOIniciarIntento, registrarResultadoIntento, cancelarIntento } from '../src/services/idempotency.js';

test('generarUUIDv4 produce identificadores conformes a RFC4122 v4', () => {
  const uuid1 = generarUUIDv4();
  const uuid2 = generarUUIDv4();
  const re = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  assert.match(uuid1, re);
  assert.match(uuid2, re);
  assert.notEqual(uuid1, uuid2);
});

test('obtenerOIniciarIntento crea un nuevo intento con clave única', () => {
  const intento = obtenerOIniciarIntento(999, { monto: '120000.00', metodoPago: 'efectivo' });
  assert.equal(intento.obligacionId, 999);
  assert.equal(intento.monto, '120000.00');
  assert.equal(intento.estado, 'iniciado');
  assert.ok(intento.claveIdempotencia);
  cancelarIntento(999);
});

test('reintento ante resultado incierto preserva exactamente la misma clave de idempotencia', () => {
  const intento1 = obtenerOIniciarIntento(888, { monto: '150000.00' });
  const claveOriginal = intento1.claveIdempotencia;

  // Se simula corte de red
  registrarResultadoIntento(888, { estado: 'incierto', error: new Error('Network timeout') });

  // Se reintenta el pago
  const intentoReintento = obtenerOIniciarIntento(888);
  assert.equal(intentoReintento.estado, 'incierto');
  assert.equal(intentoReintento.claveIdempotencia, claveOriginal, 'Debe reutilizar la misma clave para evitar doble cobro');

  cancelarIntento(888);
});

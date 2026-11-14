import test from 'node:test';
import assert from 'node:assert/strict';
import { formatearMonedaCOP, formatearPeriodo, escapeHTML } from '../src/utils/formatters.js';
import { esPlacaValida, limpiarPlaca, esPeriodoValido, esUUIDValido } from '../src/utils/validators.js';

test('formatearMonedaCOP preserva la precisión decimal de strings sin aproximaciones float', () => {
  assert.equal(formatearMonedaCOP('120000.00'), '$120.000.00 COP');
  assert.equal(formatearMonedaCOP('1500000.50'), '$1.500.000.50 COP');
  assert.equal(formatearMonedaCOP(0), '$0 COP');
  assert.equal(formatearMonedaCOP(null), '$0 COP');
});

test('formatearPeriodo convierte YYYY-MM a nombres legibles en español', () => {
  assert.equal(formatearPeriodo('2026-11'), 'Noviembre de 2026');
  assert.equal(formatearPeriodo('2026-01'), 'Enero de 2026');
  assert.equal(formatearPeriodo('2026-12'), 'Diciembre de 2026');
});

test('escapeHTML neutraliza vectores comunes de inyección XSS', () => {
  assert.equal(escapeHTML('<script>alert("xss")</script>'), '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  assert.equal(escapeHTML('Placa "ABC123" & \'DEF456\''), 'Placa &quot;ABC123&quot; &amp; &#39;DEF456&#39;');
});

test('validadores de placa vehicular', () => {
  assert.equal(esPlacaValida('ABC123'), true);
  assert.equal(esPlacaValida('ABC12D'), true); // moto
  assert.equal(esPlacaValida('abc 123'), true); // tras limpiar
  assert.equal(esPlacaValida('INVALID'), false);
  assert.equal(limpiarPlaca('  abc - 123  '), 'ABC123');
});

test('validadores de periodo y UUID', () => {
  assert.equal(esPeriodoValido('2026-11'), true);
  assert.equal(esPeriodoValido('2026-13'), false);
  assert.equal(esPeriodoValido('invalid'), false);
  assert.equal(esUUIDValido('3f1c9a1e-7b2d-4c55-9a10-0f6a2b8c9d11'), true);
  assert.equal(esUUIDValido('not-a-uuid'), false);
});

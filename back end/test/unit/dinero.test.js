import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aDecimalStr, sumarDecimales } from '../../src/utils/dinero.js';
import { AppError } from '../../src/errors.js';

test('aDecimalStr normaliza a 2 decimales', () => {
  assert.equal(aDecimalStr('120000'), '120000.00');
  assert.equal(aDecimalStr('120000.5'), '120000.50');
  assert.equal(aDecimalStr('120000.55'), '120000.55');
  assert.equal(aDecimalStr('  150000.00 '), '150000.00');
  assert.equal(aDecimalStr(2500), '2500.00');
});

test('aDecimalStr rechaza formatos inválidos', () => {
  for (const malo of ['abc', '-5', '1.234', '1,5', '', '0', '0.00', '10000000000']) {
    assert.throws(() => aDecimalStr(malo), (e) => e instanceof AppError && e.codigo === 'VALIDACION', `debería fallar: ${malo}`);
  }
});

test('sumarDecimales es exacto (sin float)', () => {
  assert.equal(sumarDecimales(['120000.00', '150000.50', '0.10']), '270000.60');
  assert.equal(sumarDecimales([]), '0.00');
  assert.equal(sumarDecimales(['9999999999.99']), '9999999999.99');
});

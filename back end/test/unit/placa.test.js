import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarPlaca } from '../../src/utils/placa.js';

test('normalizarPlaca limpia y valida', () => {
  assert.equal(normalizarPlaca('abc 123'), 'ABC123');
  assert.equal(normalizarPlaca(' abc-123 '), 'ABC123');
  assert.equal(normalizarPlaca('ABC123'), 'ABC123');
  assert.equal(normalizarPlaca('A'), null);
  assert.equal(normalizarPlaca(''), null);
  assert.equal(normalizarPlaca('PLACAMUYLAN-GA12'), null);
  assert.equal(normalizarPlaca('ABC_123'), null);
  assert.equal(normalizarPlaca(null), null);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verificarPassword, huellaPassword } from '../../src/auth/password.js';

test('hashPassword + verificarPassword', async () => {
  const hash = await hashPassword('Clave.Segura.2026');
  assert.match(hash, /^\$2[aby]\$12\$/);
  assert.equal(await verificarPassword('Clave.Segura.2026', hash), true);
  assert.equal(await verificarPassword('otra-clave', hash), false);
  assert.equal(await verificarPassword('x', 'no-es-un-hash'), false);
});

test('huellaPassword cambia cuando cambia el hash (invalida tokens)', async () => {
  const h1 = await hashPassword('Clave.Segura.2026');
  const h2 = await hashPassword('Clave.Segura.2026');
  assert.notEqual(h1, h2, 'bcrypt debe usar sal aleatoria');
  assert.notEqual(huellaPassword(h1), huellaPassword(h2));
  assert.equal(huellaPassword(h1), huellaPassword(h1));
  assert.equal(huellaPassword(h1).length, 24);
});

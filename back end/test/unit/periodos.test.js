import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  esPeriodoValido, exigirPeriodo, esFechaValida, esPrimerDiaDeMes,
  esUltimoDiaDeMes, periodosDeVigencia, periodosEntre,
} from '../../src/utils/periodos.js';
import { AppError } from '../../src/errors.js';

test('esPeriodoValido acepta YYYY-MM correcto y rechaza inválidos', () => {
  assert.equal(esPeriodoValido('2026-11'), true);
  assert.equal(esPeriodoValido('2026-00'), false);
  assert.equal(esPeriodoValido('2026-13'), false);
  assert.equal(esPeriodoValido('2026-1'), false);
  assert.equal(esPeriodoValido('26-11'), false);
  assert.equal(esPeriodoValido('2026-11-01'), false);
  assert.equal(esPeriodoValido(202611), false);
});

test('exigirPeriodo lanza VALIDACION en periodo inválido', () => {
  assert.throws(() => exigirPeriodo('2026-13'), (e) => e instanceof AppError && e.codigo === 'VALIDACION');
});

test('esFechaValida rechaza fechas inexistentes', () => {
  assert.equal(esFechaValida('2026-02-28'), true);
  assert.equal(esFechaValida('2026-02-31'), false);
  assert.equal(esFechaValida('2026-13-01'), false);
  assert.equal(esFechaValida('2026-1-1'), false);
});

test('esPrimerDiaDeMes / esUltimoDiaDeMes', () => {
  assert.equal(esPrimerDiaDeMes('2026-01-01'), true);
  assert.equal(esPrimerDiaDeMes('2026-01-02'), false);
  assert.equal(esUltimoDiaDeMes('2026-02-28'), true);   // 2026 no es bisiesto
  assert.equal(esUltimoDiaDeMes('2024-02-29'), true);   // 2024 bisiesto
  assert.equal(esUltimoDiaDeMes('2026-02-27'), false);
});

test('periodosDeVigencia valida reglas de contrato', () => {
  const ok = periodosDeVigencia('2026-01-01', null);
  assert.deepEqual(ok, { pInicio: '2026-01', pFin: '9999-12', ultimo: true });
  assert.throws(() => periodosDeVigencia('2026-01-15', null), AppError);
  assert.throws(() => periodosDeVigencia('2026-01-01', '2026-06-29'), AppError);
  assert.throws(() => periodosDeVigencia('2026-02-01', '2026-01-31'), AppError);
  const cerrado = periodosDeVigencia('2026-01-01', '2026-06-30');
  assert.equal(cerrado.pFin, '2026-06');
});

test('periodosEntre genera meses calendario inclusivos', () => {
  assert.deepEqual(periodosEntre('2026-11', '2027-02'),
    ['2026-11', '2026-12', '2027-01', '2027-02']);
  assert.deepEqual(periodosEntre('2026-12', '2026-12'), ['2026-12']);
  assert.deepEqual(periodosEntre('2026-11', '2027-01', { desde: '2026-12' }),
    ['2026-12', '2027-01']);
});

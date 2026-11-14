import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aHoraBogota, ahoraBogota, hoyBogota, sumarMeses, sumarDias } from '../../src/utils/fechas.js';

test('aHoraBogota convierte offsets a hora Bogotá (UTC-5)', () => {
  // 2026-11-13T15:30:00Z = 10:30 Bogotá
  assert.equal(aHoraBogota('2026-11-13T15:30:00Z'), '2026-11-13 10:30:00');
  assert.equal(aHoraBogota('2026-11-13T10:30:00-05:00'), '2026-11-13 10:30:00');
  // Cruce de medianoche al convertir
  assert.equal(aHoraBogota('2026-11-14T02:00:00Z'), '2026-11-13 21:00:00');
});

test('aHoraBogota interpreta naive como hora Bogotá', () => {
  assert.equal(aHoraBogota('2026-11-13T09:05:00'), '2026-11-13 09:05:00');
  assert.equal(aHoraBogota('2026-11-13 09:05'), '2026-11-13 09:05:00');
  // Fecha sola = medianoche Bogotá (no se interpreta como UTC)
  assert.equal(aHoraBogota('2026-11-13'), '2026-11-13 00:00:00');
  // Milisegundos naive: se truncan sin desplazar la zona
  assert.equal(aHoraBogota('2026-11-13T09:05:07.850'), '2026-11-13 09:05:07');
});

test('aHoraBogota rechaza entradas inválidas', () => {
  assert.throws(() => aHoraBogota('no-es-fecha'));
  assert.throws(() => aHoraBogota(''));
  assert.throws(() => aHoraBogota('2026-02-31T09:00:00'));
});

test('ahoraBogota/hoyBogota tienen formato DATETIME/DATE Bogotá', () => {
  assert.match(ahoraBogota(), /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  assert.match(hoyBogota(), /^\d{4}-\d{2}-\d{2}$/);
});

test('sumarMeses y sumarDias', () => {
  assert.equal(sumarMeses('2026-11', 1), '2026-12');
  assert.equal(sumarMeses('2026-12', 1), '2027-01');
  assert.equal(sumarMeses('2026-01', -1), '2025-12');
  assert.equal(sumarDias('2026-01-31', 1), '2026-02-01');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { VEHICULOS_DEMO } from '../src/data/catalogo-demostrativo.js';
import { CONFIG_CONTACTO_Y_SEDES } from '../src/data/config-sedes.js';

test('catálogo demostrativo contiene únicamente elementos ficticios rotulados', () => {
  assert.ok(VEHICULOS_DEMO.length >= 5, 'Debe incluir al menos 5 vehículos');
  for (const v of VEHICULOS_DEMO) {
    assert.ok(v.id.startsWith('demo-'));
    assert.equal(v.etiqueta, 'Demostración Ilustrativa');
    assert.ok(v.precioIlustrativoCOP > 0);
    assert.ok(v.precioFormateado.includes('COP'));
  }
});

test('configuración de sedes y contacto transparenta estado pendiente sin inventar datos comerciales', () => {
  assert.equal(CONFIG_CONTACTO_Y_SEDES.canales.telefono.estado, 'pendiente');
  assert.ok(CONFIG_CONTACTO_Y_SEDES.canales.telefono.mensaje.includes('pendiente'));
  assert.ok(CONFIG_CONTACTO_Y_SEDES.sedes[0].direccion.includes('pendiente'));
});

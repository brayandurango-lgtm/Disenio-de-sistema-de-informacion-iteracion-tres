// Guardia explícita para operaciones sobre la base de PRUEBAS.
// Reglas (todas obligatorias):
//   1. DB_NAME debe ser exactamente 'Disenio_de_sistema_de_informacion_iteracion_tres_test'.
//   2. TEST_MODE=1 debe estar definido.
//   3. Para operaciones destructivas (reset/seed), ALLOW_TEST_DB_RESET=1.
// Nunca permite apuntar a la base principal ni a otro nombre.

export const DB_TEST_NOMBRE = 'Disenio_de_sistema_de_informacion_iteracion_tres_test';
export const DB_PRINCIPAL_NOMBRE = 'Disenio_de_sistema_de_informacion_iteracion_tres';

export function assertBaseDePruebas(nombre) {
  if (nombre === DB_PRINCIPAL_NOMBRE) {
    throw new Error('Operación bloqueada: la base configurada es la principal de la aplicación.');
  }
  if (nombre !== DB_TEST_NOMBRE) {
    throw new Error(`Operación bloqueada: '${nombre}' no es la base de pruebas autorizada '${DB_TEST_NOMBRE}'.`);
  }
  if (process.env.TEST_MODE !== '1') {
    throw new Error('Operación bloqueada: TEST_MODE=1 no está definido en el entorno.');
  }
  return true;
}

export function assertPermisoReset() {
  assertBaseDePruebas(process.env.DB_NAME);
  if (process.env.ALLOW_TEST_DB_RESET !== '1') {
    throw new Error('Operación destructiva bloqueada: defina ALLOW_TEST_DB_RESET=1 para autorizar limpieza de la base de pruebas.');
  }
  return true;
}

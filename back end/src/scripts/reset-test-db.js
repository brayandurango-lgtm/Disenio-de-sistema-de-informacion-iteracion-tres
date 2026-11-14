// Limpieza de la base de PRUEBAS (borra todas las filas y recrea usuarios
// semilla). Guardas obligatorias en src/utils/testdb.js:
//   TEST_MODE=1, ALLOW_TEST_DB_RESET=1 y DB_NAME=..._test.
// Uso:
//   TEST_MODE=1 ALLOW_TEST_DB_RESET=1 DB_NAME=Disenio_de_sistema_de_informacion_iteracion_tres_test \
//   node src/scripts/reset-test-db.js
import 'dotenv/config';
import { assertPermisoReset, DB_TEST_NOMBRE } from '../utils/testdb.js';
import { resetDb as resetEnHelpers } from '../../test/integration/helpers.js';

// helpers.resetDb ya aplica las guardas y recrea usuarios; lo invocamos.
try {
  assertPermisoReset();
  if (process.env.DB_NAME !== DB_TEST_NOMBRE) throw new Error('nombre de base incorrecto');
} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
}

resetEnHelpers().then(() => {
  console.log(`Base de pruebas '${DB_TEST_NOMBRE}' reiniciada con usuarios semilla.`);
}).catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});

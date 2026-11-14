// Prepara los usuarios de prueba con contraseñas bcrypt generadas en el momento.
// SOLO para la base de pruebas (ver src/utils/testdb.js).
// Uso:  TEST_MODE=1 DB_NAME=Disenio_de_sistema_de_informacion_iteracion_tres_test \
//       node src/scripts/seed-test-users.js
// Genera hash aleatorios con contraseñas documentadas de prueba; nunca imprime
// las contraseñas ni los hash completos.
import 'dotenv/config';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { assertBaseDePruebas, DB_TEST_NOMBRE } from '../utils/testdb.js';

function reqEnv(n) {
  const v = process.env[n];
  if (!v) throw new Error(`Falta ${n} en .env`);
  return v;
}

const USUARIOS = [
  { nombre_usuario: 'admin.autoscolombia', correo: 'admin@autoscolombia.example', rol: 'administrador', password: 'Prueba.Admin.2026' },
  { nombre_usuario: 'operador.autoscolombia', correo: 'operador@autoscolombia.example', rol: 'operador', password: 'Prueba.Operador.2026' },
];

async function main() {
  const dbName = reqEnv('DB_NAME');
  assertBaseDePruebas(dbName);
  if (dbName !== DB_TEST_NOMBRE) throw new Error('inalcanzable');

  const conn = await mysql.createConnection({
    host: reqEnv('DB_HOST'), port: Number(process.env.DB_PORT || 3306),
    user: reqEnv('DB_USER'), password: reqEnv('DB_PASSWORD'), database: dbName,
  });
  try {
    const [[fila]] = await conn.query('SELECT DATABASE() AS db');
    // En Windows (lower_case_table_names=1) el servidor devuelve minúsculas.
    if (String(fila.db).toLowerCase() !== DB_TEST_NOMBRE.toLowerCase()) {
      throw new Error(`La conexión apunta a '${fila.db}', no a la base de pruebas '${DB_TEST_NOMBRE}'`);
    }
    for (const u of USUARIOS) {
      const hash = await bcrypt.hash(u.password, 12);
      await conn.query(
        `INSERT INTO usuarios (cliente_id, nombre_usuario, correo, password_hash, rol, activo)
         VALUES (NULL, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), rol = VALUES(rol), activo = 1`,
        [u.nombre_usuario, u.correo, hash, u.rol],
      );
      console.log(`Usuario de prueba listo: ${u.nombre_usuario} (${u.rol})`);
    }
    console.log('Credenciales de prueba documentadas en seeds/001_datos_ficticios.sql');
  } finally {
    await conn.end();
  }
}

main().catch((err) => { console.error('Error:', err.message); process.exit(1); });

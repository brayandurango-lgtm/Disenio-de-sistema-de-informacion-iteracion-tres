// Crea (o actualiza la contraseña de) la cuenta de administrador inicial.
// Uso:  node src/scripts/create-admin.js
// La contraseña se pide de forma interactiva (no queda en el historial ni en
// argumentos). Alternativa no interactiva: ADMIN_PASSWORD=<valor> node ...
// Requiere .env con DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME.
import 'dotenv/config';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

function reqEnv(n) {
  const v = process.env[n];
  if (!v) throw new Error(`Falta ${n} en .env`);
  return v;
}

function preguntarOculto(pregunta) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input, output });
    // Ocultar eco no es trivial en stdin plano; pedimos la contraseña y la
    // confirmamos. Nunca se imprime el valor.
    rl.question(`${pregunta}: `, (resp) => {
      rl.close();
      resolve(resp);
    });
  });
}

async function main() {
  const conn = await mysql.createConnection({
    host: reqEnv('DB_HOST'),
    port: Number(process.env.DB_PORT || 3306),
    user: reqEnv('DB_USER'),
    password: reqEnv('DB_PASSWORD'),
    database: reqEnv('DB_NAME'),
  });

  try {
    const [args] = process.argv.slice(2);
    const nombreUsuario = args || 'admin.autoscolombia';
    const correo = process.env.ADMIN_CORREO || 'admin@autoscolombia.local';

    let password = process.env.ADMIN_PASSWORD;
    if (!password) {
      password = await preguntarOculto('Contraseña del administrador (mín. 10 caracteres)');
      const conf = await preguntarOculto('Confirme la contraseña');
      if (password !== conf) throw new Error('Las contraseñas no coinciden');
    }
    if (typeof password !== 'string' || password.length < 10) {
      throw new Error('La contraseña debe tener al menos 10 caracteres');
    }

    const hash = await bcrypt.hash(password, 12);

    // Si el usuario existe, solo se actualiza su hash (idempotente).
    const [existe] = await conn.query(
      'SELECT id FROM usuarios WHERE nombre_usuario = ?', [nombreUsuario],
    );
    if (existe.length) {
      await conn.query(
        'UPDATE usuarios SET password_hash = ?, activo = 1 WHERE nombre_usuario = ?',
        [hash, nombreUsuario],
      );
      console.log(`Contraseña actualizada para '${nombreUsuario}'.`);
    } else {
      await conn.query(
        `INSERT INTO usuarios (cliente_id, nombre_usuario, correo, password_hash, rol, activo)
         VALUES (NULL, ?, ?, ?, 'administrador', 1)`,
        [nombreUsuario, correo, hash],
      );
      console.log(`Administrador '${nombreUsuario}' creado.`);
    }
    console.log('Listo. Inicie sesión con POST /api/auth/login.');
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});

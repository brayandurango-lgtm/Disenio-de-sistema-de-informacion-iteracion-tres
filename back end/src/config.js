// Configuración validada. Nunca imprime secretos en errores.
import 'dotenv/config';

function req(nombre) {
  const v = process.env[nombre];
  if (v === undefined || v === '') {
    throw new Error(`Falta la variable de entorno requerida: ${nombre}. Copie .env.example a .env y configure los valores.`);
  }
  return v;
}

function opt(nombre, defecto) {
  const v = process.env[nombre];
  return v === undefined || v === '' ? defecto : v;
}

const config = {
  env: opt('NODE_ENV', 'development'),
  port: Number(opt('PORT', '3000')),
  db: {
    host: req('DB_HOST'),
    port: Number(opt('DB_PORT', '3306')),
    user: req('DB_USER'),
    password: req('DB_PASSWORD'),
    database: req('DB_NAME'),
    connectionLimit: Number(opt('DB_POOL_SIZE', '10')),
    // dateStrings: DATETIME/DATE llegan como cadenas 'YYYY-MM-DD HH:MM:SS'
    // en hora de Bogotá, sin conversiones de zona horaria del driver.
    dateStrings: true,
    // decimalNumbers:false (defecto): DECIMAL llega como cadena, preserva precisión.
  },
  jwt: {
    secret: req('JWT_SECRET'),
    expiresIn: opt('JWT_EXPIRES_IN', '8h'),
  },
  // Orígenes CORS permitidos, separados por coma. Vacío = sin CORS (solo mismo origen).
  corsOrigins: opt('CORS_ORIGIN', '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  // Límite de intentos de login por IP+usuario (memoria del proceso).
  loginMaxIntentos: Number(opt('LOGIN_MAX_INTENTOS', '5')),
  loginVentanaMs: Number(opt('LOGIN_VENTANA_MS', String(15 * 60 * 1000))),
};

export default config;

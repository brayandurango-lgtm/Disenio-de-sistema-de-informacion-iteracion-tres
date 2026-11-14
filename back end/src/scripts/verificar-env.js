// Verificación de configuración SIN imprimir valores.
// Uso: node src/scripts/verificar-env.js [rutaEnv]
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';

const archivo = process.argv[2] || '.env';
const requeridas = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];
const opcionales = ['PORT', 'DB_POOL_SIZE', 'NODE_ENV', 'JWT_EXPIRES_IN', 'CORS_ORIGIN', 'LOGIN_MAX_INTENTOS', 'LOGIN_VENTANA_MS'];
const placeholders = new Set([
  'usuario_aplicacion',
  'CAMBIAR',
  'CAMBIAR_POR_SECRETO_LARGO_ALEATORIO',
]);

if (!fs.existsSync(archivo)) {
  console.log(`RESULTADO: ${path.basename(archivo)} no existe`);
  process.exit(1);
}

const lineas = fs.readFileSync(archivo, 'utf8').split(/\r?\n/);
const claves = new Map();
for (const linea of lineas) {
  const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (!m) continue;
  const [, clave, valor] = m;
  if (claves.has(clave)) {
    console.log(`DUPLICADA: ${clave}`);
  }
  claves.set(clave, valor.trim());
}

let problemas = 0;
function estado(clave, valor) {
  if (valor === undefined) return { texto: 'AUSENTE', mal: true };
  if (valor === '') return { texto: 'VACIA', mal: true };
  if (placeholders.has(valor)) return { texto: 'PLACEHOLDER_DEL_EJEMPLO', mal: true };
  return { texto: 'DEFINIDA', mal: false };
}

for (const clave of requeridas) {
  const { texto, mal } = estado(clave, claves.get(clave));
  if (mal) problemas += 1;
  console.log(`${clave}: ${texto}`);
}

for (const clave of opcionales) {
  const valor = claves.get(clave);
  if (valor === undefined) {
    console.log(`${clave}: no definida (se usa el valor por defecto)`);
  } else if (valor === '') {
    console.log(`${clave}: vacia`);
  } else if (clave === 'CORS_ORIGIN') {
    const origenes = valor.split(',').map((s) => s.trim()).filter(Boolean);
    const comodin = origenes.includes('*');
    console.log(`CORS_ORIGIN: ${origenes.length} origen(es), comodin=${comodin ? 'SI' : 'NO'}`);
    if (comodin) problemas += 1;
  } else if (clave === 'PORT') {
    console.log(`PORT: ${valor}`);
  } else if (clave === 'NODE_ENV') {
    console.log(`NODE_ENV: ${valor}`);
  } else {
    console.log(`${clave}: definida`);
  }
}

const nombreEsperado = 'Disenio_de_sistema_de_informacion_iteracion_tres';
const nombre = claves.get('DB_NAME');
if (nombre !== undefined) {
  const ok = nombre === nombreEsperado || nombre === `${nombreEsperado}_test`;
  console.log(`DB_NAME: ${ok ? 'coincide con un nombre autorizado' : 'NO coincide con un nombre autorizado'}`);
  if (!ok) problemas += 1;
}

const jwt = claves.get('JWT_SECRET');
if (jwt && !placeholders.has(jwt)) {
  console.log(`JWT_SECRET: longitud ${jwt.length >= 32 ? 'suficiente (>=32)' : 'CORTA (<32)'}`);
  if (jwt.length < 32) problemas += 1;
}

function puertoLibre(puerto) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', () => resolve(false));
    srv.once('listening', () => srv.close(() => resolve(true)));
    srv.listen(Number(puerto), '127.0.0.1');
  });
}

const puerto = claves.get('PORT') || '3000';
const libre = await puertoLibre(puerto);
console.log(`PUEERTO_${puerto}: ${libre ? 'libre en 127.0.0.1' : 'OCUPADO en 127.0.0.1'}`.replace('PUEERTO', 'PUERTO'));
if (!libre) problemas += 1;

console.log(`RESULTADO: ${problemas === 0 ? 'completo para conectar' : `${problemas} campo(s) por resolver`}`);
process.exit(problemas === 0 ? 0 : 2);

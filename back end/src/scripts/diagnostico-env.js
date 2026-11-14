// Diagnóstico de formato de .env SIN imprimir valores.
import fs from 'node:fs';

const archivo = '.env';
if (!fs.existsSync(archivo)) {
  console.log('no existe .env');
  process.exit(1);
}
const buf = fs.readFileSync(archivo);
console.log(`bom=${buf[0] === 0xef ? 'SI' : 'NO'} crlf=${buf.includes(0x0d) ? 'SI' : 'NO'}`);

const lineas = buf.toString('utf8').split(/\r?\n/);
const interes = new Set(['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET', 'PORT']);
const crudas = new Map();
for (const linea of lineas) {
  const m = linea.match(/^\s*([A-Z0-9_]+)\s*=(.*)$/);
  if (!m || !interes.has(m[1])) continue;
  crudas.set(m[1], m[2]);
}

for (const clave of ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_NAME']) {
  console.log(`${clave}=${crudas.get(clave) ?? '(ausente)'}`);
}
console.log(`PORT=${crudas.get('PORT') ?? '(ausente)'}`);

const raw = crudas.get('DB_PASSWORD');
if (raw === undefined) {
  console.log('DB_PASSWORD: ausente de la línea');
} else {
  const sinComillas = raw.replace(/^(['"])(.*)\1$/, '$2');
  const flags = [];
  if (/^\s/.test(raw) || /\s$/.test(raw)) flags.push('espacios_alrededor');
  if (/^['"]/.test(raw) || /['"]$/.test(raw)) flags.push('comillas');
  if (/ #/.test(raw)) flags.push('posible_comentario');
  if (/\s/.test(sinComillas)) flags.push('espacio_interno');
  if (raw.startsWith('"') && sinComillas.includes('$')) flags.push('posible_expansion_$');
  if (sinComillas.includes('#') && !/^['"]/.test(raw)) flags.push('hash_sin_comillas');
  console.log(`DB_PASSWORD: longitud=${sinComillas.length} flags=${flags.length ? flags.join(',') : 'ninguno'}`);
}

const jwt = crudas.get('JWT_SECRET');
if (jwt !== undefined) {
  const sinComillas = jwt.replace(/^(['"])(.*)\1$/, '$2');
  console.log(`JWT_SECRET: longitud=${sinComillas.length} comillas=${/^['"]/.test(jwt) ? 'SI' : 'NO'}`);
}

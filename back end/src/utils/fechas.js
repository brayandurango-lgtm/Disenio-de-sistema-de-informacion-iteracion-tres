// Utilidades de fechas de negocio en hora de Colombia (America/Bogota = UTC-5
// fijo; Colombia no aplica horario de verano).
// Regla: las columnas DATETIME almacenan hora local Bogotá como texto
// 'YYYY-MM-DD HH:MM:SS' (la conexión usa dateStrings:true, sin conversiones).

const OFFSET_BOGOTA_MS = -5 * 60 * 60 * 1000;

const pad = (n) => String(n).padStart(2, '0');

function formatearUTC(d) {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

// Ahora en Bogotá como 'YYYY-MM-DD HH:MM:SS'
export function ahoraBogota() {
  return formatearUTC(new Date(Date.now() + OFFSET_BOGOTA_MS));
}

// Hoy en Bogotá como 'YYYY-MM-DD'
export function hoyBogota() {
  return ahoraBogota().slice(0, 10);
}

const NAIVE_ISO =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?)?$/;
const CON_OFFSET = /[zZ]|[+-]\d{2}:?\d{2}$/;

function esFechaReal(anio, mes, dia) {
  const dt = new Date(Date.UTC(anio, mes - 1, dia));
  return dt.getUTCFullYear() === anio && dt.getUTCMonth() === mes - 1 && dt.getUTCDate() === dia;
}

// Normaliza un instante ISO 8601 a hora Bogotá 'YYYY-MM-DD HH:MM:SS'.
// - Con offset (Z o ±HH:MM): se convierte al instante real y luego a Bogotá.
// - Sin offset: se interpreta como hora local Bogotá. Se aceptan fecha sola
//   ('AAAA-MM-DD' → 00:00), minutos opcionales y milisegundos (se truncan).
export function aHoraBogota(iso) {
  if (typeof iso !== 'string' || iso.trim() === '') {
    throw new Error('fecha_hora vacía o no textual');
  }
  const s = iso.trim();
  const naive = s.match(NAIVE_ISO);
  if (naive && !CON_OFFSET.test(s)) {
    const [anio, mes, dia] = [Number(naive[1]), Number(naive[2]), Number(naive[3])];
    if (!esFechaReal(anio, mes, dia)) {
      throw new Error(`Fecha inexistente: ${s}`);
    }
    return `${naive[1]}-${naive[2]}-${naive[3]} ${naive[4] ?? '00'}:${naive[5] ?? '00'}:${naive[6] ?? '00'}`;
  }
  const instante = new Date(s);
  if (Number.isNaN(instante.getTime())) {
    throw new Error(`Instante ISO 8601 inválido: ${s}`);
  }
  return formatearUTC(new Date(instante.getTime() + OFFSET_BOGOTA_MS));
}

// Convierte 'YYYY-MM-DD' (DATE de negocio) a 'YYYY-MM-DD 00:00:00' si hace falta.
export function fechaONull(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v !== 'string') throw new Error('fecha no textual');
  const s = v.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s} 00:00:00`;
  return aHoraBogota(s);
}

export function soloFecha(horaBogota) {
  return String(horaBogota).slice(0, 10);
}

// Suma meses a 'YYYY-MM' y devuelve 'YYYY-MM'.
export function sumarMeses(periodo, n) {
  const [a, m] = periodo.split('-').map(Number);
  const total = (a * 12 + (m - 1)) + n;
  const anio = Math.floor(total / 12);
  const mes = (total % 12) + 1;
  return `${anio}-${pad(mes)}`;
}

// Fecha 'YYYY-MM-DD' desplazada n días (para aritmética de vencimientos).
export function sumarDias(fecha, n) {
  const [a, m, d] = fecha.split('-').map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

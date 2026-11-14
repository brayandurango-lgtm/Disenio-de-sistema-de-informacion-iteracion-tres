// Validación de periodos de negocio 'YYYY-MM' y reglas de vigencia de contratos.
import { AppError } from '../errors.js';

const RE_PERIODO = /^(\d{4})-(0[1-9]|1[0-2])$/;
const RE_FECHA = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function esPeriodoValido(p) {
  return typeof p === 'string' && RE_PERIODO.test(p);
}

export function exigirPeriodo(p, campo = 'periodo') {
  if (!esPeriodoValido(p)) {
    throw new AppError(400, 'VALIDACION', `${campo} inválido: se espera 'YYYY-MM' con mes 01-12`, { [campo]: p });
  }
  return p;
}

export function esFechaValida(f) {
  if (typeof f !== 'string' || !RE_FECHA.test(f)) return false;
  // Verifica que la fecha exista realmente (rechaza 2026-02-31).
  const [a, m, d] = f.split('-').map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d));
  return dt.getUTCFullYear() === a && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function exigirFecha(f, campo = 'fecha') {
  if (!esFechaValida(f)) {
    throw new AppError(400, 'VALIDACION', `${campo} inválido: se espera 'AAAA-MM-DD' real`, { [campo]: f });
  }
  return f;
}

export function esPrimerDiaDeMes(fecha) {
  return esFechaValida(fecha) && fecha.endsWith('-01');
}

export function esUltimoDiaDeMes(fecha) {
  if (!esFechaValida(fecha)) return false;
  const [a, m] = fecha.split('-').map(Number);
  const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return Number(fecha.slice(8, 10)) === ultimo;
}

// Periodos de mes calendario cubiertos por [inicio, fin] (fechas 'YYYY-MM-DD').
// inicio debe ser día 1; fin último día de mes o null (indefinido → hasta '9999-12').
export function periodosDeVigencia(fechaInicio, fechaFin, hastaPeriodo) {
  exigirFecha(fechaInicio, 'fecha_inicio');
  if (!esPrimerDiaDeMes(fechaInicio)) {
    throw new AppError(400, 'VALIDACION', 'fecha_inicio debe ser el primer día de un mes', { fecha_inicio: fechaInicio });
  }
  const ultimo = fechaFin === null || fechaFin === undefined;
  if (!ultimo) {
    exigirFecha(fechaFin, 'fecha_fin');
    if (!esUltimoDiaDeMes(fechaFin)) {
      throw new AppError(400, 'VALIDACION', 'fecha_fin debe ser el último día de un mes o null', { fecha_fin: fechaFin });
    }
    if (fechaFin < fechaInicio) {
      throw new AppError(400, 'VALIDACION', 'fecha_fin no puede ser anterior a fecha_inicio');
    }
  }
  const pInicio = fechaInicio.slice(0, 7);
  const pFin = ultimo ? '9999-12' : fechaFin.slice(0, 7);
  return { pInicio, pFin, ultimo };
}

// Genera la lista de periodos 'YYYY-MM' entre pInicio y pFin inclusive,
// opcionalmente recortada por [desde, hasta] y por hastaPeriodo.
export function periodosEntre(pInicio, pFin, { desde, hasta } = {}) {
  const lista = [];
  let p = pInicio;
  let guard = 0;
  while (p <= pFin && guard < 1200) {
    if ((!desde || p >= desde) && (!hasta || p <= hasta)) lista.push(p);
    if (p === '9999-12') break;
    const [a, m] = p.split('-').map(Number);
    const total = a * 12 + m; // índice del mes siguiente (a*12 + m, con m 1..12)
    const anio = Math.floor(total / 12);
    const mes = (total % 12) + 1;
    p = `${anio}-${String(mes).padStart(2, '0')}`;
    guard += 1;
  }
  return lista;
}

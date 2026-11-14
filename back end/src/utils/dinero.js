import { AppError } from '../errors.js';

// Importes DECIMAL(12,2) en COP. En la API viajan como cadena decimal
// (mysql2 decimalNumbers:false). Máximo: 9999999999.99.
const RE_IMPORTE = /^(\d{1,10})(?:\.(\d{1,2}))?$/;

export function aDecimalStr(valor, campo = 'importe') {
  if (typeof valor === 'number') {
    if (!Number.isFinite(valor)) throw new AppError(400, 'VALIDACION', `${campo} no es un número finito`);
    valor = String(valor);
  }
  if (typeof valor !== 'string') {
    throw new AppError(400, 'VALIDACION', `${campo} debe ser una cadena decimal`, { [campo]: valor });
  }
  const s = valor.trim();
  const m = s.match(RE_IMPORTE);
  if (!m) {
    throw new AppError(400, 'VALIDACION', `${campo} inválido: se espera decimal positivo con máximo 2 decimales`, { [campo]: s });
  }
  const entero = m[1].replace(/^0+(?=\d)/, '');
  const dec = (m[2] ?? '').padEnd(2, '0');
  const normalizado = `${entero}.${dec}`;
  // Rechaza ceros totales y valores que excedan DECIMAL(12,2).
  if (/^0+\.0+$/.test(normalizado)) {
    throw new AppError(400, 'VALIDACION', `${campo} debe ser mayor que cero`, { [campo]: s });
  }
  if (entero.length > 10) {
    throw new AppError(400, 'VALIDACION', `${campo} excede el máximo permitido (9999999999.99)`, { [campo]: s });
  }
  return normalizado;
}

export function esPositivoDecimal(valor) {
  try { aDecimalStr(valor); return true; } catch { return false; }
}

// Suma exacta de decimales COP usando centavos enteros (BigInt). Nunca float.
export function sumarDecimales(valores) {
  let centavos = 0n;
  for (const v of valores) {
    const s = aDecimalStr(v);
    const [e, d] = s.split('.');
    centavos += BigInt(e) * 100n + BigInt(d);
  }
  const signo = centavos < 0n ? '-' : '';
  const abs = centavos < 0n ? -centavos : centavos;
  return `${signo}${abs / 100n}.${String(abs % 100n).padStart(2, '0')}`;
}

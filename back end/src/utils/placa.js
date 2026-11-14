// Normalización de placa: mayúsculas, sin espacios ni guiones, 2-10 chars.
export function normalizarPlaca(placa) {
  if (typeof placa !== 'string') return null;
  const p = placa.trim().toUpperCase().replace(/[\s-]+/g, '');
  return p.length >= 2 && p.length <= 10 && /^[A-Z0-9]+$/.test(p) ? p : null;
}

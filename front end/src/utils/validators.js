/**
 * Validadores del lado del cliente compatibles con las restricciones del backend
 */

export function esPlacaValida(placa) {
  if (!placa || typeof placa !== 'string') return false;
  const limpia = placa.trim().toUpperCase().replace(/[-\s]/g, '');
  // Placas colombianas típicas: 3 letras + 3 números (carros) o 3 letras + 2 números + 1 letra (motos)
  return /^[A-Z]{3}\d{3}$/.test(limpia) || /^[A-Z]{3}\d{2}[A-Z]$/.test(limpia);
}

export function esPeriodoValido(periodo) {
  if (!periodo || typeof periodo !== 'string') return false;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)) return false;
  return true;
}

export function esUUIDValido(uuid) {
  if (!uuid || typeof uuid !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
}

export function limpiarPlaca(placa) {
  if (!placa) return '';
  return placa.trim().toUpperCase().replace(/[-\s]/g, '');
}

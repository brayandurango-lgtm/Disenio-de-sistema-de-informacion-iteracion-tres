/**
 * Utilidades de formateo y sanitización para la interfaz
 */

/**
 * Formatea un monto en formato monetario colombiano exacto (COP).
 * Respeta la cadena decimal de la API sin perder precisión por floats.
 */
export function formatearMonedaCOP(monto) {
  if (monto === null || monto === undefined || monto === '') {
    return '$0 COP';
  }
  const str = String(monto).trim();
  const [entero, decimales] = str.split('.');
  const enteroFormateado = Number(entero || 0).toLocaleString('es-CO');
  return `$${enteroFormateado}${decimales ? '.' + decimales : ''} COP`;
}

/**
 * Formatea una fecha u hora ISO / Bogotá a formato legible en español.
 */
export function formatearFechaBogota(fechaStr) {
  if (!fechaStr) return '—';
  try {
    // Si es solo YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
      const [anio, mes, dia] = fechaStr.split('-');
      return `${dia}/${mes}/${anio}`;
    }
    // Si es DATETIME o ISO
    const normalizada = fechaStr.includes('T') ? fechaStr : fechaStr.replace(' ', 'T') + '-05:00';
    const date = new Date(normalizada);
    if (isNaN(date.getTime())) return fechaStr;
    return date.toLocaleString('es-CO', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return fechaStr;
  }
}

/**
 * Formatea un periodo 'YYYY-MM' a nombre de mes en español.
 */
export function formatearPeriodo(periodoStr) {
  if (!periodoStr || !/^\d{4}-\d{2}$/.test(periodoStr)) return periodoStr || '—';
  const [anio, mes] = periodoStr.split('-');
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const idx = Number(mes) - 1;
  return `${meses[idx] || mes} de ${anio}`;
}

/**
 * Sanitiza cadenas de texto para prevenir inyección XSS en plantillas HTML.
 */
export function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

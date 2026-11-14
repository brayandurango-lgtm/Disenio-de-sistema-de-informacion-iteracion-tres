/**
 * Gestor de Idempotencia y Reintentos de Pago
 * 
 * Regla de negocio crítica:
 * Se asocia un UUID v4 único por INTENTO LÓGICO de pago.
 * Si la conexión se interrumpe o la respuesta queda en estado incierto,
 * el reintento DEBE reutilizar la misma clave de idempotencia.
 * El backend responderá HTTP 200 con el pago existente si ya fue procesado,
 * o HTTP 201 si es procesado en ese momento, evitando cualquier duplicidad.
 */

export function generarUUIDv4() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback estándar RFC4122 v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Almacén en memoria de intentos activos por obligación
const intentosActivos = new Map();

/**
 * Inicia o recupera un intento de pago para una obligación específica.
 */
export function obtenerOIniciarIntento(obligacionId, datosPago = {}) {
  const claveKey = `obl_${obligacionId}`;
  const existente = intentosActivos.get(claveKey);

  if (existente && existente.estado === 'incierto') {
    return existente;
  }

  const nuevoIntento = {
    obligacionId,
    claveIdempotencia: generarUUIDv4(),
    metodoPago: datosPago.metodoPago || 'efectivo',
    monto: datosPago.monto,
    fechaHoraInicio: new Date().toISOString(),
    estado: 'iniciado', // 'iniciado' | 'confirmado' | 'rechazado' | 'incierto'
    pagoResultado: null,
    ultimoError: null
  };

  intentosActivos.set(claveKey, nuevoIntento);
  return nuevoIntento;
}

/**
 * Actualiza el estado del intento tras la llamada a la API
 */
export function registrarResultadoIntento(obligacionId, { estado, pago = null, error = null }) {
  const claveKey = `obl_${obligacionId}`;
  const intento = intentosActivos.get(claveKey);
  if (!intento) return null;

  intento.estado = estado;
  if (pago) intento.pagoResultado = pago;
  if (error) intento.ultimoError = error;

  // Si fue confirmado o cerrado definitivamente, se puede limpiar tras unos minutos
  if (estado === 'confirmado' || estado === 'rechazado') {
    setTimeout(() => {
      intentosActivos.delete(claveKey);
    }, 5 * 60 * 1000);
  }

  return intento;
}

/**
 * Limpia explícitamente el intento activo cuando el usuario cancela voluntariamente
 * el formulario antes de enviar.
 */
export function cancelarIntento(obligacionId) {
  intentosActivos.delete(`obl_${obligacionId}`);
}

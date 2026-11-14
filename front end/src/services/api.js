/**
 * Cliente API Centralizado — Autos Colombia
 * 
 * Gestiona peticiones HTTP al backend Express:
 * - Inyección automática de Authorization: Bearer <token>
 * - Manejo de 401 (sesión expirada o invalidada)
 * - Mapeo centralizado de errores del contrato JSON
 */

import { getToken, limpiarSesion } from './auth.js';

// URL base de la API: variable VITE_API_URL o fallback a '/api' (proxy de Vite)
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  constructor({ codigo, mensaje, detalles, status }) {
    super(mensaje || 'Error en la solicitud');
    this.name = 'ApiError';
    this.codigo = codigo || 'ERROR_DESCONOCIDO';
    this.detalles = detalles || {};
    this.status = status;
  }
}

export async function request(ruta, { metodo = 'GET', body = null, headers = {} } = {}) {
  const url = `${API_BASE_URL}${ruta.startsWith('/') ? ruta : '/' + ruta}`;
  
  const token = getToken();
  const reqHeaders = {
    'Accept': 'application/json',
    ...headers
  };

  if (body !== null && !(body instanceof FormData)) {
    reqHeaders['Content-Type'] = 'application/json';
  }

  if (token) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(url, {
      method: metodo,
      headers: reqHeaders,
      body: body !== null ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined
    });
  } catch (netErr) {
    throw new ApiError({
      codigo: 'ERROR_CONEXION',
      mensaje: 'No se pudo conectar con el servidor del parqueadero. Verifique su conexión o si el servidor backend está en ejecución.',
      status: 0
    });
  }

  // Manejo de 204 No Content
  if (response.status === 204) {
    return null;
  }

  // Parseo del cuerpo JSON
  let data = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  // Si la respuesta fue exitosa (200, 201)
  if (response.ok) {
    return data;
  }

  // Manejo de sesión expirada o token inválido
  if (response.status === 401) {
    limpiarSesion();
    window.dispatchEvent(new CustomEvent('auth:sesion_expirada', {
      detail: { mensaje: data?.error?.mensaje || 'Su sesión ha expirado o no es válida. Inicie sesión nuevamente.' }
    }));
    throw new ApiError({
      codigo: data?.error?.codigo || 'NO_AUTENTICADO',
      mensaje: data?.error?.mensaje || 'Sesión no autenticada o vencida',
      detalles: data?.error?.detalles,
      status: 401
    });
  }

  // Manejo de errores controlados del backend
  const errPayload = data?.error || {};
  throw new ApiError({
    codigo: errPayload.codigo || (response.status === 429 ? 'DEMASIADOS_INTENTOS' : 'ERROR_HTTP'),
    mensaje: errPayload.mensaje || `Error en la operación (${response.status})`,
    detalles: errPayload.detalles || {},
    status: response.status
  });
}

// Helpers semánticos
export const api = {
  get: (ruta) => request(ruta, { metodo: 'GET' }),
  post: (ruta, body) => request(ruta, { metodo: 'POST', body }),
  patch: (ruta, body) => request(ruta, { metodo: 'PATCH', body }),
  salud: () => request('/salud', { metodo: 'GET' }),
  saludDb: () => request('/salud/db', { metodo: 'GET' })
};

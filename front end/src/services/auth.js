/**
 * Gestión del Estado de Autenticación y Sesión
 * 
 * SEGURIDAD Y TOKEN:
 * Se utiliza sessionStorage por defecto para que la sesión expire al cerrar
 * la pestaña/navegador, minimizando riesgos en equipos compartidos.
 * El token JWT emitido por el backend Express contiene la huella de la contraseña;
 * si la contraseña cambia en el servidor, cualquier petición devolverá 401
 * y limpiará la sesión automáticamente.
 */

const STORAGE_KEY_TOKEN = 'autoscolombia_token';
const STORAGE_KEY_USER = 'autoscolombia_user';

export function getToken() {
  return sessionStorage.getItem(STORAGE_KEY_TOKEN);
}

export function getUsuario() {
  const raw = sessionStorage.getItem(STORAGE_KEY_USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return Boolean(getToken() && getUsuario());
}

export function esAdmin() {
  const u = getUsuario();
  return u?.rol === 'administrador';
}

export function guardarSesion(token, usuario) {
  sessionStorage.setItem(STORAGE_KEY_TOKEN, token);
  sessionStorage.setItem(STORAGE_KEY_USER, JSON.stringify(usuario));
  window.dispatchEvent(new CustomEvent('auth:cambio', { detail: { autenticado: true, usuario } }));
}

export function limpiarSesion() {
  sessionStorage.removeItem(STORAGE_KEY_TOKEN);
  sessionStorage.removeItem(STORAGE_KEY_USER);
  window.dispatchEvent(new CustomEvent('auth:cambio', { detail: { autenticado: false, usuario: null } }));
}

/**
 * Inicia sesión contra POST /api/auth/login
 */
export async function login(nombreUsuario, password) {
  const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
  const url = `${API_BASE_URL}/auth/login`;

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        nombre_usuario: nombreUsuario,
        password: password
      })
    });
  } catch {
    throw new Error('No fue posible contactar al servidor de autenticación. Verifique la conexión.');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Límite de intentos superado. Por seguridad, espere 15 minutos antes de intentar nuevamente.');
    }
    if (response.status === 401) {
      throw new Error('Usuario o contraseña incorrectos.');
    }
    throw new Error(data?.error?.mensaje || 'Error al iniciar sesión.');
  }

  if (!data.token || !data.usuario) {
    throw new Error('Respuesta inválida del servidor de autenticación.');
  }

  guardarSesion(data.token, data.usuario);
  return data.usuario;
}

export function logout() {
  limpiarSesion();
}

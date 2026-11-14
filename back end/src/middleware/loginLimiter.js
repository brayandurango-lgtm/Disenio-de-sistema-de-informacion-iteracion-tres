import config from '../config.js';
import { errores } from '../errors.js';
import { logger } from '../logger.js';

// Limitador de intentos de login en memoria del proceso (suficiente para una
// instancia local; documentado como limitación si se escala horizontalmente).
const intentos = new Map(); // clave -> { cuenta, hasta }

function clave(req, usuario) {
  return `${req.ip}|${String(usuario).toLowerCase()}`;
}

export function verificarLimiteLogin(req, usuario) {
  const ahora = Date.now();
  const k = clave(req, usuario);
  const reg = intentos.get(k);
  if (reg && reg.hasta > ahora && reg.cuenta >= config.loginMaxIntentos) {
    const seg = Math.ceil((reg.hasta - ahora) / 1000);
    logger.warn('login bloqueado por límite de intentos', { ip: req.ip });
    throw errores.demasiadosIntentos(`Demasiados intentos de inicio de sesión. Reintente en ${seg} segundos.`);
  }
}

export function registrarIntentoFallido(req, usuario) {
  const k = clave(req, usuario);
  const ahora = Date.now();
  const reg = intentos.get(k);
  const cuenta = reg && reg.hasta > ahora ? reg.cuenta + 1 : 1;
  // Solo se bloquea al alcanzar el máximo dentro de la ventana; un fallo
  // aislado no debe impedir el siguiente intento correcto.
  intentos.set(k, { cuenta, hasta: ahora + config.loginVentanaMs });
  // Limpieza perezosa ocasional para no crecer sin límite.
  if (intentos.size > 10000) {
    for (const [kk, v] of intentos) if (v.hasta <= ahora) intentos.delete(kk);
  }
}

export function limpiarIntentos(req, usuario) {
  intentos.delete(clave(req, usuario));
}

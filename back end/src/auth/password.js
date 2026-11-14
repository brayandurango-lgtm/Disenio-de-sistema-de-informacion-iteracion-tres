import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';

const COSTO = 12;

export async function hashPassword(password) {
  return bcrypt.hash(password, COSTO);
}

// Huella no reversible del hash almacenado. Se incluye en el JWT para invalidar
// tokens emitidos antes de un cambio de contraseña (el hash cambia → la huella
// del token deja de coincidir con la de la BD).
export function huellaPassword(hash) {
  return createHash('sha256').update(String(hash)).digest('hex').slice(0, 24);
}

export async function verificarPassword(password, hash) {
  if (typeof hash !== 'string' || !hash.startsWith('$2')) return false;
  return bcrypt.compare(password, hash);
}

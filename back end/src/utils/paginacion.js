// Paginación común: ?pagina=1&tamano=20 (máx 100, defecto 20).
import { errores } from '../errors.js';

export function paginacion(req) {
  const pagina = Math.max(1, parseInt(req.query.pagina ?? '1', 10) || 1);
  const tamano = Math.min(100, Math.max(1, parseInt(req.query.tamano ?? '20', 10) || 20));
  return { pagina, tamano, offset: (pagina - 1) * tamano };
}

export function paginadoResult(total, items, { pagina, tamano }) {
  return {
    datos: items,
    paginacion: {
      pagina,
      tamano,
      total: Number(total),
      paginas: Math.max(1, Math.ceil(Number(total) / tamano)),
    },
  };
}

export function idParam(req) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw errores.validacion('id inválido');
  return id;
}

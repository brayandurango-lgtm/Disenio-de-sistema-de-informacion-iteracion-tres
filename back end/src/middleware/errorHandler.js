import { AppError, errores, traducirErrorMySQL } from '../errors.js';
import { logger } from '../logger.js';

export function notFound(req, _res, next) {
  next(new AppError(404, 'NO_ENCONTRADO', `Ruta no encontrada: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { codigo: err.codigo, mensaje: err.message, detalles: err.detalles ?? {} },
    });
  }
  const traducido = traducirErrorMySQL(err);
  if (traducido) {
    return res.status(traducido.status).json({
      error: { codigo: traducido.codigo, mensaje: traducido.message, detalles: traducido.detalles ?? {} },
    });
  }
  // Nunca filtrar el mensaje interno ni posibles datos sensibles al cliente.
  logger.error('error no controlado', { ruta: req.method + ' ' + req.originalUrl, err: err.message });
  return res.status(500).json({
    error: { codigo: 'ERROR_INTERNO', mensaje: 'Error interno del servidor', detalles: {} },
  });
}

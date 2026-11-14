import { logger } from '../logger.js';

// Registro de requests sin cuerpo ni cabeceras sensibles.
export function requestLogger(req, res, next) {
  const inicio = Date.now();
  res.on('finish', () => {
    logger.info('http', {
      metodo: req.method,
      ruta: req.originalUrl,
      estado: res.statusCode,
      ms: Date.now() - inicio,
    });
  });
  next();
}

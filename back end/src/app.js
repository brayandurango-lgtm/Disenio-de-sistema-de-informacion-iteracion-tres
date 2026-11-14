import express from 'express';
import config from './config.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { ping } from './db.js';
import { logger } from './logger.js';

import authRoutes from './routes/auth.js';
import clientesRoutes from './routes/clientes.js';
import vehiculosRoutes from './routes/vehiculos.js';
import novedadesRoutes from './routes/novedades.js';
import usuariosRoutes from './routes/usuarios.js';
import celdasRoutes from './routes/celdas.js';
import estanciasRoutes from './routes/estancias.js';
import contratosRoutes from './routes/contratos.js';
import obligacionesRoutes from './routes/obligaciones.js';
import pagosRoutes from './routes/pagos.js';
import resumenRoutes from './routes/resumen.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // para req.ip correcto detrás de proxy local

  // CORS manual: solo orígenes explícitos en CORS_ORIGIN.
  app.use((req, res, next) => {
    const origen = req.headers.origin;
    if (origen && config.corsOrigins.includes(origen)) {
      res.setHeader('Access-Control-Allow-Origin', origen);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
      res.setHeader('Access-Control-Max-Age', '600');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.use(express.json({ limit: '256kb' }));
  app.use(requestLogger);

  // Salud: no expone configuración ni datos sensibles.
  app.get('/api/salud', (_req, res) => res.json({ estado: 'ok' }));
  app.get('/api/salud/db', async (_req, res) => {
    try {
      const ok = await ping();
      res.status(ok ? 200 : 503).json({ estado: ok ? 'ok' : 'error', db: ok ? 'conectada' : 'sin_conexion' });
    } catch (err) {
      logger.warn('health db falló', { err: err.message });
      res.status(503).json({ estado: 'error', db: 'sin_conexion' });
    }
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/clientes', clientesRoutes);
  app.use('/api/vehiculos', vehiculosRoutes);
  app.use('/api/vehiculos/:id/novedades', novedadesRoutes); // mergeParams → req.params.id
  app.use('/api/usuarios', usuariosRoutes);
  app.use('/api/celdas', celdasRoutes);
  app.use('/api/estancias', estanciasRoutes);
  app.use('/api/contratos', contratosRoutes);
  app.use('/api/obligaciones', obligacionesRoutes);
  app.use('/api/pagos', pagosRoutes);
  app.use('/api/resumen', resumenRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

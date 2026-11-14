import config from './config.js';
import { createApp } from './app.js';
import { cerrarPool } from './db.js';
import { logger } from './logger.js';

const app = createApp();

const servidor = app.listen(config.port, () => {
  logger.info('servidor iniciado', { puerto: config.port, entorno: config.env });
});

let cerrando = false;
async function apagar(senal) {
  if (cerrando) return;
  cerrando = true;
  logger.info('apagando', { senal });
  servidor.close(async () => {
    try { await cerrarPool(); } catch { /* ignorar */ }
    process.exit(0);
  });
  // Forzar salida si hay conexiones colgadas.
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGINT', () => apagar('SIGINT'));
process.on('SIGTERM', () => apagar('SIGTERM'));
process.on('unhandledRejection', (err) => logger.error('unhandledRejection', { err: String(err) }));

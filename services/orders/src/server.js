const { createApp } = require('./app');

const SHUTDOWN_TIMEOUT_MS = 5000;

function start() {
  const app = createApp();
  const { service, port, environment, storage } = app.locals.config;
  let shuttingDown = false;

  const server = app.listen(port, '0.0.0.0', (err) => {
    if (err) {
      console.error(`[${service}] écoute impossible sur le port ${port} : ${err.code || err.message}`);
      process.exit(1);
    }
    console.log(`[${service}] démarré sur le port ${port}, environnement ${environment}, stockage ${storage}`);
  });

  function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[${service}] arrêt demandé (${signal}), fermeture du serveur`);
    setTimeout(() => {
      console.error(`[${service}] fermeture forcée`);
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    server.close(() => process.exit(0));
  }

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

try {
  start();
} catch (err) {
  console.error(`[orders] démarrage impossible : ${err.message}`);
  process.exit(1);
}

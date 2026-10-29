const { createApp } = require('./app');

function start() {
  const app = createApp();
  const { service, port, environment, storage } = app.locals.config;

  app.listen(port, '0.0.0.0', (err) => {
    if (err) {
      console.error(`[${service}] écoute impossible sur le port ${port} : ${err.code || err.message}`);
      process.exit(1);
    }
    console.log(`[${service}] démarré sur le port ${port}, environnement ${environment}, stockage ${storage}`);
  });
}

try {
  start();
} catch (err) {
  console.error(`[products] démarrage impossible : ${err.message}`);
  process.exit(1);
}

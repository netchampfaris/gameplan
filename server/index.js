const server = require('frappejs/server');


async function start() {
  const isDevEnv = process.env.PRODUCTION || true;

  await server.start({
    backend: 'sqlite',
    connectionParams: {
      dbPath: 'gameplan.db',
      port: 7156,
      enableCORS: isDevEnv,
    },
    staticPath: './dist',
    authConfig: {},
  });
}

start();

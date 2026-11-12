import { buildApp } from './app.js';
import { config } from './config/env.js';
import { openDb } from './db/connection.js';
import { bootstrap } from './db/seed.js';

const db = openDb(config.dbFile);
bootstrap(db, config);

const app = await buildApp({ db, config, logger: { level: 'info' } });

// Encerramento limpo: para de aceitar conexões e fecha o banco.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await app.close();
    db.close();
    process.exit(0);
  });
}

try {
  await app.listen({ port: config.port, host: config.host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

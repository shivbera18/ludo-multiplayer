import { createRealtimeServer } from './server.js';
import { createPostgresStore } from './db/postgresStore.js';

const port = Number(process.env.PORT ?? 3000);

async function bootstrap() {
  let dbStore = null;
  try {
    dbStore = await createPostgresStore();
    console.log('PostgreSQL connected and schema ensured.');
  } catch (error) {
    console.warn('PostgreSQL unavailable, running without persistent accounts/replay storage.');
    console.warn(error.message);
  }

  const { server } = createRealtimeServer({ dbStore });
  server.listen(port, () => {
    console.log(`Backend listening on :${port}`);
  });

  process.on('SIGINT', async () => {
    if (dbStore) {
      await dbStore.close();
    }
    process.exit(0);
  });
}

bootstrap().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

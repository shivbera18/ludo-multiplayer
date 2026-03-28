import { createPostgresStore } from '../src/db/postgresStore.js';

async function main() {
  const store = await createPostgresStore();
  await store.close();
  console.log('Database schema ready.');
}

main().catch((error) => {
  console.error('Failed to initialize database schema.');
  console.error(error);
  process.exitCode = 1;
});

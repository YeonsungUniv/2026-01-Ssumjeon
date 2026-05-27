import EmbeddedPostgres from 'embedded-postgres';

const pg = new EmbeddedPostgres({
  databaseDir: './pgdata',
  user: 'ssumjeon_user',
  password: 'ssumjeon_pass',
  port: 5432,
  persistent: true,
});

const { existsSync } = await import('fs');
const alreadyInit = existsSync('./pgdata/PG_VERSION');

if (!alreadyInit) {
  console.log('[DB] Initialising embedded PostgreSQL...');
  await pg.initialise();
} else {
  console.log('[DB] pgdata already initialised, skipping initdb.');
}

console.log('[DB] Starting PostgreSQL on port 5432...');
await pg.start();

console.log('[DB] Creating database ssumjeon...');
try {
  await pg.createDatabase('ssumjeon');
  console.log('[DB] Database created.');
} catch (e) {
  console.log('[DB] Database may already exist:', e.message);
}

console.log('[DB] PostgreSQL is ready. Press Ctrl+C to stop.');

process.on('SIGINT', async () => {
  console.log('[DB] Stopping...');
  await pg.stop();
  process.exit(0);
});

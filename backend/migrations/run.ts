import fs from 'fs'
import path from 'path'
import { pool } from '../src/config/db'

async function runMigrations() {
  const dbHost = process.env.DB_HOST
  if (!dbHost || dbHost.includes('your-rds')) {
    console.log('[Migration] DB_HOST not configured — skipping migrations')
    await pool.end()
    return
  }

  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    const migrationDir = path.join(__dirname)
    const files = fs
      .readdirSync(migrationDir)
      .filter((f) => f.endsWith('.sql'))
      .sort()

    for (const file of files) {
      const existing = await client.query('SELECT id FROM migrations WHERE filename = $1', [file])
      if (existing.rows.length > 0) {
        console.log(`[Migration] Skipping ${file} (already executed)`)
        continue
      }

      const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8')
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('INSERT INTO migrations (filename) VALUES ($1)', [file])
      await client.query('COMMIT')
      console.log(`[Migration] Executed ${file}`)
    }

    console.log('[Migration] All migrations completed')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[Migration] Failed:', err)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

runMigrations()

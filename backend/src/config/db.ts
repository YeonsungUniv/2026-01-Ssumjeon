import { Pool, type QueryResultRow } from 'pg'
import { env } from './env'

export const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.name,
  user: env.db.user,
  password: env.db.password,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000,
  ssl: env.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
})

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client', err)
})

export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params?: unknown[],
) {
  const result = await pool.query<T>(sql, params)
  return result
}

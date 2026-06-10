import './config/env' // 가장 먼저 로드
import express from 'express'
import http from 'http'
import { Server as SocketServer } from 'socket.io'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import cron from 'node-cron'
import { env } from './config/env'
import { pool, query } from './config/db'
import apiRouter from './routes'
import { apiLimiter } from './middlewares/rateLimit'
import { errorHandler } from './middlewares/errorHandler'
import { setupSocket } from './services/socketService'
import { seedTestUsers } from './seeds/testUsers'
import { deleteMultipleFromS3 } from './utils/s3'

const app = express()
const httpServer = http.createServer(app)

// ── CORS origins (콤마 구분 다중 지원) ──────────────────────────
const corsOrigins = env.corsOrigin.split(',').map((s) => s.trim())

// ── Socket.IO ──────────────────────────────────────────────────
const io = new SocketServer(httpServer, {
  cors: { origin: corsOrigins, credentials: true },
})
setupSocket(io)

// ── Express 미들웨어 ────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({ origin: corsOrigins, credentials: true }))
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

// 신뢰 프록시(배포 환경 X-Forwarded-For) — rate limit IP 식별
app.set('trust proxy', 1)

// ── API 라우터 (전체 기본 레이트리밋) ───────────────────────────
app.use('/api', apiLimiter, apiRouter)

// ── Health Check ────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }))

// ── 에러 핸들러 ─────────────────────────────────────────────────
app.use(errorHandler)

// ── 채팅 이미지 7일 만료 크론잡 (매일 새벽 3시) ─────────────────────
cron.schedule('0 3 * * *', async () => {
  try {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const result = await query<{ id: string; content: string }>(
      `SELECT id, content FROM messages
       WHERE content LIKE '%amazonaws.com/chat/%'
         AND content != '[expired_image]'
         AND created_at < $1`,
      [cutoff],
    )
    if (result.rows.length === 0) return

    const urls = result.rows.map((r) => r.content)
    const ids = result.rows.map((r) => r.id)

    await deleteMultipleFromS3(urls)
    await query(
      `UPDATE messages SET content = '[expired_image]' WHERE id = ANY($1::uuid[])`,
      [ids],
    )
    console.log(`[Cron] 채팅 이미지 ${ids.length}개 만료 처리`)
  } catch (err) {
    console.error('[Cron] 이미지 만료 처리 실패:', err)
  }
})

// ── 서버 시작 ────────────────────────────────────────────────────
async function bootstrap() {
  // DB 연결 확인
  const client = await pool.connect()
  await client.query('SELECT 1')
  client.release()
  console.log('[DB] Connected to PostgreSQL')

  await seedTestUsers()

  httpServer.listen(env.port, () => {
    console.log(`[Server] Running on http://localhost:${env.port}`)
  })
}

bootstrap().catch((err) => {
  console.error('[Bootstrap] Failed:', err)
  console.error('PostgreSQL가 실행 중인지 확인해주세요.')
  process.exit(1)
})

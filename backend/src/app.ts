import './config/env' // 가장 먼저 로드
import express from 'express'
import http from 'http'
import path from 'path'
import { Server as SocketServer } from 'socket.io'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { env } from './config/env'
import { pool } from './config/db'
import apiRouter from './routes'
import { errorHandler } from './middlewares/errorHandler'
import { setupSocket } from './services/socketService'
import { seedTestUsers } from './seeds/testUsers'

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
app.use(cors({ origin: corsOrigins, credentials: true }))
app.use(express.json())
app.use(cookieParser())

// ── 정적 파일 (업로드 이미지, 재학증명서) ──────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// ── API 라우터 ──────────────────────────────────────────────────
app.use('/api', apiRouter)

// ── Health Check ────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }))

// ── 에러 핸들러 ─────────────────────────────────────────────────
app.use(errorHandler)

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

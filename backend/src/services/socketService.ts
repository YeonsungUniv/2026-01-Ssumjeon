import type { Server } from 'socket.io'
import { v4 as uuidv4 } from 'uuid'
import { verifyAccessToken } from '../utils/jwt'
import { chatService } from './chatService'
import { query } from '../config/db'

let _io: Server | null = null

// userId → 해당 유저의 socketId 집합
const userSockets = new Map<string, Set<string>>()

// ── 실시간 매칭 큐 ──────────────────────────────────────────────────
interface QueueEntry {
  userId: string
  socketId: string
  gender: 'male' | 'female'
  department: string
  grade: number
  filters: {
    gender?: 'male' | 'female'
    departments?: string[]
    grades?: number[]
  }
}

const matchingQueue = new Map<string, QueueEntry>()

function isCompatible(a: QueueEntry, b: QueueEntry): boolean {
  const aWants = a.filters.gender ?? (a.gender === 'male' ? 'female' : 'male')
  const bWants = b.filters.gender ?? (b.gender === 'male' ? 'female' : 'male')
  if (b.gender !== aWants || a.gender !== bWants) return false
  if (a.filters.departments?.length && !a.filters.departments.includes(b.department)) return false
  if (b.filters.departments?.length && !b.filters.departments.includes(a.department)) return false
  if (a.filters.grades?.length && !a.filters.grades.includes(b.grade)) return false
  if (b.filters.grades?.length && !b.filters.grades.includes(a.grade)) return false
  return true
}

export function getIO(): Server {
  if (!_io) throw new Error('Socket.IO not initialized')
  return _io
}

// 특정 유저에게 직접 emit
export function emitToUser(userId: string, event: string, data: unknown) {
  if (!_io) return
  const socketIds = Array.from(userSockets.get(userId) ?? [])
  socketIds.forEach((sid) => _io!.to(sid).emit(event, data))
}

// REST API에서 호출: 발신자 제외하고 채팅방에 브로드캐스트
export function emitToRoom(roomId: string, event: string, data: unknown, excludeUserId?: string) {
  if (!_io) return
  const excludeSocketIds = excludeUserId ? Array.from(userSockets.get(excludeUserId) ?? []) : []
  if (excludeSocketIds.length > 0) {
    _io.to(roomId).except(excludeSocketIds).emit(event, data)
  } else {
    _io.to(roomId).emit(event, data)
  }
}

export function setupSocket(io: Server) {
  _io = io

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined
    if (!token) return next(new Error('Authentication error'))
    try {
      const payload = verifyAccessToken(token)
      socket.data.userId = payload.userId
      next()
    } catch {
      next(new Error('Authentication error'))
    }
  })

  io.on('connection', (socket) => {
    const userId: string = socket.data.userId
    console.log(`[Socket] User connected: ${userId}`)

    if (!userSockets.has(userId)) userSockets.set(userId, new Set())
    userSockets.get(userId)!.add(socket.id)

    socket.on('room:join', (roomId: string) => {
      socket.join(roomId)
    })

    socket.on('room:leave', (roomId: string) => {
      socket.leave(roomId)
    })

    // ── 실시간 1:1 매칭 ──────────────────────────────────────────────
    socket.on('matching:join', async (filters: QueueEntry['filters']) => {
      try {
        const result = await query<{ gender: 'male' | 'female'; department: string; grade: number }>(
          'SELECT gender, department, grade FROM users WHERE id = $1',
          [userId],
        )
        const me = result.rows[0]
        if (!me) return

        if (!me.department || !me.grade) {
          socket.emit('matching:error', { message: '프로필(학과·학년)을 완성해야 매칭에 참여할 수 있습니다.' })
          return
        }

        const entry: QueueEntry = { userId, socketId: socket.id, ...me, filters }

        let matched: QueueEntry | null = null
        for (const [qId, qEntry] of matchingQueue) {
          if (qId === userId) continue
          if (isCompatible(entry, qEntry)) { matched = qEntry; break }
        }

        if (matched) {
          matchingQueue.delete(matched.userId)
          matchingQueue.delete(userId)

          const matchId = uuidv4()
          await query(
            'INSERT INTO matches (id, user1_id, user2_id, status) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING',
            [matchId, userId, matched.userId, 'matched'],
          )

          // 기존 1:1 채팅방 중복 확인
          const existingRoom = await query<{ id: string }>(
            `SELECT cr.id FROM chat_rooms cr
             JOIN chat_room_members m1 ON m1.chat_room_id = cr.id AND m1.user_id = $1
             JOIN chat_room_members m2 ON m2.chat_room_id = cr.id AND m2.user_id = $2
             WHERE cr.type = 'individual'`,
            [userId, matched.userId],
          )

          let chatRoomId: string
          if (existingRoom.rows.length > 0) {
            chatRoomId = existingRoom.rows[0].id
          } else {
            chatRoomId = uuidv4()
            await query('INSERT INTO chat_rooms (id, type) VALUES ($1,$2)', [chatRoomId, 'individual'])
            await query(
              'INSERT INTO chat_room_members (chat_room_id, user_id) VALUES ($1,$2),($1,$3)',
              [chatRoomId, userId, matched.userId],
            )
          }

          io.to(socket.id).emit('matching:success', { matchId, chatRoomId })
          io.to(matched.socketId).emit('matching:success', { matchId, chatRoomId })
        } else {
          matchingQueue.set(userId, entry)
          socket.emit('matching:waiting')
        }
      } catch (err) {
        socket.emit('matching:error', { message: '매칭 오류가 발생했습니다.' })
      }
    })

    socket.on('matching:cancel', () => {
      matchingQueue.delete(userId)
    })

    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${userId}`)
      matchingQueue.delete(userId)
      userSockets.get(userId)?.delete(socket.id)
      if (userSockets.get(userId)?.size === 0) userSockets.delete(userId)
    })
  })
}

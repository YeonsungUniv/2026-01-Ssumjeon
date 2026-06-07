import { v4 as uuidv4 } from 'uuid'
import type { Response, NextFunction } from 'express'
import { query } from '../config/db'
import { success, fail } from '../utils/response'
import { emitToRoom, emitToUser } from '../services/socketService'
import type { AuthRequest } from '../types'

interface AppointmentRow {
  id: string
  room_id: string
  proposer_id: string
  proposer_nickname: string
  date: Date
  time: string
  location: string
  status: 'pending' | 'confirmed' | 'cancelled'
  created_at: Date
  updated_at: Date | null
}

function toDto(r: AppointmentRow) {
  return {
    id: r.id,
    roomId: r.room_id,
    proposerId: r.proposer_id,
    proposerNickname: r.proposer_nickname,
    date: r.date.toISOString().slice(0, 10),
    time: r.time.slice(0, 5),
    location: r.location,
    status: r.status,
    createdAt: r.created_at.toISOString(),
    updatedAt: (r.updated_at ?? r.created_at).toISOString(),
  }
}

// 약속 관련 채팅 알림(미읽음/목록 미리보기/시스템 안내)을 상대방에게 보냄
async function notifyAppointment(roomId: string, actorId: string, marker: string) {
  const msgId = uuidv4()
  const inserted = await query<{ created_at: Date; sender_nickname: string; sender_profile_image: string | null }>(
    `INSERT INTO messages (id, room_id, sender_id, content) VALUES ($1,$2,$3,$4)
     RETURNING created_at,
       (SELECT nickname FROM users WHERE id = $3) AS sender_nickname,
       (SELECT profile_image FROM users WHERE id = $3) AS sender_profile_image`,
    [msgId, roomId, actorId, marker],
  )
  const row = inserted.rows[0]
  const message = {
    id: msgId,
    roomId,
    senderId: actorId,
    senderNickname: row.sender_nickname,
    senderProfileImage: row.sender_profile_image ?? undefined,
    content: marker,
    createdAt: row.created_at.toISOString(),
    isRead: false,
  }
  // 차단하지 않은 상대 멤버에게만 알림 전송
  const members = await query<{ user_id: string }>(
    'SELECT user_id FROM chat_room_members WHERE chat_room_id = $1 AND user_id != $2 AND left_at IS NULL',
    [roomId, actorId],
  )
  for (const { user_id } of members.rows) {
    const blocking = await query(
      'SELECT 1 FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2',
      [user_id, actorId],
    )
    if (blocking.rows.length === 0) emitToUser(user_id, 'message:new', message)
  }
}

export const appointmentController = {
  async propose(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { roomId } = req.params
      const { date, time, location } = req.body

      if (!date || !time || !location?.trim()) return fail(res, '날짜, 시간, 장소를 모두 입력해주세요.')

      const access = await query('SELECT 1 FROM chat_room_members WHERE chat_room_id = $1 AND user_id = $2', [roomId, req.user!.userId])
      if (access.rows.length === 0) return fail(res, '권한이 없습니다.', 403)

      const result = await query<AppointmentRow>(
        `INSERT INTO appointments (room_id, proposer_id, date, time, location)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *, (SELECT nickname FROM users WHERE id = $2) AS proposer_nickname`,
        [roomId, req.user!.userId, date, time, location.trim()],
      )

      const dto = toDto(result.rows[0])
      emitToRoom(roomId, 'appointment:new', dto, req.user!.userId)
      await notifyAppointment(roomId, req.user!.userId, '[appointment:proposed]')
      return success(res, dto, 201)
    } catch (err) { next(err) }
  },

  async getByRoom(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { roomId } = req.params
      const access = await query('SELECT 1 FROM chat_room_members WHERE chat_room_id = $1 AND user_id = $2', [roomId, req.user!.userId])
      if (access.rows.length === 0) return fail(res, '권한이 없습니다.', 403)

      const result = await query<AppointmentRow>(
        `SELECT a.*, u.nickname AS proposer_nickname
         FROM appointments a JOIN users u ON u.id = a.proposer_id
         WHERE a.room_id = $1 ORDER BY a.created_at DESC`,
        [roomId],
      )
      return success(res, result.rows.map(toDto))
    } catch (err) { next(err) }
  },

  // 내가 속한 모든 방의 약속(취소 제외) — 홈 화면 일정용
  async getMine(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId
      const result = await query<AppointmentRow & { partner_nickname: string | null }>(
        `SELECT a.*, u.nickname AS proposer_nickname, partner.nickname AS partner_nickname
         FROM appointments a
         JOIN chat_room_members me ON me.chat_room_id = a.room_id AND me.user_id = $1 AND me.left_at IS NULL
         JOIN users u ON u.id = a.proposer_id
         LEFT JOIN LATERAL (
           SELECT pu.nickname FROM chat_room_members cm
           JOIN users pu ON pu.id = cm.user_id
           WHERE cm.chat_room_id = a.room_id AND cm.user_id != $1
           LIMIT 1
         ) partner ON true
         WHERE a.status != 'cancelled'
           -- 차단(양방향) 상대와의 약속은 제외
           AND NOT EXISTS (
             SELECT 1 FROM chat_room_members other
             JOIN user_blocks ub
               ON (ub.blocker_id = $1 AND ub.blocked_id = other.user_id)
               OR (ub.blocker_id = other.user_id AND ub.blocked_id = $1)
             WHERE other.chat_room_id = a.room_id AND other.user_id != $1
           )
         ORDER BY a.date ASC, a.time ASC`,
        [userId],
      )
      return success(res, result.rows.map((r) => ({ ...toDto(r), partnerNickname: r.partner_nickname ?? undefined })))
    } catch (err) { next(err) }
  },

  async edit(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const { date, time, location } = req.body
      if (!date || !time || !location?.trim()) return fail(res, '날짜, 시간, 장소를 모두 입력해주세요.')

      const appt = await query<AppointmentRow & { proposer_nickname: string }>(
        `SELECT a.*, u.nickname AS proposer_nickname FROM appointments a
         JOIN users u ON u.id = a.proposer_id WHERE a.id = $1`,
        [id],
      )
      if (appt.rows.length === 0) return fail(res, '약속을 찾을 수 없습니다.', 404)

      const row = appt.rows[0]
      if (row.proposer_id !== req.user!.userId) return fail(res, '제안자만 수정할 수 있습니다.', 403)
      if (row.status === 'cancelled') return fail(res, '취소된 약속은 수정할 수 없습니다.')

      const result = await query<AppointmentRow>(
        `UPDATE appointments SET date=$1, time=$2, location=$3, status='pending', updated_at=NOW() WHERE id=$4
         RETURNING *, (SELECT nickname FROM users WHERE id=proposer_id) AS proposer_nickname`,
        [date, time, location.trim(), id],
      )
      const dto = toDto(result.rows[0])
      emitToRoom(row.room_id, 'appointment:updated', dto)
      return success(res, dto)
    } catch (err) { next(err) }
  },

  async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const { status } = req.body

      if (!['confirmed', 'cancelled'].includes(status)) return fail(res, '올바른 상태값이 아닙니다.')

      const appt = await query<AppointmentRow & { proposer_nickname: string }>(
        `SELECT a.*, u.nickname AS proposer_nickname FROM appointments a
         JOIN users u ON u.id = a.proposer_id WHERE a.id = $1`,
        [id],
      )
      if (appt.rows.length === 0) return fail(res, '약속을 찾을 수 없습니다.', 404)

      const row = appt.rows[0]
      const isProposer = row.proposer_id === req.user!.userId
      if (isProposer && status === 'confirmed') return fail(res, '본인이 제안한 약속은 직접 확정할 수 없습니다.')
      if (row.status === 'cancelled') return fail(res, '이미 취소된 약속입니다.')

      const result = await query<AppointmentRow>(
        `UPDATE appointments SET status = $1, updated_at = NOW() WHERE id = $2
         RETURNING *, (SELECT nickname FROM users WHERE id = proposer_id) AS proposer_nickname`,
        [status, id],
      )

      const dto = toDto(result.rows[0])
      emitToRoom(row.room_id, 'appointment:updated', dto)
      // 약속이 취소되면 상대방에게 취소 안내(닫아둔 사람도 알 수 있도록)
      if (status === 'cancelled') {
        await notifyAppointment(row.room_id, req.user!.userId, '[appointment:cancelled]')
      }
      return success(res, dto)
    } catch (err) { next(err) }
  },
}

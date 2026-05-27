import type { Response, NextFunction } from 'express'
import { query } from '../config/db'
import { success, fail } from '../utils/response'
import { emitToRoom } from '../services/socketService'
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
      // 본인이 제안한 약속은 취소만 가능, 상대방은 확정/취소 가능
      const isProposer = row.proposer_id === req.user!.userId
      if (isProposer && status === 'confirmed') return fail(res, '본인이 제안한 약속은 직접 확정할 수 없습니다.')

      const result = await query<AppointmentRow>(
        `UPDATE appointments SET status = $1, updated_at = NOW() WHERE id = $2
         RETURNING *, (SELECT nickname FROM users WHERE id = proposer_id) AS proposer_nickname`,
        [status, id],
      )

      const dto = toDto(result.rows[0])
      emitToRoom(row.room_id, 'appointment:updated', dto)
      return success(res, dto)
    } catch (err) { next(err) }
  },
}

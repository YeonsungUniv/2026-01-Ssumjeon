import type { Response, NextFunction } from 'express'
import { query } from '../config/db'
import { success, fail } from '../utils/response'
import type { AuthRequest, UserRow } from '../types'

export const adminController = {
  async listPending(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await query<UserRow>(
        `SELECT id, username, nickname, student_id, department, grade, gender, enrollment_doc, created_at
         FROM users WHERE status = 'pending' ORDER BY created_at ASC`,
      )
      return success(res, result.rows.map((u) => ({
        id: u.id,
        username: u.username,
        nickname: u.nickname,
        studentId: u.student_id,
        department: u.department,
        grade: u.grade,
        gender: u.gender,
        enrollmentDoc: u.enrollment_doc,
        createdAt: u.created_at,
      })))
    } catch (err) {
      next(err)
    }
  },

  async approveUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params
      const result = await query<UserRow>(
        `UPDATE users SET status = 'approved', updated_at = NOW() WHERE id = $1 AND status = 'pending' RETURNING id, username, nickname`,
        [userId],
      )
      if (result.rows.length === 0) return fail(res, '해당 대기 유저를 찾을 수 없습니다.', 404)
      return success(res, { approved: true, user: result.rows[0] })
    } catch (err) {
      next(err)
    }
  },

  async rejectUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params
      const result = await query<UserRow>(
        `UPDATE users SET status = 'rejected', updated_at = NOW() WHERE id = $1 AND status = 'pending' RETURNING id, username, nickname`,
        [userId],
      )
      if (result.rows.length === 0) return fail(res, '해당 대기 유저를 찾을 수 없습니다.', 404)
      return success(res, { rejected: true, user: result.rows[0] })
    } catch (err) {
      next(err)
    }
  },

  async listInquiries(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await query(
        `SELECT s.id, s.category, s.title, s.content, s.status, s.answer, s.answered_at, s.created_at,
                u.username, u.nickname
         FROM support_inquiries s
         JOIN users u ON u.id = s.user_id
         ORDER BY s.created_at DESC`,
      )
      return success(res, result.rows)
    } catch (err) {
      next(err)
    }
  },

  async answerInquiry(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const { answer } = req.body
      if (!answer?.trim()) return fail(res, '답변 내용을 입력해주세요.')

      const result = await query(
        `UPDATE support_inquiries
         SET answer = $1, status = 'answered', answered_at = NOW()
         WHERE id = $2
         RETURNING id, status`,
        [answer.trim(), id],
      )
      if (result.rows.length === 0) return fail(res, '문의를 찾을 수 없습니다.', 404)
      return success(res, result.rows[0])
    } catch (err) {
      next(err)
    }
  },
}

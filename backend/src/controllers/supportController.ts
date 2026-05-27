import type { Response, NextFunction } from 'express'
import { query } from '../config/db'
import { success, fail } from '../utils/response'
import type { AuthRequest } from '../types'

const CATEGORIES = ['계정/로그인', '매칭', '채팅', '신고', '기타']

export const supportController = {
  async submit(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { category, title, content } = req.body
      if (!CATEGORIES.includes(category)) return fail(res, '올바른 카테고리를 선택해주세요.')
      if (!title?.trim()) return fail(res, '제목을 입력해주세요.')
      if (!content?.trim()) return fail(res, '내용을 입력해주세요.')

      const result = await query(
        `INSERT INTO support_inquiries (user_id, category, title, content)
         VALUES ($1, $2, $3, $4) RETURNING id, category, title, content, status, created_at`,
        [req.user!.userId, category, title.trim(), content.trim()],
      )

      console.log(`[Support] 새 문의 — ${category} | ${req.user!.username} | ${title}`)
      return success(res, result.rows[0], 201)
    } catch (err) {
      next(err)
    }
  },

  async getMyInquiries(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await query(
        `SELECT id, category, title, content, status, answer, answered_at, created_at
         FROM support_inquiries WHERE user_id = $1 ORDER BY created_at DESC`,
        [req.user!.userId],
      )
      return success(res, result.rows)
    } catch (err) {
      next(err)
    }
  },

  async getInquiry(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await query(
        `SELECT id, category, title, content, status, answer, answered_at, created_at
         FROM support_inquiries WHERE id = $1 AND user_id = $2`,
        [req.params.id, req.user!.userId],
      )
      if (result.rows.length === 0) return fail(res, '문의를 찾을 수 없습니다.', 404)
      return success(res, result.rows[0])
    } catch (err) {
      next(err)
    }
  },
}

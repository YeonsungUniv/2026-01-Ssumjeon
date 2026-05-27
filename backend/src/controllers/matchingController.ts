import type { Response, NextFunction } from 'express'
import { matchingService } from '../services/matchingService'
import { success, fail } from '../utils/response'
import { query } from '../config/db'
import type { AuthRequest, UserRow } from '../types'

export const matchingController = {
  async getCards(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId
      const userResult = await query<UserRow>('SELECT gender FROM users WHERE id = $1', [userId])
      const gender = userResult.rows[0]?.gender
      if (!gender) return fail(res, '사용자를 찾을 수 없습니다.', 404)

      const { departments, grades, gender: filterGender } = req.query as {
        departments?: string
        grades?: string
        gender?: 'male' | 'female'
      }
      const filters = {
        departments: departments ? departments.split(',').map((d) => d.trim()).filter(Boolean) : undefined,
        grades: grades ? grades.split(',').map(Number).filter((n) => [1,2,3,4].includes(n)) : undefined,
        gender: filterGender || undefined,
      }

      const cards = await matchingService.getCards(userId, gender, filters)
      return success(res, cards)
    } catch (err) {
      next(err)
    }
  },

  async swipe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { targetId, action } = req.body
      const result = await matchingService.swipe(req.user!.userId, targetId, action)
      return success(res, result)
    } catch (err) {
      next(err)
    }
  },

  async getMatches(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const matches = await matchingService.getMatches(req.user!.userId)
      return success(res, matches)
    } catch (err) {
      next(err)
    }
  },

  async getDepartments(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await query<{ department: string }>(
        `SELECT DISTINCT department FROM users WHERE status = 'approved' ORDER BY department`,
      )
      return success(res, result.rows.map((r) => r.department))
    } catch (err) {
      next(err)
    }
  },
}

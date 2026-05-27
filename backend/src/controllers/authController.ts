import type { Request, Response, NextFunction } from 'express'
import { authService } from '../services/authService'
import { success, fail } from '../utils/response'
import { env } from '../config/env'

const COOKIE_OPTS = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
}

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, password, nickname, gender, department, grade } = req.body
      const enrollmentDocPath = req.file ? `/uploads/enrollments/${req.file.filename}` : null

      if (!department) return fail(res, '학과를 선택해주세요.')
      const gradeNum = parseInt(grade, 10)
      if (![1, 2, 3, 4].includes(gradeNum)) return fail(res, '학년을 선택해주세요.')

      const result = await authService.register({
        username,
        password,
        nickname,
        gender,
        department,
        grade: gradeNum,
        enrollmentDocPath,
      })

      return success(res, { user: result.user }, 201)
    } catch (err) {
      if (err instanceof Error) return fail(res, err.message)
      next(err)
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, password } = req.body
      const result = await authService.login(username, password)
      res.cookie('refreshToken', result.refreshToken, COOKIE_OPTS)
      return success(res, { user: result.user, accessToken: result.accessToken })
    } catch (err) {
      if (err instanceof Error) return fail(res, err.message, 401)
      next(err)
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies?.refreshToken
      if (!token) return fail(res, '리프레시 토큰이 없습니다.', 401)
      const result = await authService.refresh(token)
      return success(res, result)
    } catch (err) {
      if (err instanceof Error) return fail(res, err.message, 401)
      next(err)
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies?.refreshToken
      if (token) await authService.logout(token)
      res.clearCookie('refreshToken')
      return success(res, null)
    } catch (err) {
      next(err)
    }
  },
}

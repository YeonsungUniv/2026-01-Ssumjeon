import type { Request, Response, NextFunction } from 'express'
import { authService } from '../services/authService'
import { success, fail } from '../utils/response'

const COOKIE_OPTS = {
  httpOnly: true,
  secure: false,
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
}

export const authController = {
  async sendEmailCode(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body
      if (!email) return fail(res, '이메일을 입력해주세요.')
      const result = await authService.sendEmailCode(email.trim().toLowerCase())
      return success(res, result)
    } catch (err) {
      if (err instanceof Error) return fail(res, err.message)
      next(err)
    }
  },

  async verifyEmailCode(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, code } = req.body
      if (!email || !code) return fail(res, '이메일과 인증 코드를 입력해주세요.')
      const result = await authService.verifyEmailCode(email.trim().toLowerCase(), code.trim())
      return success(res, result)
    } catch (err) {
      if (err instanceof Error) return fail(res, err.message)
      next(err)
    }
  },

  async sendRecoveryCode(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body
      if (!email) return fail(res, '이메일을 입력해주세요.')
      const result = await authService.sendRecoveryCode(email.trim().toLowerCase())
      return success(res, result)
    } catch (err) {
      if (err instanceof Error) return fail(res, err.message)
      next(err)
    }
  },

  async findUsername(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, code } = req.body
      if (!email || !code) return fail(res, '이메일과 인증 코드를 입력해주세요.')
      const result = await authService.findUsername(email.trim().toLowerCase(), code.trim())
      return success(res, result)
    } catch (err) {
      if (err instanceof Error) return fail(res, err.message)
      next(err)
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, code, newPassword } = req.body
      if (!email || !code || !newPassword) return fail(res, '필수 항목을 모두 입력해주세요.')
      const result = await authService.resetPassword(email.trim().toLowerCase(), code.trim(), newPassword)
      return success(res, result)
    } catch (err) {
      if (err instanceof Error) return fail(res, err.message)
      next(err)
    }
  },

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, password, nickname, gender, department, grade, email } = req.body

      if (!email) return fail(res, '이메일을 입력해주세요.')
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
        email: email.trim().toLowerCase(),
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
      if (err instanceof Error) return fail(res, err.message, 400)
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

  async checkUsername(req: Request, res: Response, next: NextFunction) {
    try {
      const { query } = await import('../config/db')
      const { username } = req.params
      const result = await query('SELECT 1 FROM users WHERE username = $1', [username])
      return success(res, { available: result.rows.length === 0 })
    } catch (err) {
      next(err)
    }
  },
}

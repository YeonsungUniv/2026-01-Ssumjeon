import type { Response, NextFunction } from 'express'
import { verifyAccessToken } from '../utils/jwt'
import { fail } from '../utils/response'
import type { AuthRequest } from '../types'

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    fail(res, '인증이 필요합니다.', 401)
    return
  }

  const token = header.slice(7)
  try {
    req.user = verifyAccessToken(token)
    next()
  } catch {
    fail(res, '유효하지 않은 토큰입니다.', 401)
  }
}

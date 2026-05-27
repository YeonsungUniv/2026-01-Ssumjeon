import type { Response, NextFunction } from 'express'
import { fail } from '../utils/response'
import type { AuthRequest } from '../types'

export function adminOnly(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user?.isAdmin) {
    fail(res, '관리자 권한이 필요합니다.', 403)
    return
  }
  next()
}

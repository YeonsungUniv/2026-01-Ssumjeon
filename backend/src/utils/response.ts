import type { Response } from 'express'

export function success<T>(res: Response, data: T, status = 200, message?: string) {
  return res.status(status).json({ success: true, data, message })
}

export function fail(res: Response, message: string, status = 400) {
  return res.status(status).json({ success: false, data: null, message })
}

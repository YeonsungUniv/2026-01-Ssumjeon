import type { Response, NextFunction } from 'express'
import { chatRequestService } from '../services/chatRequestService'
import { emitToUser } from '../services/socketService'
import { success, fail } from '../utils/response'
import { query } from '../config/db'
import type { AuthRequest, UserRow } from '../types'

export const chatRequestController = {
  async browse(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId
      const userResult = await query<UserRow>('SELECT gender FROM users WHERE id=$1', [userId])
      const gender = userResult.rows[0]?.gender
      if (!gender) return fail(res, '사용자를 찾을 수 없습니다.', 404)

      const { departments, entryYears, gender: gFilter, page, limit } = req.query as Record<string, string>
      const filters = {
        departments: departments ? departments.split(',').map((d) => d.trim()).filter(Boolean) : undefined,
        entryYears: entryYears ? entryYears.split(',').map(Number).filter((n) => Number.isInteger(n) && n > 2000 && n < 2100) : undefined,
        gender: (gFilter as 'male' | 'female') || undefined,
      }

      const result = await chatRequestService.browseUsers(
        userId, gender, filters,
        page ? parseInt(page, 10) : 1,
        limit ? parseInt(limit, 10) : 20,
      )
      return success(res, result)
    } catch (err) {
      next(err)
    }
  },

  async sendRequest(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const senderId = req.user!.userId
      const { receiverId } = req.body
      if (!receiverId) return fail(res, 'receiverId가 필요합니다.', 400)

      const result = await chatRequestService.sendRequest(senderId, receiverId)
      emitToUser(receiverId, 'chat_request:received', result.senderInfo)

      return success(res, { requestId: result.requestId })
    } catch (err) {
      next(err)
    }
  },

  async getIncoming(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await chatRequestService.getIncoming(req.user!.userId)
      return success(res, result)
    } catch (err) {
      next(err)
    }
  },

  async getOutgoing(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await chatRequestService.getOutgoing(req.user!.userId)
      return success(res, result)
    } catch (err) {
      next(err)
    }
  },

  async respond(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { requestId } = req.params
      const { action } = req.body
      if (!['accepted', 'rejected'].includes(action)) return fail(res, '잘못된 action입니다.', 400)

      const result = await chatRequestService.respondToRequest(requestId, req.user!.userId, action as 'accepted' | 'rejected')

      if (action === 'accepted' && result.chatRoomId) {
        emitToUser(result.senderId, 'chat_request:accepted', {
          requestId,
          chatRoomId: result.chatRoomId,
        })
      } else {
        emitToUser(result.senderId, 'chat_request:rejected', { requestId })
      }

      return success(res, result)
    } catch (err) {
      next(err)
    }
  },

  async cancel(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { requestId } = req.params
      await chatRequestService.cancelRequest(requestId, req.user!.userId)
      return success(res, null)
    } catch (err) {
      next(err)
    }
  },

  async deleteSent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { requestId } = req.params
      await chatRequestService.deleteSentRequest(requestId, req.user!.userId)
      return success(res, null)
    } catch (err) {
      if (err instanceof Error) return fail(res, err.message)
      next(err)
    }
  },

  async deleteAllSent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await chatRequestService.deleteAllSentRequests(req.user!.userId)
      return success(res, result)
    } catch (err) {
      if (err instanceof Error) return fail(res, err.message)
      next(err)
    }
  },

  async deleteAllReceived(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await chatRequestService.deleteAllReceivedRequests(req.user!.userId)
      return success(res, result)
    } catch (err) {
      if (err instanceof Error) return fail(res, err.message)
      next(err)
    }
  },

  async getPendingCount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const count = await chatRequestService.getPendingIncomingCount(req.user!.userId)
      return success(res, { count })
    } catch (err) {
      next(err)
    }
  },
}

import type { Response, NextFunction } from 'express'
import { groupMatchingService } from '../services/groupMatchingService'
import { success, fail } from '../utils/response'
import { emitToUser } from '../services/socketService'
import { query } from '../config/db'
import type { AuthRequest, UserRow, GroupRoomRow } from '../types'

export const groupMatchingController = {
  async getRooms(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const gender = req.query.gender as 'male' | 'female' | undefined
      const rooms = await groupMatchingService.getRooms(gender)
      return success(res, rooms)
    } catch (err) {
      next(err)
    }
  },

  async getMyRoom(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const room = await groupMatchingService.getMyRoom(req.user!.userId)
      return success(res, room)
    } catch (err) {
      next(err)
    }
  },

  async createRoom(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId
      const userResult = await query<UserRow>('SELECT gender FROM users WHERE id = $1', [userId])
      const gender = userResult.rows[0]?.gender
      if (!gender) return fail(res, '사용자를 찾을 수 없습니다.', 404)

      // 이미 방에 속해 있는지 체크
      const existing = await groupMatchingService.getMyRoom(userId)
      if (existing) return fail(res, '이미 참여 중인 방이 있습니다.')

      const room = await groupMatchingService.createRoom(userId, gender, req.body)
      return success(res, room, 201)
    } catch (err) {
      if (err instanceof Error) return fail(res, err.message)
      next(err)
    }
  },

  async joinRoom(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const room = await groupMatchingService.joinRoom(req.params.roomId, req.user!.userId)
      return success(res, room)
    } catch (err) {
      if (err instanceof Error) return fail(res, err.message)
      next(err)
    }
  },

  async joinByCode(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { code } = req.body
      if (!code) return fail(res, '초대 코드를 입력해주세요.')
      const room = await groupMatchingService.joinRoomByCode(code, req.user!.userId)
      return success(res, room)
    } catch (err) {
      if (err instanceof Error) return fail(res, err.message)
      next(err)
    }
  },

  async leaveRoom(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await groupMatchingService.leaveRoom(req.params.roomId, req.user!.userId)
      return success(res, null)
    } catch (err) {
      next(err)
    }
  },

  async disbandRoom(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await groupMatchingService.disbandRoom(req.params.roomId, req.user!.userId)
      return success(res, null)
    } catch (err) {
      if (err instanceof Error) return fail(res, err.message)
      next(err)
    }
  },

  async cancelMatch(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await groupMatchingService.cancelMatch(req.params.roomId, req.user!.userId)
      return success(res, result)
    } catch (err) {
      if (err instanceof Error) return fail(res, err.message)
      next(err)
    }
  },

  async inviteUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { roomId } = req.params
      const { targetUserId } = req.body
      const userId = req.user!.userId

      // 방 정보 + 방장 확인
      const roomResult = await query<GroupRoomRow>(
        'SELECT * FROM group_rooms WHERE id = $1',
        [roomId],
      )
      const room = roomResult.rows[0]
      if (!room) return fail(res, '방을 찾을 수 없습니다.', 404)
      if (room.leader_id !== userId) return fail(res, '방장만 초대할 수 있습니다.', 403)
      if (room.status !== 'waiting') return fail(res, '대기 중인 방만 초대할 수 있습니다.')

      // 인원 확인
      const countResult = await query<{ count: string }>(
        'SELECT COUNT(*) as count FROM group_room_members WHERE group_room_id = $1',
        [roomId],
      )
      if (Number(countResult.rows[0].count) >= room.max_members)
        return fail(res, '방이 꽉 찼습니다.')

      // 대상 유저 확인 (같은 성별, 승인 상태)
      const targetResult = await query<UserRow>(
        'SELECT * FROM users WHERE id = $1 AND status = $2',
        [targetUserId, 'approved'],
      )
      const target = targetResult.rows[0]
      if (!target) return fail(res, '사용자를 찾을 수 없습니다.', 404)
      if (target.gender !== room.gender) return fail(res, '같은 성별 유저만 초대할 수 있습니다.')

      // 이미 방에 있는지 확인
      const alreadyIn = await groupMatchingService.getMyRoom(targetUserId)
      if (alreadyIn) return fail(res, '이미 다른 방에 참여 중인 사용자입니다.')

      // 초대자 닉네임
      const inviterResult = await query<UserRow>('SELECT nickname FROM users WHERE id = $1', [userId])
      const inviterNickname = inviterResult.rows[0]?.nickname ?? ''

      emitToUser(targetUserId, 'group:invite', {
        roomId,
        roomTitle: room.title,
        inviterNickname,
      })

      return success(res, null)
    } catch (err) {
      if (err instanceof Error) return fail(res, err.message)
      next(err)
    }
  },

  async requestMatch(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { targetRoomId } = req.body
      const result = await groupMatchingService.requestMatch(
        req.params.roomId,
        targetRoomId,
        req.user!.userId,
      )
      result.memberIds.forEach((uid) =>
        emitToUser(uid, 'group:matched', { chatRoomId: result.chatRoomId }),
      )
      return success(res, result)
    } catch (err) {
      if (err instanceof Error) return fail(res, err.message)
      next(err)
    }
  },
}

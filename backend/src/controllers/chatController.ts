import type { Response, NextFunction } from 'express'
import { chatService } from '../services/chatService'
import { emitToRoom, emitToUser } from '../services/socketService'
import { success, fail } from '../utils/response'
import { uploadToS3 } from '../utils/s3'
import { query } from '../config/db'
import type { AuthRequest } from '../types'

export const chatController = {
  async getRooms(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const rooms = await chatService.getRooms(req.user!.userId)
      return success(res, rooms)
    } catch (err) {
      next(err)
    }
  },

  async getMessages(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { roomId } = req.params
      const page = Math.max(1, parseInt(req.query.page as string ?? '1', 10))
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string ?? '30', 10)))
      const result = await chatService.getMessages(roomId, req.user!.userId, page, limit)
      return success(res, result)
    } catch (err) {
      next(err)
    }
  },

  async sendMessage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { roomId } = req.params
      const { content } = req.body
      const senderId = req.user!.userId
      const message = await chatService.sendMessage(roomId, senderId, content)
      await emitMessageToNonBlockers(roomId, senderId, message)
      return success(res, message, 201)
    } catch (err) {
      next(err)
    }
  },

  async sendImage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { roomId } = req.params
      if (!req.file) return fail(res, '이미지 파일이 없습니다.')
      const senderId = req.user!.userId
      const imageUrl = await uploadToS3(req.file.buffer, req.file.mimetype, 'chat')
      const message = await chatService.sendMessage(roomId, senderId, imageUrl)
      await emitMessageToNonBlockers(roomId, senderId, message)
      return success(res, message, 201)
    } catch (err) {
      next(err)
    }
  },

  async markAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await chatService.markAsRead(req.params.roomId, req.user!.userId)
      emitToRoom(req.params.roomId, 'messages:read', { userId: req.user!.userId })
      return success(res, null)
    } catch (err) {
      next(err)
    }
  },

  async getRoomInfo(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { roomId } = req.params
      const userId = req.user!.userId

      const roomResult = await import('../config/db').then(({ query }) =>
        query<{ id: string; type: string; group_room_id: string | null }>(
          'SELECT * FROM chat_rooms WHERE id = $1', [roomId],
        ),
      )
      const room = roomResult.rows[0]
      if (!room) return fail(res, '채팅방을 찾을 수 없습니다.', 404)

      const { query } = await import('../config/db')

      if (room.type === 'group' && room.group_room_id) {
        const grResult = await query<{ id: string; title: string; leader_id: string }>(
          'SELECT id, title, leader_id FROM group_rooms WHERE id = $1', [room.group_room_id],
        )
        const gr = grResult.rows[0]
        const membersResult = await query<{ id: string; nickname: string; department: string; grade: number; profile_image: string | null; is_leader: boolean }>(
          `SELECT u.id, u.nickname, u.department, u.grade, u.profile_image,
                  COALESCE(bool_or(grm.is_leader), false) AS is_leader
           FROM chat_room_members crm
           JOIN users u ON u.id = crm.user_id
           LEFT JOIN group_room_members grm ON grm.user_id = u.id AND grm.is_leader = true
           WHERE crm.chat_room_id = $1
           GROUP BY u.id, u.nickname, u.department, u.grade, u.profile_image`, [roomId],
        )
        return success(res, {
          type: 'group',
          groupRoomId: room.group_room_id,
          name: gr?.title,
          isLeader: gr?.leader_id === userId,
          members: membersResult.rows.map((m) => ({
            userId: m.id, nickname: m.nickname, department: m.department,
            grade: m.grade, profileImage: m.profile_image, isLeader: m.is_leader,
          })),
        })
      }

      // 1:1
      const partnerResult = await query<{ id: string; nickname: string; department: string; grade: number; profile_image: string | null; bio: string | null; mbti: string | null; interests: string[] }>(
        `SELECT u.id, u.nickname, u.department, u.grade, u.profile_image, u.bio, u.mbti, u.interests
         FROM chat_room_members crm JOIN users u ON u.id = crm.user_id
         WHERE crm.chat_room_id = $1 AND crm.user_id != $2`, [roomId, userId],
      )
      const p = partnerResult.rows[0]
      return success(res, {
        type: 'individual',
        partner: p ? { userId: p.id, nickname: p.nickname, department: p.department, grade: p.grade, profileImage: p.profile_image, bio: p.bio, mbti: p.mbti, interests: p.interests } : null,
      })
    } catch (err) { next(err) }
  },

  async updateRoomName(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { roomId } = req.params
      const { name } = req.body
      if (!name?.trim()) return fail(res, '이름을 입력해주세요.')

      const { query } = await import('../config/db')
      const roomResult = await query<{ group_room_id: string | null }>(
        'SELECT group_room_id FROM chat_rooms WHERE id = $1', [roomId],
      )
      const groupRoomId = roomResult.rows[0]?.group_room_id
      if (!groupRoomId) return fail(res, '그룹 채팅방만 이름을 변경할 수 있습니다.')

      const leaderCheck = await query(
        'SELECT 1 FROM group_rooms WHERE id = $1 AND leader_id = $2', [groupRoomId, req.user!.userId],
      )
      if (leaderCheck.rows.length === 0) return fail(res, '방장만 이름을 변경할 수 있습니다.', 403)

      await query('UPDATE group_rooms SET title = $1 WHERE id = $2', [name.trim(), groupRoomId])
      return success(res, { name: name.trim() })
    } catch (err) { next(err) }
  },

  async leaveRoom(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await chatService.leaveRoom(req.params.roomId, req.user!.userId)
      // 1:1 채팅방 나가기 → 남은 상대에게 시스템 메시지 전송
      if (result?.systemMessage) {
        emitToRoom(req.params.roomId, 'message:new', result.systemMessage, req.user!.userId)
      }
      return success(res, null)
    } catch (err) {
      if (err instanceof Error) return fail(res, err.message)
      next(err)
    }
  },

  async blockUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await chatService.blockUser(req.user!.userId, req.params.userId)
      return success(res, null)
    } catch (err) {
      if (err instanceof Error) return fail(res, err.message)
      next(err)
    }
  },

  async unblockUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await chatService.unblockUser(req.user!.userId, req.params.userId)
      return success(res, null)
    } catch (err) {
      next(err)
    }
  },

  async getBlockedUsers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const users = await chatService.getBlockedUsers(req.user!.userId)
      return success(res, users)
    } catch (err) {
      next(err)
    }
  },
}

// 차단한 멤버를 제외하고 메시지 소켓 전송
async function emitMessageToNonBlockers(roomId: string, senderId: string, message: unknown) {
  const members = await query<{ user_id: string }>(
    'SELECT user_id FROM chat_room_members WHERE chat_room_id = $1 AND user_id != $2',
    [roomId, senderId],
  )
  for (const { user_id } of members.rows) {
    const isBlocking = await query(
      'SELECT 1 FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2',
      [user_id, senderId],
    )
    if (isBlocking.rows.length === 0) {
      emitToUser(user_id, 'message:new', message)
    }
  }
}

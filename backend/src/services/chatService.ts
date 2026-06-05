import { v4 as uuidv4 } from 'uuid'
import { query } from '../config/db'
import { deleteMultipleFromS3 } from '../utils/s3'
import type { MessageRow, ChatRoomRow, UserRow } from '../types'

// 채팅 목록 미리보기 텍스트 변환
function previewLastMessage(content: string | null): string | null {
  if (!content) return null
  if (content === '[expired_image]') return '🗑️ 만료된 이미지'
  if (content.includes('amazonaws.com') || content.startsWith('/uploads/')) return '📷 사진을 보냈습니다'
  return content
}

// 채팅방의 S3 이미지 메시지 전부 삭제
async function deleteChatRoomImages(roomId: string) {
  const result = await query<{ content: string }>(
    "SELECT content FROM messages WHERE room_id = $1 AND content LIKE '%amazonaws.com/chat/%'",
    [roomId],
  )
  const urls = result.rows.map((r) => r.content)
  if (urls.length > 0) await deleteMultipleFromS3(urls)
}

export const chatService = {
  async getRooms(userId: string) {
    const result = await query<
      ChatRoomRow & {
        partner_id: string | null
        partner_nickname: string | null
        partner_image: string | null
        group_name: string | null
        last_message: string | null
        last_message_at: Date | null
        unread_count: string
      }
    >(
      `SELECT DISTINCT ON (cr.id)
         cr.id,
         cr.type,
         -- 1:1 상대방 정보 (LATERAL로 정확히 1명만)
         partner.id AS partner_id,
         partner.nickname AS partner_nickname,
         partner.profile_image AS partner_image,
         -- 그룹 방 이름
         gr.title AS group_name,
         -- 마지막 메시지
         last_msg.content AS last_message,
         last_msg.created_at AS last_message_at,
         -- 안읽은 메시지 수
         (SELECT COUNT(*) FROM messages m2
          WHERE m2.room_id = cr.id AND m2.sender_id != $1 AND m2.is_read = false) AS unread_count
       FROM chat_rooms cr
       JOIN chat_room_members crm ON crm.chat_room_id = cr.id AND crm.user_id = $1
       LEFT JOIN LATERAL (
         SELECT u.id, u.nickname, u.profile_image
         FROM chat_room_members crm2
         JOIN users u ON u.id = crm2.user_id
         WHERE crm2.chat_room_id = cr.id AND crm2.user_id != $1 AND cr.type = 'individual'
         LIMIT 1
       ) partner ON true
       LEFT JOIN group_rooms gr ON gr.id = cr.group_room_id
       LEFT JOIN LATERAL (
         SELECT content, created_at FROM messages m_last
         WHERE m_last.room_id = cr.id
           AND m_last.sender_id NOT IN (
             SELECT blocked_id FROM user_blocks WHERE blocker_id = $1
           )
         ORDER BY m_last.created_at DESC LIMIT 1
       ) last_msg ON true
       ORDER BY cr.id, last_msg.created_at DESC NULLS LAST`,
      [userId],
    )

    return result.rows.map((r) => ({
      id: r.id,
      type: r.type,
      partner: r.partner_id
        ? { id: r.partner_id, nickname: r.partner_nickname, profileImage: r.partner_image }
        : undefined,
      groupName: r.group_name,
      lastMessage: previewLastMessage(r.last_message),
      lastMessageAt: r.last_message_at?.toISOString(),
      unreadCount: parseInt(r.unread_count, 10),
      isBlocked: false, // 차단 여부는 개별 room 조회 시 판단
    }))
  },

  async getMessages(roomId: string, userId: string, page = 1, limit = 30) {
    // 접근 권한 확인
    const access = await query(
      'SELECT 1 FROM chat_room_members WHERE chat_room_id = $1 AND user_id = $2',
      [roomId, userId],
    )
    if (access.rows.length === 0) throw new Error('접근 권한이 없습니다.')

    const offset = (page - 1) * limit
    const result = await query<MessageRow & { sender_nickname: string; sender_profile_image: string | null }>(
      `SELECT m.*, u.nickname AS sender_nickname, u.profile_image AS sender_profile_image
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.room_id = $1
         AND m.sender_id NOT IN (
           SELECT blocked_id FROM user_blocks WHERE blocker_id = $4
         )
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [roomId, limit, offset, userId],
    )

    const countResult = await query<{ count: string }>('SELECT COUNT(*) FROM messages WHERE room_id = $1', [roomId])
    const total = parseInt(countResult.rows[0].count, 10)

    return {
      items: result.rows.reverse().map((m) => ({
        id: m.id,
        roomId: m.room_id,
        senderId: m.sender_id,
        senderNickname: m.sender_nickname,
        senderProfileImage: m.sender_profile_image ?? undefined,
        content: m.content,
        createdAt: m.created_at.toISOString(),
        isRead: m.is_read,
      })),
      total,
      page,
      limit,
      hasMore: offset + limit < total,
    }
  },

  async sendMessage(roomId: string, senderId: string, content: string) {
    const access = await query(
      'SELECT 1 FROM chat_room_members WHERE chat_room_id = $1 AND user_id = $2',
      [roomId, senderId],
    )
    if (access.rows.length === 0) throw new Error('접근 권한이 없습니다.')


    const id = uuidv4()
    const result = await query<MessageRow & { sender_nickname: string; sender_profile_image: string | null }>(
      `INSERT INTO messages (id, room_id, sender_id, content)
       VALUES ($1, $2, $3, $4)
       RETURNING *,
         (SELECT nickname FROM users WHERE id = $3) AS sender_nickname,
         (SELECT profile_image FROM users WHERE id = $3) AS sender_profile_image`,
      [id, roomId, senderId, content],
    )

    const m = result.rows[0]
    return {
      id: m.id,
      roomId: m.room_id,
      senderId: m.sender_id,
      senderNickname: m.sender_nickname,
      senderProfileImage: m.sender_profile_image ?? undefined,
      content: m.content,
      createdAt: m.created_at.toISOString(),
      isRead: m.is_read,
    }
  },

  async markAsRead(roomId: string, userId: string) {
    await query(
      'UPDATE messages SET is_read = true WHERE room_id = $1 AND sender_id != $2',
      [roomId, userId],
    )
  },

  async leaveRoom(roomId: string, userId: string) {
    const access = await query(
      'SELECT 1 FROM chat_room_members WHERE chat_room_id = $1 AND user_id = $2',
      [roomId, userId],
    )
    if (access.rows.length === 0) throw new Error('채팅방 멤버가 아닙니다.')
    await query('DELETE FROM chat_room_members WHERE chat_room_id = $1 AND user_id = $2', [roomId, userId])

    // 1:1 채팅방: 두 멤버 모두 나갔으면 채팅방+이미지 삭제
    const remaining = await query<{ count: string }>(
      'SELECT COUNT(*) AS count FROM chat_room_members WHERE chat_room_id = $1',
      [roomId],
    )
    if (parseInt(remaining.rows[0].count, 10) === 0) {
      await deleteChatRoomImages(roomId)
      await query('DELETE FROM chat_rooms WHERE id = $1', [roomId])
      return
    }

    // 그룹 채팅방이면 과팅방 멤버에서도 제거 (방장이면 위임 또는 방 해체)
    const chatRoom = await query<{ group_room_id: string | null }>(
      "SELECT group_room_id FROM chat_rooms WHERE id = $1 AND type = 'group'",
      [roomId],
    )
    const groupRoomId = chatRoom.rows[0]?.group_room_id
    if (groupRoomId) {
      const leaderCheck = await query<{ is_leader: boolean }>(
        'SELECT is_leader FROM group_room_members WHERE group_room_id = $1 AND user_id = $2',
        [groupRoomId, userId],
      )
      const isLeader = leaderCheck.rows[0]?.is_leader ?? false

      await query('DELETE FROM group_room_members WHERE group_room_id = $1 AND user_id = $2', [groupRoomId, userId])

      if (isLeader) {
        const remainingMembers = await query<{ user_id: string }>(
          'SELECT user_id FROM group_room_members WHERE group_room_id = $1 LIMIT 1',
          [groupRoomId],
        )
        if (remainingMembers.rows.length === 0) {
          await query("UPDATE group_rooms SET status = 'closed' WHERE id = $1", [groupRoomId])
          await deleteChatRoomImages(roomId)
          await query('DELETE FROM chat_rooms WHERE id = $1', [roomId])
        } else {
          const nextLeader = remainingMembers.rows[0].user_id
          await query(
            'UPDATE group_room_members SET is_leader = true WHERE group_room_id = $1 AND user_id = $2',
            [groupRoomId, nextLeader],
          )
          await query('UPDATE group_rooms SET leader_id = $1 WHERE id = $2', [nextLeader, groupRoomId])
        }
      }
    }
  },

  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) throw new Error('자기 자신을 차단할 수 없습니다.')
    await query(
      'INSERT INTO user_blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [blockerId, blockedId],
    )
    // 채팅 내역은 증거 보존을 위해 삭제하지 않음
  },

  async unblockUser(blockerId: string, blockedId: string) {
    await query('DELETE FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2', [blockerId, blockedId])
  },

  async getBlockedUsers(userId: string) {
    const result = await query<{ id: string; nickname: string }>(
      `SELECT u.id, u.nickname FROM users u
       JOIN user_blocks ub ON ub.blocked_id = u.id
       WHERE ub.blocker_id = $1`,
      [userId],
    )
    return result.rows
  },
}

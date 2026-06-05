import { v4 as uuidv4 } from 'uuid'
import { query } from '../config/db'
import type { UserRow } from '../types'

type BrowseRow = UserRow & {
  request_id: string | null
  request_status: string | null
  incoming_request_id: string | null
}

type IncomingRow = UserRow & {
  request_id: string
  request_created_at: Date
}

type OutgoingRow = UserRow & {
  request_id: string
  request_status: string
  request_created_at: Date
}

function toBrowseCard(row: BrowseRow) {
  return {
    userId: row.id,
    nickname: row.nickname,
    department: row.department,
    grade: row.grade,
    gender: row.gender,
    profileImage: row.profile_image ?? undefined,
    bio: row.bio ?? undefined,
    mbti: row.mbti ?? undefined,
    interests: row.interests,
    outgoingRequestId: null,
    outgoingRequestStatus: null,
    incomingRequestId: row.incoming_request_id ?? null,
  }
}

export const chatRequestService = {
  async browseUsers(
    userId: string,
    userGender: 'male' | 'female',
    filters?: { departments?: string[]; grades?: number[]; gender?: 'male' | 'female' },
    page = 1,
    limit = 20,
  ) {
    const targetGender = filters?.gender ?? (userGender === 'male' ? 'female' : 'male')
    const offset = (page - 1) * limit
    const params: unknown[] = [userId, targetGender]
    const extra: string[] = []
    let idx = 3

    if (filters?.departments?.length) {
      extra.push(`u.department = ANY($${idx}::text[])`)
      params.push(filters.departments)
      idx++
    }
    if (filters?.grades?.length) {
      extra.push(`u.grade = ANY($${idx}::int[])`)
      params.push(filters.grades)
      idx++
    }

    const where = extra.length > 0 ? `AND ${extra.join(' AND ')}` : ''
    params.push(limit, offset)

    const browseSql = `
      SELECT u.*,
        in_req.id AS incoming_request_id
      FROM users u
      LEFT JOIN chat_requests in_req
        ON in_req.receiver_id = $1 AND in_req.sender_id = u.id AND in_req.status = 'pending'
      WHERE u.id != $1
        AND u.gender = $2
        AND u.status = 'approved'
        AND u.id NOT IN (
          SELECT CASE WHEN m.user1_id = $1 THEN m.user2_id ELSE m.user1_id END
          FROM matches m WHERE m.user1_id = $1 OR m.user2_id = $1
        )
        ${where}
      ORDER BY u.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `

    const countSql = `
      SELECT COUNT(*) AS count FROM users u
      WHERE u.id != $1
        AND u.gender = $2
        AND u.status = 'approved'
        AND u.id NOT IN (
          SELECT CASE WHEN m.user1_id = $1 THEN m.user2_id ELSE m.user1_id END
          FROM matches m WHERE m.user1_id = $1 OR m.user2_id = $1
        )
        ${where}
    `

    const [browseResult, countResult] = await Promise.all([
      query<BrowseRow>(browseSql, params),
      query<{ count: string }>(countSql, params.slice(0, -2)),
    ])

    const total = parseInt(countResult.rows[0].count, 10)

    return {
      items: browseResult.rows.map(toBrowseCard),
      total,
      page,
      limit,
      hasMore: offset + browseResult.rows.length < total,
    }
  },

  async sendRequest(senderId: string, receiverId: string) {
    if (senderId === receiverId) throw new Error('자기 자신에게 신청할 수 없습니다.')

    const existing = await query<{ id: string; status: string }>(
      'SELECT id, status FROM chat_requests WHERE sender_id=$1 AND receiver_id=$2',
      [senderId, receiverId],
    )
    if (existing.rows.length > 0) {
      const { id: existingId, status } = existing.rows[0]
      if (status === 'accepted') throw new Error('이미 채팅 중인 상대입니다.')
      if (status === 'rejected') throw new Error('상대방이 이미 신청을 거절했습니다.')
      if (status === 'pending') {
        await query('DELETE FROM chat_requests WHERE id=$1', [existingId])
      }
    }

    const [receiverRes, senderRes] = await Promise.all([
      query<UserRow>("SELECT * FROM users WHERE id=$1 AND status='approved'", [receiverId]),
      query<UserRow>('SELECT * FROM users WHERE id=$1', [senderId]),
    ])
    if (!receiverRes.rows[0]) throw new Error('사용자를 찾을 수 없습니다.')

    const sender = senderRes.rows[0]
    const id = uuidv4()
    await query('INSERT INTO chat_requests (id, sender_id, receiver_id) VALUES ($1,$2,$3)', [id, senderId, receiverId])

    return {
      requestId: id,
      senderInfo: {
        requestId: id,
        userId: sender.id,
        nickname: sender.nickname,
        department: sender.department,
        grade: sender.grade,
        gender: sender.gender,
        profileImage: sender.profile_image ?? undefined,
        bio: sender.bio ?? undefined,
        mbti: sender.mbti ?? undefined,
        interests: sender.interests,
      },
    }
  },

  async getIncoming(userId: string) {
    const result = await query<IncomingRow>(
      `SELECT u.*, cr.id AS request_id, cr.created_at AS request_created_at
       FROM chat_requests cr
       JOIN users u ON u.id = cr.sender_id
       WHERE cr.receiver_id = $1 AND cr.status = 'pending'
       ORDER BY cr.created_at DESC`,
      [userId],
    )
    return result.rows.map((row) => ({
      requestId: row.request_id,
      requestCreatedAt: row.request_created_at.toISOString(),
      userId: row.id,
      nickname: row.nickname,
      department: row.department,
      grade: row.grade,
      gender: row.gender,
      profileImage: row.profile_image ?? undefined,
      bio: row.bio ?? undefined,
      mbti: row.mbti ?? undefined,
      interests: row.interests,
    }))
  },

  async getOutgoing(userId: string) {
    const result = await query<OutgoingRow>(
      `SELECT u.*, cr.id AS request_id, cr.status AS request_status, cr.created_at AS request_created_at
       FROM chat_requests cr
       JOIN users u ON u.id = cr.receiver_id
       WHERE cr.sender_id = $1
       ORDER BY cr.created_at DESC`,
      [userId],
    )
    return result.rows.map((row) => ({
      requestId: row.request_id,
      status: row.request_status as 'pending' | 'accepted' | 'rejected',
      requestCreatedAt: row.request_created_at.toISOString(),
      userId: row.id,
      nickname: row.nickname,
      department: row.department,
      grade: row.grade,
      gender: row.gender,
      profileImage: row.profile_image ?? undefined,
    }))
  },

  async respondToRequest(requestId: string, userId: string, action: 'accepted' | 'rejected') {
    const reqRes = await query<{ id: string; sender_id: string; receiver_id: string }>(
      "SELECT * FROM chat_requests WHERE id=$1 AND receiver_id=$2 AND status='pending'",
      [requestId, userId],
    )
    const req = reqRes.rows[0]
    if (!req) throw new Error('신청을 찾을 수 없습니다.')

    await query('UPDATE chat_requests SET status=$1 WHERE id=$2', [action, requestId])

    if (action !== 'accepted') return { senderId: req.sender_id }

    const existingRoom = await query<{ id: string }>(
      `SELECT cr.id FROM chat_rooms cr
       JOIN chat_room_members m1 ON m1.chat_room_id = cr.id AND m1.user_id = $1
       JOIN chat_room_members m2 ON m2.chat_room_id = cr.id AND m2.user_id = $2
       WHERE cr.type = 'individual'`,
      [req.sender_id, userId],
    )

    let chatRoomId: string
    if (existingRoom.rows.length > 0) {
      chatRoomId = existingRoom.rows[0].id
    } else {
      chatRoomId = uuidv4()
      await query("INSERT INTO chat_rooms (id, type) VALUES ($1,'individual')", [chatRoomId])
      await query(
        'INSERT INTO chat_room_members (chat_room_id, user_id) VALUES ($1,$2),($1,$3)',
        [chatRoomId, req.sender_id, userId],
      )
    }

    return { senderId: req.sender_id, chatRoomId }
  },

  async cancelRequest(requestId: string, userId: string) {
    const result = await query(
      "DELETE FROM chat_requests WHERE id=$1 AND sender_id=$2 AND status='pending' RETURNING id",
      [requestId, userId],
    )
    if ((result.rowCount ?? 0) === 0) throw new Error('취소할 수 없는 신청입니다.')
  },

  async getPendingIncomingCount(userId: string) {
    const result = await query<{ count: string }>(
      "SELECT COUNT(*) AS count FROM chat_requests WHERE receiver_id=$1 AND status='pending'",
      [userId],
    )
    return parseInt(result.rows[0].count, 10)
  },
}

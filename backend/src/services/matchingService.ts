import { v4 as uuidv4 } from 'uuid'
import { query } from '../config/db'
import type { UserRow, SwipeRow } from '../types'

function toMatchCard(row: UserRow) {
  return {
    userId: row.id,
    nickname: row.nickname,
    department: row.department,
    grade: row.grade,
    gender: row.gender,
    profileImage: row.profile_image,
    bio: row.bio,
    mbti: row.mbti,
    interests: row.interests,
  }
}

export const matchingService = {
  async getCards(
    userId: string,
    userGender: 'male' | 'female',
    filters?: { departments?: string[]; grades?: number[]; gender?: 'male' | 'female' },
  ) {
    const targetGender = filters?.gender ?? (userGender === 'male' ? 'female' : 'male')
    const params: unknown[] = [targetGender, userId]
    const extra: string[] = []
    let idx = 3

    if (filters?.departments && filters.departments.length > 0) {
      extra.push(`u.department = ANY($${idx}::text[])`)
      params.push(filters.departments)
      idx++
    }
    if (filters?.grades && filters.grades.length > 0) {
      extra.push(`u.grade = ANY($${idx}::int[])`)
      params.push(filters.grades)
      idx++
    }

    const where = extra.length > 0 ? `AND ${extra.join(' AND ')}` : ''

    const result = await query<UserRow>(
      `SELECT u.* FROM users u
       WHERE u.gender = $1
         AND u.id != $2
         AND u.id NOT IN (SELECT target_id FROM swipes WHERE swiper_id = $2)
         ${where}
       ORDER BY RANDOM()
       LIMIT 10`,
      params,
    )

    return result.rows.map(toMatchCard)
  },

  async swipe(swiperId: string, targetId: string, action: 'like' | 'pass') {
    // 스와이프 기록 저장
    await query(
      'INSERT INTO swipes (id, swiper_id, target_id, action) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
      [uuidv4(), swiperId, targetId, action],
    )

    if (action === 'pass') return { matched: false }

    // 상대방이 나를 좋아요 했는지 확인
    const mutual = await query<SwipeRow>(
      'SELECT * FROM swipes WHERE swiper_id = $1 AND target_id = $2 AND action = \'like\'',
      [targetId, swiperId],
    )

    if (mutual.rows.length === 0) return { matched: false }

    // 이미 매칭된 경우 중복 생성 방지
    const existingMatch = await query<{ id: string }>(
      'SELECT id FROM matches WHERE (user1_id=$1 AND user2_id=$2) OR (user1_id=$2 AND user2_id=$1)',
      [swiperId, targetId],
    )
    if (existingMatch.rows.length > 0) return { matched: true, matchId: existingMatch.rows[0].id }

    // 매칭 생성
    const matchId = uuidv4()
    await query(
      'INSERT INTO matches (id, user1_id, user2_id, status) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
      [matchId, swiperId, targetId, 'matched'],
    )

    // 채팅방 중복 확인 후 생성
    const existingRoom = await query<{ id: string }>(
      `SELECT cr.id FROM chat_rooms cr
       JOIN chat_room_members m1 ON m1.chat_room_id = cr.id AND m1.user_id = $1
       JOIN chat_room_members m2 ON m2.chat_room_id = cr.id AND m2.user_id = $2
       WHERE cr.type = 'individual'`,
      [swiperId, targetId],
    )
    if (existingRoom.rows.length > 0) return { matched: true, matchId }

    const chatRoomId = uuidv4()
    await query('INSERT INTO chat_rooms (id, type) VALUES ($1, $2)', [chatRoomId, 'individual'])
    await query(
      'INSERT INTO chat_room_members (chat_room_id, user_id) VALUES ($1, $2), ($1, $3)',
      [chatRoomId, swiperId, targetId],
    )

    return { matched: true, matchId }
  },

  async getMatches(userId: string) {
    const result = await query<UserRow>(
      `SELECT u.* FROM users u
       JOIN matches m ON (m.user1_id = u.id OR m.user2_id = u.id)
       WHERE (m.user1_id = $1 OR m.user2_id = $1)
         AND u.id != $1
         AND m.status = 'matched'`,
      [userId],
    )
    return result.rows.map(toMatchCard)
  },
}

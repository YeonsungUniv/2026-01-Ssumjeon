import { v4 as uuidv4 } from 'uuid'
import { query } from '../config/db'
import { deleteMultipleFromS3 } from '../utils/s3'
import type { GroupRoomRow, UserRow } from '../types'

async function deleteChatRoomImages(roomId: string) {
  const result = await query<{ content: string }>(
    "SELECT content FROM messages WHERE room_id = $1 AND content LIKE '%amazonaws.com/chat/%'",
    [roomId],
  )
  const urls = result.rows.map((r) => r.content)
  if (urls.length > 0) await deleteMultipleFromS3(urls)
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

async function buildRoomDto(room: GroupRoomRow) {
  const [membersResult, chatRoomResult] = await Promise.all([
    query<UserRow & { is_leader: boolean }>(
      `SELECT u.*, grm.is_leader
       FROM group_room_members grm
       JOIN users u ON u.id = grm.user_id
       WHERE grm.group_room_id = $1`,
      [room.id],
    ),
    query<{ id: string }>(
      'SELECT id FROM chat_rooms WHERE group_room_id = $1 ORDER BY created_at ASC LIMIT 1',
      [room.id],
    ),
  ])

  return {
    id: room.id,
    title: room.title,
    description: room.description,
    gender: room.gender,
    maxMembers: room.max_members,
    preferredGender: room.preferred_gender,
    memberCount: membersResult.rows.length,
    members: membersResult.rows.map((m) => ({
      userId: m.id,
      nickname: m.nickname,
      department: m.department,
      grade: m.grade,
      studentId: m.student_id ?? undefined,
      profileImage: m.profile_image,
      isLeader: m.is_leader,
    })),
    status: room.status,
    chatRoomId: chatRoomResult.rows[0]?.id ?? null,
    inviteCode: room.invite_code ?? null,
    isPrivate: !!room.is_private,
    allowedGender: room.allowed_gender ?? null,
    createdAt: room.created_at.toISOString(),
  }
}

export const groupMatchingService = {
  async getRooms(gender?: 'male' | 'female') {
    const sql = gender
      ? 'SELECT * FROM group_rooms WHERE status = \'waiting\' AND gender = $1 ORDER BY created_at DESC'
      : 'SELECT * FROM group_rooms WHERE status = \'waiting\' ORDER BY created_at DESC'

    const result = await query<GroupRoomRow>(sql, gender ? [gender] : [])
    return Promise.all(result.rows.map(buildRoomDto))
  },

  async getMyRoom(userId: string) {
    const result = await query<GroupRoomRow>(
      `SELECT gr.* FROM group_rooms gr
       JOIN group_room_members grm ON grm.group_room_id = gr.id
       WHERE grm.user_id = $1 AND gr.status != 'closed'`,
      [userId],
    )
    if (result.rows.length === 0) return null
    return buildRoomDto(result.rows[0])
  },

  async createRoom(
    leaderId: string,
    leaderGender: 'male' | 'female',
    payload: { title: string; description?: string; maxMembers: number; preferredGender?: 'male' | 'female'; isPrivate?: boolean; allowedGender?: 'male' | 'female' },
  ) {
    const roomId = uuidv4()
    const chatRoomId = uuidv4()

    // 중복 없는 초대 코드 생성
    let inviteCode = generateInviteCode()
    while (true) {
      const dup = await query('SELECT 1 FROM group_rooms WHERE invite_code = $1', [inviteCode])
      if (dup.rows.length === 0) break
      inviteCode = generateInviteCode()
    }

    // preferred_gender는 NOT NULL — 미지정 시 방장의 반대 성별로 기본 설정
    const preferredGender = payload.preferredGender ?? (leaderGender === 'male' ? 'female' : 'male')

    await query(
      `INSERT INTO group_rooms (id, title, description, leader_id, gender, max_members, preferred_gender, invite_code, is_private, allowed_gender)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [roomId, payload.title, payload.description ?? null, leaderId, leaderGender, payload.maxMembers, preferredGender, inviteCode, payload.isPrivate ?? false, payload.allowedGender ?? null],
    )
    await query(
      'INSERT INTO group_room_members (group_room_id, user_id, is_leader) VALUES ($1, $2, true)',
      [roomId, leaderId],
    )
    // 팀 내부 채팅방 생성 + 방장 추가
    await query(
      'INSERT INTO chat_rooms (id, type, group_room_id) VALUES ($1, $2, $3)',
      [chatRoomId, 'group', roomId],
    )
    await query(
      'INSERT INTO chat_room_members (chat_room_id, user_id) VALUES ($1, $2)',
      [chatRoomId, leaderId],
    )

    const result = await query<GroupRoomRow>('SELECT * FROM group_rooms WHERE id = $1', [roomId])
    return buildRoomDto(result.rows[0])
  },

  async joinRoomByCode(code: string, userId: string) {
    const roomResult = await query<GroupRoomRow & { invite_code: string }>(
      'SELECT * FROM group_rooms WHERE invite_code = $1',
      [code.toUpperCase()],
    )
    const room = roomResult.rows[0]
    if (!room) throw new Error('유효하지 않은 초대 코드입니다.')
    return this.joinRoom(room.id, userId, true)
  },

  async joinRoom(roomId: string, userId: string, viaCode = false) {
    const roomResult = await query<GroupRoomRow>('SELECT * FROM group_rooms WHERE id = $1', [roomId])
    const room = roomResult.rows[0]
    if (!room) throw new Error('방을 찾을 수 없습니다.')
    if (room.status !== 'waiting') throw new Error('참여할 수 없는 방입니다.')

    // 비공개 방은 초대코드로만 입장 가능
    if (room.is_private && !viaCode) {
      throw new Error('초대코드로만 참여할 수 있는 방입니다.')
    }

    if (room.allowed_gender) {
      const userRes = await query<{ gender: string }>('SELECT gender FROM users WHERE id = $1', [userId])
      const userGender = userRes.rows[0]?.gender
      if (userGender !== room.allowed_gender) {
        throw new Error(`${room.allowed_gender === 'male' ? '남성' : '여성'}만 참여할 수 있는 방입니다.`)
      }
    }

    const countResult = await query('SELECT COUNT(*) FROM group_room_members WHERE group_room_id = $1', [roomId])
    const count = parseInt((countResult.rows[0] as { count: string }).count, 10)
    if (count >= room.max_members) throw new Error('방이 꽉 찼습니다.')

    await query(
      'INSERT INTO group_room_members (group_room_id, user_id, is_leader) VALUES ($1, $2, false) ON CONFLICT DO NOTHING',
      [roomId, userId],
    )
    // 팀 채팅방에 멤버 추가
    const chatRoom = await query<{ id: string }>(
      'SELECT id FROM chat_rooms WHERE group_room_id = $1 ORDER BY created_at ASC LIMIT 1',
      [roomId],
    )
    if (chatRoom.rows[0]) {
      await query(
        'INSERT INTO chat_room_members (chat_room_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [chatRoom.rows[0].id, userId],
      )
    }

    return buildRoomDto(room)
  },

  async leaveRoom(roomId: string, userId: string) {
    const leaderCheck = await query<{ is_leader: boolean }>(
      'SELECT is_leader FROM group_room_members WHERE group_room_id = $1 AND user_id = $2',
      [roomId, userId],
    )
    const isLeader = leaderCheck.rows[0]?.is_leader ?? false

    await query('DELETE FROM group_room_members WHERE group_room_id = $1 AND user_id = $2', [roomId, userId])

    const chatRoom = await query<{ id: string }>(
      'SELECT id FROM chat_rooms WHERE group_room_id = $1 ORDER BY created_at ASC LIMIT 1',
      [roomId],
    )
    if (chatRoom.rows[0]) {
      await query(
        'DELETE FROM chat_room_members WHERE chat_room_id = $1 AND user_id = $2',
        [chatRoom.rows[0].id, userId],
      )
    }

    if (isLeader) {
      const remaining = await query<{ user_id: string }>(
        'SELECT user_id FROM group_room_members WHERE group_room_id = $1 LIMIT 1',
        [roomId],
      )
      if (remaining.rows.length === 0) {
        // 남은 멤버 없음 → 방 해체
        await query("UPDATE group_rooms SET status = 'closed' WHERE id = $1", [roomId])
        if (chatRoom.rows[0]) {
          await deleteChatRoomImages(chatRoom.rows[0].id)
          await query('DELETE FROM chat_rooms WHERE id = $1', [chatRoom.rows[0].id])
        }
      } else {
        // 방장 위임
        const nextLeader = remaining.rows[0].user_id
        await query(
          'UPDATE group_room_members SET is_leader = true WHERE group_room_id = $1 AND user_id = $2',
          [roomId, nextLeader],
        )
        await query('UPDATE group_rooms SET leader_id = $1 WHERE id = $2', [nextLeader, roomId])
      }
    }
  },

  // 방장: 방 해체 (waiting 상태)
  async disbandRoom(roomId: string, userId: string) {
    const leaderCheck = await query(
      'SELECT 1 FROM group_rooms WHERE id = $1 AND leader_id = $2 AND status = \'waiting\'',
      [roomId, userId],
    )
    if (leaderCheck.rows.length === 0) throw new Error('방 해체 권한이 없습니다.')
    await query('UPDATE group_rooms SET status = \'closed\' WHERE id = $1', [roomId])
    await query('DELETE FROM group_room_members WHERE group_room_id = $1', [roomId])
    // 팀 채팅방 이미지 삭제 후 방 삭제
    const teamRoom = await query<{ id: string }>('SELECT id FROM chat_rooms WHERE group_room_id = $1', [roomId])
    for (const r of teamRoom.rows) await deleteChatRoomImages(r.id)
    await query('DELETE FROM chat_rooms WHERE group_room_id = $1', [roomId])
  },

  // 방장: 매칭 취소 (matched 상태 → waiting 으로 복구)
  async cancelMatch(roomId: string, userId: string) {
    const leaderCheck = await query(
      'SELECT 1 FROM group_rooms WHERE id = $1 AND leader_id = $2 AND status = \'matched\'',
      [roomId, userId],
    )
    if (leaderCheck.rows.length === 0) throw new Error('매칭 취소 권한이 없습니다.')

    // 연결된 그룹 채팅방 조회 → 상대 팀 찾기 → 삭제
    const chatRoom = await query<{ id: string }>(
      'SELECT id FROM chat_rooms WHERE group_room_id = $1 AND type = \'group\'',
      [roomId],
    )
    if (chatRoom.rows.length > 0) {
      // 같은 채팅방에 연결된 다른 그룹방(상대 팀) 찾아서 함께 waiting 복구
      const otherRoom = await query<{ id: string }>(
        'SELECT id FROM chat_rooms WHERE type = \'group\' AND id = $1 AND group_room_id != $2',
        [chatRoom.rows[0].id, roomId],
      )
      if (otherRoom.rows.length > 0) {
        await query('UPDATE group_rooms SET status = \'waiting\' WHERE id = $1', [otherRoom.rows[0].id])
      }
      await deleteChatRoomImages(chatRoom.rows[0].id)
      await query('DELETE FROM chat_rooms WHERE id = $1', [chatRoom.rows[0].id])
    }

    await query('UPDATE group_rooms SET status = \'waiting\' WHERE id = $1', [roomId])

    return { cancelled: true }
  },

  // 두 팀 매칭 확정 → 상태 변경 + 그룹 채팅방 생성
  async requestMatch(myRoomId: string, targetRoomId: string, userId: string) {
    const [myRoomRes, targetRoomRes] = await Promise.all([
      query<GroupRoomRow>('SELECT * FROM group_rooms WHERE id = $1', [myRoomId]),
      query<GroupRoomRow>('SELECT * FROM group_rooms WHERE id = $1', [targetRoomId]),
    ])

    const myRoom = myRoomRes.rows[0]
    const targetRoom = targetRoomRes.rows[0]

    if (!myRoom || !targetRoom) throw new Error('방을 찾을 수 없습니다.')
    if (myRoom.status !== 'waiting' || targetRoom.status !== 'waiting')
      throw new Error('매칭할 수 없는 상태입니다.')

    // 리더만 매칭 요청 가능
    const leaderCheck = await query(
      'SELECT 1 FROM group_room_members WHERE group_room_id = $1 AND user_id = $2 AND is_leader = true',
      [myRoomId, userId],
    )
    if (leaderCheck.rows.length === 0) throw new Error('팀장만 매칭을 신청할 수 있습니다.')

    // 두 방 모두 matched 상태로 변경
    await query(
      "UPDATE group_rooms SET status = 'matched' WHERE id = ANY($1)",
      [[myRoomId, targetRoomId]],
    )

    // 그룹 채팅방 생성
    const chatRoomId = uuidv4()
    await query('INSERT INTO chat_rooms (id, type, group_room_id) VALUES ($1, $2, $3)', [chatRoomId, 'group', myRoomId])

    // 두 팀 전원 채팅방 멤버로 추가
    const membersRes = await query<{ user_id: string }>(
      'SELECT user_id FROM group_room_members WHERE group_room_id = ANY($1)',
      [[myRoomId, targetRoomId]],
    )
    for (const m of membersRes.rows) {
      await query(
        'INSERT INTO chat_room_members (chat_room_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [chatRoomId, m.user_id],
      )
    }

    return { matched: true, chatRoomId, memberIds: membersRes.rows.map((m) => m.user_id) }
  },
}

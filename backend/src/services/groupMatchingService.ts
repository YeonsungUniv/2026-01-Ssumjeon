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

  // 과팅 매칭 신청 (즉시 매칭 X → 상대 팀장 수락 대기)
  async requestMatch(myRoomId: string, targetRoomId: string, userId: string) {
    if (myRoomId === targetRoomId) throw new Error('같은 방에는 신청할 수 없습니다.')

    const [myRoomRes, targetRoomRes] = await Promise.all([
      query<GroupRoomRow>('SELECT * FROM group_rooms WHERE id = $1', [myRoomId]),
      query<GroupRoomRow>('SELECT * FROM group_rooms WHERE id = $1', [targetRoomId]),
    ])
    const myRoom = myRoomRes.rows[0]
    const targetRoom = targetRoomRes.rows[0]
    if (!myRoom || !targetRoom) throw new Error('방을 찾을 수 없습니다.')
    if (myRoom.status !== 'waiting' || targetRoom.status !== 'waiting')
      throw new Error('매칭할 수 없는 상태입니다.')
    if (myRoom.leader_id !== userId) throw new Error('팀장만 매칭을 신청할 수 있습니다.')

    // 대기중 신청 생성(중복이면 갱신)
    await query(
      `INSERT INTO group_match_requests (id, from_room_id, to_room_id, status)
       VALUES ($1, $2, $3, 'pending')
       ON CONFLICT (from_room_id, to_room_id)
       DO UPDATE SET status = 'pending', created_at = NOW()`,
      [uuidv4(), myRoomId, targetRoomId],
    )

    return { requested: true, targetLeaderId: targetRoom.leader_id, fromTitle: myRoom.title }
  },

  // 매칭 신청 수락/거절 (상대 팀장)
  async respondMatch(requestId: string, userId: string, accept: boolean) {
    const reqRes = await query<{ from_room_id: string; to_room_id: string; status: string }>(
      'SELECT from_room_id, to_room_id, status FROM group_match_requests WHERE id = $1',
      [requestId],
    )
    const reqRow = reqRes.rows[0]
    if (!reqRow) throw new Error('신청을 찾을 수 없습니다.')
    if (reqRow.status !== 'pending') throw new Error('이미 처리된 신청입니다.')

    const toRoom = (await query<GroupRoomRow>('SELECT * FROM group_rooms WHERE id = $1', [reqRow.to_room_id])).rows[0]
    if (!toRoom) throw new Error('방을 찾을 수 없습니다.')
    if (toRoom.leader_id !== userId) throw new Error('팀장만 수락/거절할 수 있습니다.')

    if (!accept) {
      await query("UPDATE group_match_requests SET status = 'rejected' WHERE id = $1", [requestId])
      return { accepted: false as const }
    }

    const fromRoom = (await query<GroupRoomRow>('SELECT * FROM group_rooms WHERE id = $1', [reqRow.from_room_id])).rows[0]
    if (!fromRoom || fromRoom.status !== 'waiting' || toRoom.status !== 'waiting') {
      await query("UPDATE group_match_requests SET status = 'rejected' WHERE id = $1", [requestId])
      throw new Error('상대 팀이 이미 매칭되었거나 사라졌습니다.')
    }

    const result = await performGroupMatch(reqRow.from_room_id, reqRow.to_room_id)
    await query("UPDATE group_match_requests SET status = 'accepted' WHERE id = $1", [requestId])
    // 두 방과 얽힌 다른 대기 신청은 모두 거절 처리
    await query(
      `UPDATE group_match_requests SET status = 'rejected'
       WHERE status = 'pending' AND (from_room_id = ANY($1) OR to_room_id = ANY($1))`,
      [[reqRow.from_room_id, reqRow.to_room_id]],
    )
    return { accepted: true as const, ...result }
  },

  // 내 방 기준 받은/보낸 매칭 신청 목록
  async getMatchRequests(userId: string) {
    const myRoomRes = await query<GroupRoomRow>(
      `SELECT gr.* FROM group_rooms gr
       JOIN group_room_members grm ON grm.group_room_id = gr.id
       WHERE grm.user_id = $1 AND gr.status = 'waiting'`,
      [userId],
    )
    if (myRoomRes.rows.length === 0) return { incoming: [], outgoing: [] }
    const roomId = myRoomRes.rows[0].id

    const [incomingRes, outgoingRes] = await Promise.all([
      query<{ id: string; from_room_id: string }>(
        `SELECT id, from_room_id FROM group_match_requests WHERE to_room_id = $1 AND status = 'pending' ORDER BY created_at DESC`,
        [roomId],
      ),
      query<{ id: string; to_room_id: string }>(
        `SELECT id, to_room_id FROM group_match_requests WHERE from_room_id = $1 AND status = 'pending'`,
        [roomId],
      ),
    ])

    const incoming = await Promise.all(
      incomingRes.rows.map(async (r) => {
        const room = (await query<GroupRoomRow>('SELECT * FROM group_rooms WHERE id = $1', [r.from_room_id])).rows[0]
        return { requestId: r.id, room: await buildRoomDto(room) }
      }),
    )
    const outgoing = await Promise.all(
      outgoingRes.rows.map(async (r) => {
        const room = (await query<GroupRoomRow>('SELECT * FROM group_rooms WHERE id = $1', [r.to_room_id])).rows[0]
        return { requestId: r.id, toRoomId: r.to_room_id, room: room ? await buildRoomDto(room) : null }
      }),
    )
    return { incoming, outgoing }
  },

  // 보낸 매칭 신청 취소 (신청한 팀장)
  async cancelMatchRequest(requestId: string, userId: string) {
    const reqRes = await query<{ from_room_id: string; status: string }>(
      'SELECT from_room_id, status FROM group_match_requests WHERE id = $1',
      [requestId],
    )
    const row = reqRes.rows[0]
    if (!row) throw new Error('신청을 찾을 수 없습니다.')
    if (row.status !== 'pending') throw new Error('이미 처리된 신청입니다.')
    const fromRoom = (await query<GroupRoomRow>('SELECT leader_id FROM group_rooms WHERE id = $1', [row.from_room_id])).rows[0]
    if (!fromRoom || fromRoom.leader_id !== userId) throw new Error('신청한 팀장만 취소할 수 있습니다.')
    await query('DELETE FROM group_match_requests WHERE id = $1', [requestId])
    return { cancelled: true }
  },
}

// 실제 매칭 확정: 두 방 matched + 그룹 채팅방 생성 + 전원 추가
async function performGroupMatch(myRoomId: string, targetRoomId: string) {
  await query("UPDATE group_rooms SET status = 'matched' WHERE id = ANY($1)", [[myRoomId, targetRoomId]])
  const chatRoomId = uuidv4()
  await query('INSERT INTO chat_rooms (id, type, group_room_id) VALUES ($1, $2, $3)', [chatRoomId, 'group', myRoomId])
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
}

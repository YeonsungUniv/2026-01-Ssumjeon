import { query } from '../config/db'
import { deleteMultipleFromS3 } from '../utils/s3'
import type { UserRow } from '../types'

// 사용자와 연관 데이터를 완전히 삭제 (1:1 채팅방·이메일 인증코드·S3 파일 포함).
// 본인 탈퇴(deleteMe)와 관리자 강제 삭제에서 공통 사용.
export async function purgeUser(userId: string): Promise<boolean> {
  const userResult = await query<UserRow>('SELECT * FROM users WHERE id = $1', [userId])
  const user = userResult.rows[0]
  if (!user) return false

  // 대상이 속한 1:1 채팅방 (방 껍데기·상대 메시지까지 통째로 삭제)
  const dmRooms = await query<{ id: string }>(
    `SELECT cr.id FROM chat_rooms cr
     JOIN chat_room_members m ON m.chat_room_id = cr.id AND m.user_id = $1
     WHERE cr.type = 'individual'`,
    [userId],
  )
  const dmRoomIds = dmRooms.rows.map((r) => r.id)

  // S3 파일 수집: 프로필 이미지 + 재학증명서 + 채팅 이미지 + 삭제될 1:1 방의 이미지
  const s3Urls: string[] = []
  if (user.profile_image) s3Urls.push(user.profile_image)
  if (user.enrollment_doc) s3Urls.push(user.enrollment_doc)

  const imgRows = await query<{ content: string }>(
    `SELECT content FROM messages
     WHERE content LIKE '%amazonaws.com/chat/%'
       AND (sender_id = $1 ${dmRoomIds.length ? 'OR room_id = ANY($2::uuid[])' : ''})`,
    dmRoomIds.length ? [userId, dmRoomIds] : [userId],
  )
  imgRows.rows.forEach((r) => s3Urls.push(r.content))

  // 1:1 채팅방 통째 삭제 (CASCADE로 멤버·메시지 제거)
  if (dmRoomIds.length) {
    await query('DELETE FROM chat_rooms WHERE id = ANY($1::uuid[])', [dmRoomIds])
  }

  // 이메일 인증 코드 정리 (user FK가 없어 따로 삭제)
  if (user.email) {
    await query('DELETE FROM email_verification_codes WHERE LOWER(email) = LOWER($1)', [user.email])
  }

  // 사용자 삭제 (나머지 연관 데이터는 ON DELETE CASCADE로 제거)
  await query('DELETE FROM users WHERE id = $1', [userId])

  // S3 파일 삭제 (DB 삭제 후 비동기로)
  if (s3Urls.length > 0) deleteMultipleFromS3([...new Set(s3Urls)]).catch(() => {})

  return true
}

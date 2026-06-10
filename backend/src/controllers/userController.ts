import type { Response, NextFunction } from 'express'
import { query } from '../config/db'
import { success, fail } from '../utils/response'
import { getIO } from '../services/socketService'
import { uploadToS3, deleteFromS3, deleteMultipleFromS3 } from '../utils/s3'
import type { AuthRequest, UserRow } from '../types'

export const userController = {
  async getMe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await query<UserRow>('SELECT * FROM users WHERE id = $1', [req.user!.userId])
      const u = result.rows[0]
      if (!u) return fail(res, '사용자를 찾을 수 없습니다.', 404)

      return success(res, {
        id: u.id,
        email: u.email,
        nickname: u.nickname,
        studentId: u.student_id,
        department: u.department,
        grade: u.grade,
        gender: u.gender,
        profileImage: u.profile_image,
        bio: u.bio,
        mbti: u.mbti,
        interests: u.interests,
        createdAt: u.created_at,
      })
    } catch (err) {
      next(err)
    }
  },

  async getUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // 차단(양방향) 관계면 프로필 비공개
      const blocked = await query(
        `SELECT 1 FROM user_blocks
         WHERE (blocker_id = $1 AND blocked_id = $2)
            OR (blocker_id = $2 AND blocked_id = $1) LIMIT 1`,
        [req.user!.userId, req.params.userId],
      )
      if (blocked.rows.length > 0) return fail(res, '사용자를 찾을 수 없습니다.', 404)

      const result = await query<UserRow>('SELECT * FROM users WHERE id = $1', [req.params.userId])
      const u = result.rows[0]
      if (!u) return fail(res, '사용자를 찾을 수 없습니다.', 404)

      return success(res, {
        id: u.id,
        nickname: u.nickname,
        department: u.department,
        grade: u.grade,
        studentId: u.student_id,
        gender: u.gender,
        profileImage: u.profile_image,
        bio: u.bio,
        mbti: u.mbti,
        interests: u.interests,
      })
    } catch (err) {
      next(err)
    }
  },

  async uploadProfileImage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) return fail(res, '이미지를 업로드해주세요.')

      // 기존 프로필 이미지 URL 조회
      const prev = await query<{ profile_image: string | null }>(
        'SELECT profile_image FROM users WHERE id = $1', [req.user!.userId],
      )
      const oldUrl = prev.rows[0]?.profile_image

      const imageUrl = await uploadToS3(req.file.buffer, req.file.mimetype, 'profiles')
      await query('UPDATE users SET profile_image = $1, updated_at = NOW() WHERE id = $2', [imageUrl, req.user!.userId])

      // 기존 S3 이미지 삭제 (신규 업로드 성공 후)
      if (oldUrl) deleteFromS3(oldUrl).catch(() => {})

      return success(res, { profileImage: imageUrl })
    } catch (err) {
      next(err)
    }
  },

  async changePassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = req.body
      if (!currentPassword || !newPassword) return fail(res, '현재 비밀번호와 새 비밀번호를 입력해주세요.')
      if (newPassword.length < 8) return fail(res, '새 비밀번호는 8자 이상이어야 합니다.')

      const result = await query<UserRow>('SELECT * FROM users WHERE id = $1', [req.user!.userId])
      const user = result.rows[0]
      if (!user) return fail(res, '사용자를 찾을 수 없습니다.', 404)

      const bcrypt = await import('bcryptjs')
      const valid = await bcrypt.compare(currentPassword, user.password_hash)
      if (!valid) return fail(res, '현재 비밀번호가 올바르지 않습니다.')

      const newHash = await bcrypt.hash(newPassword, 12)
      await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, req.user!.userId])

      return success(res, null)
    } catch (err) {
      next(err)
    }
  },

  async checkNickname(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { nickname } = req.params
      const result = await query(
        'SELECT id FROM users WHERE nickname = $1 AND id != $2',
        [nickname, req.user!.userId],
      )
      return success(res, { available: result.rows.length === 0 })
    } catch (err) {
      next(err)
    }
  },

  async searchUsers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const q = ((req.query.q as string) ?? '').trim()
      if (q.length < 1) return success(res, [])
      const result = await query<UserRow>(
        `SELECT id, nickname, department, grade, gender, profile_image
         FROM users
         WHERE status = 'approved' AND id != $1 AND nickname ILIKE $2
         ORDER BY nickname
         LIMIT 10`,
        [req.user!.userId, `%${q}%`],
      )
      return success(res, result.rows.map((u) => ({
        id: u.id,
        nickname: u.nickname,
        department: u.department,
        grade: u.grade,
        gender: u.gender,
        profileImage: u.profile_image,
      })))
    } catch (err) {
      next(err)
    }
  },

  async deleteMe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId
      const { password } = req.body
      if (!password) return fail(res, '비밀번호를 입력해주세요.')

      // 비밀번호 확인
      const userResult = await query<UserRow>('SELECT * FROM users WHERE id = $1', [userId])
      const user = userResult.rows[0]
      if (!user) return fail(res, '사용자를 찾을 수 없습니다.', 404)

      const bcrypt = await import('bcryptjs')
      const valid = await bcrypt.compare(password, user.password_hash)
      if (!valid) return fail(res, '비밀번호가 올바르지 않습니다.')

      // 내가 속한 1:1 채팅방 id 수집 (방 껍데기·상대 메시지까지 통째로 삭제)
      const dmRooms = await query<{ id: string }>(
        `SELECT cr.id FROM chat_rooms cr
         JOIN chat_room_members m ON m.chat_room_id = cr.id AND m.user_id = $1
         WHERE cr.type = 'individual'`,
        [userId],
      )
      const dmRoomIds = dmRooms.rows.map((r) => r.id)

      // S3 파일 수집: 프로필 이미지 + 재학증명서 + 내 채팅 이미지 + 삭제될 1:1 방의 모든 이미지
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
      await query('DELETE FROM email_verification_codes WHERE LOWER(email) = LOWER($1)', [user.email])

      // 사용자 삭제 (나머지 연관 데이터는 ON DELETE CASCADE로 제거)
      await query('DELETE FROM users WHERE id = $1', [userId])

      // S3 파일 삭제 (DB 삭제 후 비동기로)
      if (s3Urls.length > 0) deleteMultipleFromS3([...new Set(s3Urls)]).catch(() => {})

      // 리프레시 토큰 쿠키 제거
      res.clearCookie('refreshToken')
      return success(res, null)
    } catch (err) {
      next(err)
    }
  },

  async updateMe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // 학과·학년·학번은 수정 불가 (가입 시 확정)
      const { nickname, bio, mbti, interests } = req.body

      if (nickname !== undefined) {
        if (typeof nickname !== 'string' || nickname.trim().length === 0)
          return fail(res, '닉네임을 입력해주세요.')
        if (nickname.length > 7)
          return fail(res, '닉네임은 7자 이하로 입력해주세요.')
        if (/[\s!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(nickname))
          return fail(res, '공백과 특수문자는 사용할 수 없습니다.')

        // 다른 유저가 같은 닉네임을 사용 중인지 확인
        const dupCheck = await query(
          'SELECT id FROM users WHERE nickname = $1 AND id != $2',
          [nickname, req.user!.userId],
        )
        if (dupCheck.rows.length > 0) return fail(res, '이미 사용 중인 닉네임입니다.')
      }

      const result = await query<UserRow>(
        `UPDATE users SET
           nickname = COALESCE($1, nickname),
           bio = COALESCE($2, bio),
           mbti = COALESCE($3, mbti),
           interests = COALESCE($4, interests),
           updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [nickname, bio, mbti, interests, req.user!.userId],
      )

      const u = result.rows[0]
      const updated = {
        id: u.id,
        email: u.email,
        nickname: u.nickname,
        studentId: u.student_id,
        department: u.department,
        grade: u.grade,
        gender: u.gender,
        profileImage: u.profile_image,
        bio: u.bio,
        mbti: u.mbti,
        interests: u.interests,
      }

      // 접속 중인 모든 유저에게 프로필 변경 알림
      try {
        getIO().emit('profile:updated', updated)
      } catch { /* 소켓 미초기화 시 무시 */ }

      return success(res, updated)
    } catch (err) {
      next(err)
    }
  },
}

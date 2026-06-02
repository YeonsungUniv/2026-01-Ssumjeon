import type { Response, NextFunction } from 'express'
import { query } from '../config/db'
import { success, fail } from '../utils/response'
import { getIO } from '../services/socketService'
import { uploadToS3, deleteFromS3 } from '../utils/s3'
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
      const result = await query<UserRow>('SELECT * FROM users WHERE id = $1', [req.params.userId])
      const u = result.rows[0]
      if (!u) return fail(res, '사용자를 찾을 수 없습니다.', 404)

      return success(res, {
        id: u.id,
        nickname: u.nickname,
        department: u.department,
        grade: u.grade,
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

  async updateMe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { nickname, bio, mbti, interests, department, grade } = req.body

      if (nickname !== undefined) {
        if (typeof nickname !== 'string' || nickname.trim().length === 0)
          return fail(res, '닉네임을 입력해주세요.')
        if (nickname.length > 7)
          return fail(res, '닉네임은 7자 이하로 입력해주세요.')
        if (/[\s!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(nickname))
          return fail(res, '공백과 특수문자는 사용할 수 없습니다.')
      }

      if (grade !== undefined) {
        const gradeNum = Number(grade)
        if (!Number.isInteger(gradeNum) || gradeNum < 1 || gradeNum > 4)
          return fail(res, '학년은 1~4 사이여야 합니다.')
      }

      const result = await query<UserRow>(
        `UPDATE users SET
           nickname = COALESCE($1, nickname),
           bio = COALESCE($2, bio),
           mbti = COALESCE($3, mbti),
           interests = COALESCE($4, interests),
           department = COALESCE($5, department),
           grade = COALESCE($6, grade),
           updated_at = NOW()
         WHERE id = $7
         RETURNING *`,
        [nickname, bio, mbti, interests, department || null, grade ? Number(grade) : null, req.user!.userId],
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

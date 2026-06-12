import type { Response, NextFunction } from 'express'
import { query } from '../config/db'
import { success, fail } from '../utils/response'
import { entryYearOf } from '../utils/cohort'
import { deleteFromS3 } from '../utils/s3'
import { sendAccountResultEmail } from '../services/authService'
import { purgeUser } from '../services/userService'
import type { AuthRequest, UserRow } from '../types'

// 관리자 사용자 목록/상세용 공통 매핑
function adminUserDto(u: UserRow) {
  return {
    id: u.id,
    username: u.username,
    nickname: u.nickname,
    email: u.email,
    studentId: u.student_id,
    department: u.department,
    grade: u.grade,
    gender: u.gender,
    status: u.status,
    isAdmin: u.is_admin,
    enrollmentDoc: u.enrollment_doc,
    createdAt: u.created_at,
  }
}

export const adminController = {
  // 전체 사용자 목록 (검색어 q: 아이디/닉네임/이메일/학번 부분일치)
  async listUsers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const q = String(req.query.q ?? '').trim().toLowerCase()
      const where = q
        ? `WHERE LOWER(username) LIKE $1 OR LOWER(nickname) LIKE $1
             OR LOWER(COALESCE(email,'')) LIKE $1 OR COALESCE(student_id,'') LIKE $1`
        : ''
      const params = q ? [`%${q}%`] : []
      const result = await query<UserRow>(
        `SELECT id, username, nickname, email, student_id, department, grade, gender,
                status, is_admin, enrollment_doc, created_at
         FROM users ${where} ORDER BY created_at DESC`,
        params,
      )
      return success(res, result.rows.map(adminUserDto))
    } catch (err) {
      next(err)
    }
  },

  // 사용자 학과/학번 수정 (학번 변경 시 학년 자동 재계산)
  async updateUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params
      const { department, studentId } = req.body as { department?: string; studentId?: string }

      const fields: string[] = []
      const values: unknown[] = []
      let i = 1

      if (typeof department === 'string' && department.trim()) {
        fields.push(`department = $${i++}`)
        values.push(department.trim())
      }

      if (typeof studentId === 'string') {
        const sid = studentId.trim() || null
        fields.push(`student_id = $${i++}`)
        values.push(sid)
        // 학번 앞 4자리(입학년도)로 학년(DB 호환용) 재계산
        const entry = entryYearOf(sid)
        if (entry) {
          const grade = Math.min(Math.max(new Date().getFullYear() - entry + 1, 1), 4)
          fields.push(`grade = $${i++}`)
          values.push(grade)
        }
      }

      if (fields.length === 0) return fail(res, '수정할 항목이 없습니다.')

      values.push(userId)
      const result = await query<UserRow>(
        `UPDATE users SET ${fields.join(', ')}, updated_at = NOW()
         WHERE id = $${i}
         RETURNING id, username, nickname, email, student_id, department, grade, gender,
                   status, is_admin, enrollment_doc, created_at`,
        values,
      )
      if (result.rows.length === 0) return fail(res, '사용자를 찾을 수 없습니다.', 404)
      return success(res, adminUserDto(result.rows[0]))
    } catch (err) {
      next(err)
    }
  },

  // 관리자 임의 사용자 삭제 (연관 데이터·S3 파일까지 완전 삭제)
  async deleteUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params
      if (userId === req.user!.userId) return fail(res, '본인 계정은 여기서 삭제할 수 없습니다.')
      // 관리자 계정은 삭제 불가
      const target = await query<{ is_admin: boolean }>('SELECT is_admin FROM users WHERE id = $1', [userId])
      if (target.rows.length === 0) return fail(res, '사용자를 찾을 수 없습니다.', 404)
      if (target.rows[0].is_admin) return fail(res, '관리자 계정은 삭제할 수 없습니다.')
      const ok = await purgeUser(userId)
      if (!ok) return fail(res, '사용자를 찾을 수 없습니다.', 404)
      return success(res, { deleted: true })
    } catch (err) {
      next(err)
    }
  },

  async listPending(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await query<UserRow>(
        `SELECT id, username, nickname, student_id, department, grade, gender, enrollment_doc, created_at
         FROM users WHERE status = 'pending' ORDER BY created_at ASC`,
      )
      return success(res, result.rows.map((u) => ({
        id: u.id,
        username: u.username,
        nickname: u.nickname,
        studentId: u.student_id,
        department: u.department,
        grade: u.grade,
        gender: u.gender,
        enrollmentDoc: u.enrollment_doc,
        createdAt: u.created_at,
      })))
    } catch (err) {
      next(err)
    }
  },

  async approveUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params
      const found = await query<UserRow>(
        `SELECT email, nickname, enrollment_doc, status FROM users WHERE id = $1`,
        [userId],
      )
      const target = found.rows[0]
      if (!target || target.status !== 'pending') return fail(res, '해당 대기 유저를 찾을 수 없습니다.', 404)

      // 승인 처리 + 재학증명서 URL 비우기
      await query(
        `UPDATE users SET status = 'approved', enrollment_doc = NULL, updated_at = NOW() WHERE id = $1`,
        [userId],
      )
      // 재학증명서 S3 삭제 (확인 완료 → 보관 불필요)
      if (target.enrollment_doc) deleteFromS3(target.enrollment_doc).catch(() => {})
      // 승인 안내 메일 (실패해도 승인은 유지)
      if (target.email) {
        sendAccountResultEmail(target.email, target.nickname, true)
          .catch((e) => console.warn('[Mail] 승인 메일 발송 실패:', e?.message))
      }
      return success(res, { approved: true })
    } catch (err) {
      next(err)
    }
  },

  async rejectUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params
      const found = await query<UserRow>(
        `SELECT email, nickname, enrollment_doc, status FROM users WHERE id = $1`,
        [userId],
      )
      const target = found.rows[0]
      if (!target || target.status !== 'pending') return fail(res, '해당 대기 유저를 찾을 수 없습니다.', 404)

      // 거절 안내 메일 (DB 삭제 전에 이메일 확보)
      if (target.email) {
        sendAccountResultEmail(target.email, target.nickname, false)
          .catch((e) => console.warn('[Mail] 거절 메일 발송 실패:', e?.message))
      }
      // 재학증명서 S3 삭제
      if (target.enrollment_doc) deleteFromS3(target.enrollment_doc).catch(() => {})
      // 거절 시 DB 레코드 삭제 (관련 데이터 CASCADE) → 동일 이메일/아이디로 재가입 가능
      await query(`DELETE FROM users WHERE id = $1`, [userId])
      return success(res, { rejected: true })
    } catch (err) {
      next(err)
    }
  },

  async listInquiries(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await query(
        `SELECT s.id, s.category, s.title, s.content, s.status, s.answer, s.answered_at, s.created_at,
                u.username, u.nickname
         FROM support_inquiries s
         JOIN users u ON u.id = s.user_id
         ORDER BY s.created_at DESC`,
      )
      return success(res, result.rows)
    } catch (err) {
      next(err)
    }
  },

  async answerInquiry(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const { answer } = req.body
      if (!answer?.trim()) return fail(res, '답변 내용을 입력해주세요.')

      const result = await query(
        `UPDATE support_inquiries
         SET answer = $1, status = 'answered', answered_at = NOW()
         WHERE id = $2
         RETURNING id, status`,
        [answer.trim(), id],
      )
      if (result.rows.length === 0) return fail(res, '문의를 찾을 수 없습니다.', 404)
      return success(res, result.rows[0])
    } catch (err) {
      next(err)
    }
  },
}

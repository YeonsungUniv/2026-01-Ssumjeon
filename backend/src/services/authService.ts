import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import nodemailer from 'nodemailer'
import { query } from '../config/db'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt'
import { env } from '../config/env'
import type { UserRow } from '../types'

const SCHOOL_DOMAIN = '@yeonsung.ac.kr'

function createTransport() {
  return nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: false,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
  })
}

async function sendVerificationEmail(to: string, code: string) {
  const target = env.devEmailOverride || to
  const transporter = createTransport()
  await transporter.sendMail({
    from: `"썸전" <${env.smtp.user}>`,
    to: target,
    subject: '[썸전] 이메일 인증 코드',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;border:1px solid #eee;border-radius:12px;">
        <h2 style="color:#ff2d6f;margin-bottom:8px;">썸전 이메일 인증</h2>
        <p style="color:#555;margin-bottom:24px;">아래 인증 코드를 입력해주세요. 코드는 <strong>10분</strong> 동안 유효합니다.</p>
        <div style="background:#fff0f3;border-radius:8px;padding:20px;text-align:center;">
          <span style="font-size:36px;font-weight:900;letter-spacing:12px;color:#ff2d6f;">${code}</span>
        </div>
        <p style="color:#aaa;font-size:12px;margin-top:24px;">본인이 요청하지 않은 경우 이 메일을 무시해주세요.</p>
      </div>
    `,
  })
}

function toUserDto(row: UserRow) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    nickname: row.nickname,
    studentId: row.student_id,
    department: row.department,
    grade: row.grade,
    gender: row.gender,
    profileImage: row.profile_image,
    bio: row.bio,
    mbti: row.mbti,
    interests: row.interests,
    status: row.status,
    isAdmin: row.is_admin,
    createdAt: row.created_at.toISOString(),
  }
}

async function generateUniqueNickname(): Promise<string> {
  while (true) {
    const candidate = '익명' + Math.floor(1000 + Math.random() * 9000)
    const check = await query('SELECT id FROM users WHERE nickname = $1', [candidate])
    if (check.rows.length === 0) return candidate
  }
}

// 같은 이메일에 직전 발송 후 60초 이내 재발송 차단 (메일 스팸 방지)
async function assertSendCooldown(email: string) {
  const recent = await query<{ created_at: Date }>(
    `SELECT created_at FROM email_verification_codes
     WHERE email = $1 AND created_at > NOW() - INTERVAL '60 seconds'
     ORDER BY created_at DESC LIMIT 1`,
    [email],
  )
  if (recent.rows.length > 0) {
    const elapsed = (Date.now() - recent.rows[0].created_at.getTime()) / 1000
    const wait = Math.max(1, Math.ceil(60 - elapsed))
    throw new Error(`잠시 후 다시 시도해주세요. (${wait}초)`)
  }
}

// 인증 코드를 검증하고 사용 처리(소비)
async function consumeVerificationCode(email: string, code: string) {
  const result = await query<{ id: string }>(
    `SELECT id FROM email_verification_codes
     WHERE email = $1 AND code = $2 AND verified = false AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [email, code],
  )
  if (result.rows.length === 0) throw new Error('인증 코드가 올바르지 않거나 만료되었습니다.')
  await query('UPDATE email_verification_codes SET verified = true WHERE id = $1', [result.rows[0].id])
}

export const authService = {
  // 인증 코드 발송
  async sendEmailCode(email: string) {
    if (!email.endsWith(SCHOOL_DOMAIN))
      throw new Error(`연성대학교 이메일(${SCHOOL_DOMAIN})만 사용 가능합니다.`)

    const dup = await query('SELECT id FROM users WHERE email = $1', [email])
    if (dup.rows.length > 0) throw new Error('이미 가입된 이메일입니다.')

    await assertSendCooldown(email)

    const code = String(Math.floor(100000 + Math.random() * 900000))
    await query(
      `INSERT INTO email_verification_codes (id, email, code, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes')`,
      [uuidv4(), email, code],
    )

    await sendVerificationEmail(email, code)
    return { sent: true }
  },

  // 인증 코드 확인
  async verifyEmailCode(email: string, code: string) {
    const result = await query<{ id: string }>(
      `SELECT id FROM email_verification_codes
       WHERE email = $1 AND code = $2 AND verified = false AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email, code],
    )
    if (result.rows.length === 0) throw new Error('인증 코드가 올바르지 않거나 만료되었습니다.')

    await query('UPDATE email_verification_codes SET verified = true WHERE id = $1', [result.rows[0].id])
    return { verified: true }
  },

  // 계정 복구용 코드 발송 (가입된 이메일에만)
  async sendRecoveryCode(email: string) {
    if (!email.endsWith(SCHOOL_DOMAIN))
      throw new Error(`연성대학교 이메일(${SCHOOL_DOMAIN})만 사용 가능합니다.`)

    const exist = await query('SELECT id FROM users WHERE LOWER(email) = $1', [email])
    if (exist.rows.length === 0) throw new Error('해당 이메일로 가입된 계정이 없습니다.')

    await assertSendCooldown(email)

    const code = String(Math.floor(100000 + Math.random() * 900000))
    await query(
      `INSERT INTO email_verification_codes (id, email, code, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes')`,
      [uuidv4(), email, code],
    )
    await sendVerificationEmail(email, code)
    return { sent: true }
  },

  // 코드 인증 후 아이디 반환
  async findUsername(email: string, code: string) {
    await consumeVerificationCode(email, code)
    const result = await query<{ username: string }>('SELECT username FROM users WHERE LOWER(email) = $1', [email])
    if (result.rows.length === 0) throw new Error('가입된 계정이 없습니다.')
    return { username: result.rows[0].username }
  },

  // 코드 인증 후 비밀번호 재설정
  async resetPassword(email: string, code: string, newPassword: string) {
    if (!newPassword || newPassword.length < 8) throw new Error('비밀번호는 8자 이상이어야 합니다.')
    await consumeVerificationCode(email, code)
    const passwordHash = await bcrypt.hash(newPassword, 12)
    const result = await query('UPDATE users SET password_hash = $1 WHERE LOWER(email) = $2 RETURNING id', [passwordHash, email])
    if ((result.rowCount ?? 0) === 0) throw new Error('가입된 계정이 없습니다.')
    return { reset: true }
  },

  async register(payload: {
    username: string
    password: string
    nickname?: string
    gender: 'male' | 'female'
    department: string
    email: string
    enrollmentDoc: string
  }) {
    if (!payload.username || payload.username.trim().length === 0) throw new Error('아이디를 입력해주세요.')
    if (!/^[a-zA-Z0-9_]{4,20}$/.test(payload.username)) throw new Error('아이디는 4~20자의 영문, 숫자, 밑줄(_)만 사용 가능합니다.')
    if (!payload.enrollmentDoc) throw new Error('재학증명서를 업로드해주세요.')

    // 이메일 인증 완료 여부 확인 (10분 내 verified된 코드)
    const verified = await query(
      `SELECT id FROM email_verification_codes
       WHERE email = $1 AND verified = true AND expires_at > NOW() - INTERVAL '1 hour'
       ORDER BY created_at DESC LIMIT 1`,
      [payload.email],
    )
    if (verified.rows.length === 0) throw new Error('이메일 인증을 먼저 완료해주세요.')

    const usernameCheck = await query('SELECT id FROM users WHERE username = $1', [payload.username])
    if (usernameCheck.rows.length > 0) throw new Error('이미 사용중인 아이디입니다.')

    const emailCheck = await query('SELECT id FROM users WHERE email = $1', [payload.email])
    if (emailCheck.rows.length > 0) throw new Error('이미 가입된 이메일입니다.')

    let nickname = payload.nickname?.trim() || ''
    if (nickname) {
      if (nickname.length > 7) throw new Error('닉네임은 7자 이하로 입력해주세요.')
      if (/[\s!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(nickname)) throw new Error('공백과 특수문자는 사용할 수 없습니다.')
      const nicknameCheck = await query('SELECT id FROM users WHERE nickname = $1', [nickname])
      if (nicknameCheck.rows.length > 0) throw new Error('이미 사용 중인 닉네임입니다.')
    } else {
      nickname = await generateUniqueNickname()
    }

    // 학번 = 학교 이메일 아이디. 학번에서 입학년도→학년(DB 호환용)을 도출
    const studentId = (payload.email.split('@')[0] ?? '').trim()
    const entryYear = /^\d{4}/.test(studentId) ? parseInt(studentId.slice(0, 4), 10) : NaN
    const grade = Number.isFinite(entryYear)
      ? Math.min(Math.max(new Date().getFullYear() - entryYear + 1, 1), 4)
      : 1

    const passwordHash = await bcrypt.hash(payload.password, 12)
    const id = uuidv4()

    // 재학증명서 제출 → 관리자 승인 대기(pending) 상태로 가입
    const result = await query<UserRow>(
      `INSERT INTO users (id, username, email, password_hash, nickname, student_id, gender, department, grade, interests, enrollment_doc, status, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', true)
       RETURNING *`,
      [id, payload.username, payload.email, passwordHash, nickname, studentId, payload.gender, payload.department, grade, [], payload.enrollmentDoc],
    )

    return { user: toUserDto(result.rows[0]) }
  },

  async login(username: string, password: string) {
    const result = await query<UserRow>(
      'SELECT * FROM users WHERE username = $1 OR (username IS NULL AND email = $1)',
      [username],
    )
    const user = result.rows[0]
    if (!user) throw new Error('존재하지 않는 계정입니다.')

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) throw new Error('비밀번호가 틀렸습니다.')

    if (user.status === 'rejected') throw new Error('가입이 거절되었습니다. 관리자에게 문의하세요.')

    const jwtPayload = { userId: user.id, username: user.username, isAdmin: user.is_admin }
    const accessToken = signAccessToken(jwtPayload)
    const refreshToken = signRefreshToken({ ...jwtPayload, jti: uuidv4() })

    await query(
      'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL \'7 days\')',
      [uuidv4(), user.id, refreshToken],
    )

    return { user: toUserDto(user), accessToken, refreshToken }
  },

  async refresh(token: string) {
    const payload = verifyRefreshToken(token)
    const stored = await query('SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()', [token])
    if (stored.rows.length === 0) throw new Error('유효하지 않은 리프레시 토큰입니다.')

    const userResult = await query<UserRow>('SELECT * FROM users WHERE id = $1', [payload.userId])
    const user = userResult.rows[0]
    if (!user) throw new Error('사용자를 찾을 수 없습니다.')

    const accessToken = signAccessToken({ userId: user.id, username: user.username, isAdmin: user.is_admin })
    return { accessToken }
  },

  async logout(token: string) {
    await query('DELETE FROM refresh_tokens WHERE token = $1', [token])
  },
}

import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { query } from '../config/db'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt'
import type { UserRow } from '../types'

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

export const authService = {
  async register(payload: {
    username: string
    password: string
    nickname?: string
    gender: 'male' | 'female'
    department: string
    grade: number
    enrollmentDocPath: string | null
  }) {
    if (!payload.username || payload.username.trim().length === 0) throw new Error('아이디를 입력해주세요.')
    if (!/^[a-zA-Z0-9_]{4,20}$/.test(payload.username)) throw new Error('아이디는 4~20자의 영문, 숫자, 밑줄(_)만 사용 가능합니다.')

    const usernameCheck = await query('SELECT id FROM users WHERE username = $1', [payload.username])
    if (usernameCheck.rows.length > 0) throw new Error('이미 사용중인 아이디입니다.')

    let nickname = payload.nickname?.trim() || ''
    if (nickname) {
      if (nickname.length > 7) throw new Error('닉네임은 7자 이하로 입력해주세요.')
      if (/[\s!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(nickname)) throw new Error('공백과 특수문자는 사용할 수 없습니다.')
      const nicknameCheck = await query('SELECT id FROM users WHERE nickname = $1', [nickname])
      if (nicknameCheck.rows.length > 0) throw new Error('이미 사용 중인 닉네임입니다.')
    } else {
      nickname = await generateUniqueNickname()
    }

    const passwordHash = await bcrypt.hash(payload.password, 12)
    const id = uuidv4()

    const result = await query<UserRow>(
      `INSERT INTO users (id, username, password_hash, nickname, gender, department, grade, interests, status, is_verified, enrollment_doc)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'approved', true, $9)
       RETURNING *`,
      [id, payload.username, passwordHash, nickname, payload.gender, payload.department, payload.grade, [], payload.enrollmentDocPath],
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

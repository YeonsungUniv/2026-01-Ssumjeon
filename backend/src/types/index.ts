import type { Request } from 'express'

// ── JWT Payload ──────────────────────────────────────────────────
export interface JwtPayload {
  userId: string
  username: string
  isAdmin?: boolean
  jti?: string
}

// ── Authenticated Request ────────────────────────────────────────
export interface AuthRequest extends Request {
  user?: JwtPayload
}

// ── DB Row Base (pg QueryResultRow 호환) ─────────────────────────
interface RowBase {
  [column: string]: unknown
}

// ── DB Row Types ─────────────────────────────────────────────────
export interface UserRow extends RowBase {
  id: string
  username: string
  email: string | null
  password_hash: string
  nickname: string
  student_id: string
  department: string
  grade: number
  gender: 'male' | 'female'
  profile_image: string | null
  bio: string | null
  mbti: string | null
  interests: string[]
  is_verified: boolean
  status: 'pending' | 'approved' | 'rejected'
  enrollment_doc: string | null
  is_admin: boolean
  created_at: Date
  updated_at: Date
}

export interface MatchRow extends RowBase {
  id: string
  user1_id: string
  user2_id: string
  status: 'pending' | 'matched'
  created_at: Date
}

export interface SwipeRow extends RowBase {
  id: string
  swiper_id: string
  target_id: string
  action: 'like' | 'pass'
  created_at: Date
}

export interface GroupRoomRow extends RowBase {
  id: string
  title: string
  description: string | null
  leader_id: string
  gender: 'male' | 'female'
  max_members: number
  preferred_gender: 'male' | 'female'
  status: 'waiting' | 'matched' | 'closed'
  room_password: string | null
  allowed_gender: 'male' | 'female' | null
  invite_code: string | null
  created_at: Date
}

export interface ChatRoomRow extends RowBase {
  id: string
  type: 'individual' | 'group'
  group_room_id: string | null
  created_at: Date
}

export interface MessageRow extends RowBase {
  id: string
  room_id: string
  sender_id: string
  content: string
  is_read: boolean
  created_at: Date
}

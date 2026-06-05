// ── 사용자 ──────────────────────────────────────────────────────────
export interface User {
  id: string
  username: string
  email?: string | null
  nickname: string
  studentId: string
  department: string
  grade: number
  gender: 'male' | 'female'
  profileImage?: string
  bio?: string
  mbti?: string
  interests: string[]
  status: 'pending' | 'approved' | 'rejected'
  isAdmin: boolean
  createdAt: string
}

// ── 매칭 ──────────────────────────────────────────────────────────
export interface MatchCard {
  userId: string
  nickname: string
  department: string
  grade: number
  gender: 'male' | 'female'
  profileImage?: string
  bio?: string
  mbti?: string
  interests: string[]
  distance?: number
}

export type MatchAction = 'like' | 'pass'

export interface MatchResult {
  matched: boolean
  matchId?: string
}

// ── 과팅 (그룹 매칭) ────────────────────────────────────────────────
export interface GroupMatchingRoom {
  id: string
  title: string
  department: string
  memberCount: number
  maxMembers: number
  gender: 'male' | 'female'
  description?: string
  members: GroupMember[]
  status: 'waiting' | 'matched' | 'closed'
  chatRoomId: string | null
  inviteCode: string | null
  isPrivate: boolean
  allowedGender: 'male' | 'female' | null
  createdAt: string
}

export interface GroupMember {
  userId: string
  nickname: string
  department: string
  grade: number
  profileImage?: string
  isLeader: boolean
}

// ── 채팅 ──────────────────────────────────────────────────────────
export interface ChatRoom {
  id: string
  type: 'individual' | 'group'
  partner?: User
  groupName?: string
  lastMessage?: string
  lastMessageAt?: string
  unreadCount: number
  isBlocked?: boolean
}

export interface ChatMessage {
  id: string
  roomId: string
  senderId: string
  senderNickname: string
  senderProfileImage?: string
  content: string
  createdAt: string
  isRead: boolean
}

// ── 약속 ──────────────────────────────────────────────────────────
export interface Appointment {
  id: string
  roomId: string
  proposerId: string
  proposerNickname: string
  date: string
  time: string
  location: string
  status: 'pending' | 'confirmed' | 'cancelled'
  createdAt: string
}

// ── 채팅 신청 (둘러보기 매칭) ─────────────────────────────────────
export interface BrowseUser {
  userId: string
  nickname: string
  department: string
  grade: number
  gender: 'male' | 'female'
  profileImage?: string
  bio?: string
  mbti?: string
  interests: string[]
  outgoingRequestId: string | null
  outgoingRequestStatus: 'pending' | 'accepted' | 'rejected' | null
  incomingRequestId: string | null
}

export interface IncomingRequest {
  requestId: string
  requestCreatedAt: string
  userId: string
  nickname: string
  department: string
  grade: number
  gender: 'male' | 'female'
  profileImage?: string
  bio?: string
  mbti?: string
  interests: string[]
}

export interface OutgoingRequest {
  requestId: string
  status: 'pending' | 'accepted' | 'rejected'
  requestCreatedAt: string
  userId: string
  nickname: string
  department: string
  grade: number
  gender: 'male' | 'female'
  profileImage?: string
}

// ── 공통 ──────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

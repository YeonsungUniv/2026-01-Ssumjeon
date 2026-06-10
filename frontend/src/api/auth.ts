import client from './client'
import type { User, ApiResponse } from '@/types'

export interface LoginPayload {
  username: string
  password: string
}

export interface RegisterPayload {
  username: string
  password: string
  nickname?: string
  gender: 'male' | 'female'
  department: string
  email: string
}

export interface AuthTokens {
  accessToken: string
  user: User
}

export interface PendingUser {
  id: string
  username: string
  nickname: string
  studentId: string
  department: string
  grade: number
  gender: 'male' | 'female'
  enrollmentDoc: string | null
  createdAt: string
}

export const authApi = {
  login: (payload: LoginPayload) =>
    client.post<ApiResponse<AuthTokens>>('/auth/login', payload),

  register: (payload: RegisterPayload) =>
    client.post<ApiResponse<{ user: User }>>('/auth/register', payload),

  sendEmailCode: (email: string) =>
    client.post<ApiResponse<{ sent: boolean }>>('/auth/send-email-code', { email }),

  verifyEmailCode: (email: string, code: string) =>
    client.post<ApiResponse<{ verified: boolean }>>('/auth/verify-email-code', { email, code }),

  sendRecoveryCode: (email: string) =>
    client.post<ApiResponse<{ sent: boolean }>>('/auth/send-recovery-code', { email }),

  findUsername: (email: string, code: string) =>
    client.post<ApiResponse<{ username: string }>>('/auth/find-username', { email, code }),

  resetPassword: (email: string, code: string, newPassword: string) =>
    client.post<ApiResponse<{ reset: boolean }>>('/auth/reset-password', { email, code, newPassword }),

  checkUsername: (username: string) =>
    client.get<{ success: boolean; data: { available: boolean } }>(`/auth/check-username/${encodeURIComponent(username)}`),

  logout: () =>
    client.post('/auth/logout', {}, { withCredentials: true }),

  refresh: () =>
    client.post<ApiResponse<{ accessToken: string }>>('/auth/refresh', {}, { withCredentials: true }),
}

export const adminApi = {
  listPending: () =>
    client.get<ApiResponse<PendingUser[]>>('/admin/pending'),

  approveUser: (userId: string) =>
    client.patch<ApiResponse<{ approved: boolean }>>(`/admin/users/${userId}/approve`),

  rejectUser: (userId: string) =>
    client.patch<ApiResponse<{ rejected: boolean }>>(`/admin/users/${userId}/reject`),
}

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
  grade: number
  enrollmentDoc?: File
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

  register: (payload: RegisterPayload) => {
    const form = new FormData()
    form.append('username', payload.username)
    form.append('password', payload.password)
    if (payload.nickname) form.append('nickname', payload.nickname)
    form.append('gender', payload.gender)
    form.append('department', payload.department)
    form.append('grade', String(payload.grade))
    if (payload.enrollmentDoc) form.append('enrollmentDoc', payload.enrollmentDoc)
    return client.post<ApiResponse<{ user: User }>>('/auth/register', form)
  },

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

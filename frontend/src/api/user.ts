import client from './client'
import type { ApiResponse } from '@/types'

export interface UserProfile {
  id: string
  nickname: string
  department: string
  grade: number
  gender: 'male' | 'female'
  profileImage?: string
  bio?: string
  mbti?: string
  interests: string[]
}

export interface UserSearchResult {
  id: string
  nickname: string
  department: string
  grade: number
  gender: 'male' | 'female'
  profileImage?: string
}

export const userApi = {
  getProfile: (userId: string) =>
    client.get<ApiResponse<UserProfile>>(`/users/${userId}`),

  searchUsers: (q: string) =>
    client.get<ApiResponse<UserSearchResult[]>>('/users/search', { q }),
}

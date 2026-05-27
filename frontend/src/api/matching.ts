import client from './client'
import type { ApiResponse, MatchCard, MatchResult } from '@/types'

export interface MatchFilters {
  departments?: string[]
  grades?: number[]
  gender?: 'male' | 'female'
}

export const matchingApi = {
  getCards: (filters?: MatchFilters) =>
    client.get<ApiResponse<MatchCard[]>>('/matching/cards', {
      params: {
        ...(filters?.departments?.length ? { departments: filters.departments.join(',') } : {}),
        ...(filters?.grades?.length ? { grades: filters.grades.join(',') } : {}),
        ...(filters?.gender ? { gender: filters.gender } : {}),
      },
    }),

  swipe: (targetId: string, action: 'like' | 'pass') =>
    client.post<ApiResponse<MatchResult>>('/matching/swipe', { targetId, action }),

  getMatches: () =>
    client.get<ApiResponse<MatchCard[]>>('/matching/matches'),

  getDepartments: () =>
    client.get<ApiResponse<string[]>>('/matching/departments'),
}

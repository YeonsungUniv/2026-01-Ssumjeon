import client from './client'
import type { ApiResponse, MatchCard, MatchResult } from '@/types'

export interface MatchFilters {
  departments?: string[]
  entryYears?: number[]
  gender?: 'male' | 'female'
}

export const matchingApi = {
  getCards: (filters?: MatchFilters) => {
    const params: Record<string, string> = {}
    if (filters?.departments?.length) params.departments = filters.departments.join(',')
    if (filters?.entryYears?.length) params.entryYears = filters.entryYears.join(',')
    if (filters?.gender) params.gender = filters.gender
    return client.get<ApiResponse<MatchCard[]>>('/matching/cards', params)
  },

  swipe: (targetId: string, action: 'like' | 'pass') =>
    client.post<ApiResponse<MatchResult>>('/matching/swipe', { targetId, action }),

  getMatches: () =>
    client.get<ApiResponse<MatchCard[]>>('/matching/matches'),

  getDepartments: () =>
    client.get<ApiResponse<string[]>>('/matching/departments'),
}

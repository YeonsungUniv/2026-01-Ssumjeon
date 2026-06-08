import client from './client'
import type { ApiResponse, PaginatedResponse, BrowseUser, IncomingRequest, OutgoingRequest } from '@/types'

export interface BrowseFilters {
  departments?: string[]
  grades?: number[]
  gender?: 'male' | 'female'
  page?: number
  limit?: number
}

export const chatRequestApi = {
  browse: (filters?: BrowseFilters) => {
    const params: Record<string, string> = {}
    if (filters?.departments?.length) params.departments = filters.departments.join(',')
    if (filters?.grades?.length) params.grades = filters.grades.join(',')
    if (filters?.gender) params.gender = filters.gender
    if (filters?.page) params.page = String(filters.page)
    if (filters?.limit) params.limit = String(filters.limit)
    return client.get<ApiResponse<PaginatedResponse<BrowseUser>>>('/chat-requests/browse', params)
  },

  sendRequest: (receiverId: string) =>
    client.post<ApiResponse<{ requestId: string }>>('/chat-requests', { receiverId }),

  getIncoming: () =>
    client.get<ApiResponse<IncomingRequest[]>>('/chat-requests/incoming'),

  getOutgoing: () =>
    client.get<ApiResponse<OutgoingRequest[]>>('/chat-requests/outgoing'),

  getPendingCount: () =>
    client.get<ApiResponse<{ count: number }>>('/chat-requests/pending-count'),

  respond: (requestId: string, action: 'accepted' | 'rejected') =>
    client.patch<ApiResponse<{ chatRoomId?: string }>>(`/chat-requests/${requestId}/respond`, { action }),

  cancel: (requestId: string) =>
    client.delete<ApiResponse<null>>(`/chat-requests/${requestId}`),

  deleteSent: (requestId: string) =>
    client.delete<ApiResponse<null>>(`/chat-requests/${requestId}/sent`),
}

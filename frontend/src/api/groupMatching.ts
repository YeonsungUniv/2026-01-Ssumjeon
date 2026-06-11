import client from './client'
import type { ApiResponse, GroupMatchingRoom } from '@/types'

export interface CreateRoomPayload {
  title: string
  description?: string
  maxMembers: number
  preferredGender?: 'male' | 'female'
  isPrivate?: boolean
  allowedGender?: 'male' | 'female'
}

export interface GroupMatchRequests {
  incoming: { requestId: string; room: GroupMatchingRoom }[]
  outgoing: { requestId: string; toRoomId: string; room: GroupMatchingRoom | null }[]
}

export const groupMatchingApi = {
  getRooms: (gender?: 'male' | 'female') =>
    client.get<ApiResponse<GroupMatchingRoom[]>>('/group-matching/rooms', gender ? { gender } : undefined),

  createRoom: (payload: CreateRoomPayload) =>
    client.post<ApiResponse<GroupMatchingRoom>>('/group-matching/rooms', payload),

  joinRoom: (roomId: string) =>
    client.post<ApiResponse<GroupMatchingRoom>>(`/group-matching/rooms/${roomId}/join`),

  leaveRoom: (roomId: string) =>
    client.post(`/group-matching/rooms/${roomId}/leave`),

  getMyRoom: () =>
    client.get<ApiResponse<GroupMatchingRoom | null>>('/group-matching/my-room'),

  requestMatch: (myRoomId: string, targetRoomId: string) =>
    client.post<ApiResponse<{ requested: boolean }>>(
      `/group-matching/rooms/${myRoomId}/match`,
      { targetRoomId },
    ),

  getMatchRequests: () =>
    client.get<ApiResponse<GroupMatchRequests>>('/group-matching/match-requests'),

  respondMatch: (requestId: string, accept: boolean) =>
    client.post<ApiResponse<{ accepted: boolean; chatRoomId?: string }>>(
      `/group-matching/match-requests/${requestId}/respond`,
      { accept },
    ),

  cancelMatchRequest: (requestId: string) =>
    client.delete<ApiResponse<{ cancelled: boolean }>>(`/group-matching/match-requests/${requestId}`),

  disbandRoom: (roomId: string) =>
    client.delete(`/group-matching/rooms/${roomId}`),

  cancelMatch: (roomId: string) =>
    client.delete<ApiResponse<{ cancelled: boolean }>>(`/group-matching/rooms/${roomId}/match`),

  inviteUser: (roomId: string, targetUserId: string) =>
    client.post(`/group-matching/rooms/${roomId}/invite`, { targetUserId }),

  joinByCode: (code: string) =>
    client.post<ApiResponse<GroupMatchingRoom>>('/group-matching/rooms/join-by-code', { code }),
}

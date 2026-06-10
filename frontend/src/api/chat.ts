import client from './client'
import type { ApiResponse, ChatRoom, ChatMessage, PaginatedResponse } from '@/types'

export const chatApi = {
  getRooms: () =>
    client.get<ApiResponse<ChatRoom[]>>('/chat/rooms'),

  getMessages: (roomId: string, page = 1, limit = 30) =>
    client.get<ApiResponse<PaginatedResponse<ChatMessage>>>(`/chat/rooms/${roomId}/messages`, { page, limit }),

  sendMessage: (roomId: string, content: string) =>
    client.post<ApiResponse<ChatMessage>>(`/chat/rooms/${roomId}/messages`, { content }),

  sendImage: (roomId: string, file: File) => {
    const form = new FormData()
    form.append('image', file)
    return client.post<ApiResponse<ChatMessage>>(`/chat/rooms/${roomId}/image`, form)
  },

  markAsRead: (roomId: string) =>
    client.patch(`/chat/rooms/${roomId}/read`),

  leaveRoom: (roomId: string) =>
    client.delete(`/chat/rooms/${roomId}/leave`),

  blockUser: (userId: string) =>
    client.post(`/chat/block/${userId}`),

  unblockUser: (userId: string) =>
    client.delete(`/chat/block/${userId}`),

  getBlockedUsers: () =>
    client.get<ApiResponse<{ id: string; nickname: string }[]>>('/chat/blocked'),

  getRoomInfo: (roomId: string) =>
    client.get<ApiResponse<RoomInfo>>(`/chat/rooms/${roomId}/info`),

  updateRoomName: (roomId: string, name: string) =>
    client.patch<ApiResponse<{ name: string }>>(`/chat/rooms/${roomId}/name`, { name }),
}

export interface RoomMember {
  userId: string
  nickname: string
  department: string
  grade: number
  studentId?: string
  profileImage?: string
  isLeader: boolean
}

export interface RoomInfo {
  type: 'individual' | 'group'
  partner?: { userId: string; nickname: string; department: string; grade: number; studentId?: string; profileImage?: string; bio?: string; mbti?: string; interests: string[] }
  groupRoomId?: string
  name?: string
  isLeader?: boolean
  members?: RoomMember[]
}

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ChatRoom, ChatMessage } from '@/types'

interface ChatState {
  rooms: ChatRoom[]
  messages: Record<string, ChatMessage[]>
  activeRoomId: string | null
  mutedRooms: Record<string, boolean>
  setRooms: (rooms: ChatRoom[]) => void
  removeRoom: (roomId: string) => void
  setActiveRoom: (roomId: string | null) => void
  toggleMute: (roomId: string) => void
  updateRoomName: (roomId: string, name: string) => void
  appendMessage: (roomId: string, message: ChatMessage) => void
  replaceMessage: (roomId: string, tempId: string, message: ChatMessage) => void
  removeMessage: (roomId: string, messageId: string) => void
  setMessages: (roomId: string, messages: ChatMessage[]) => void
  prependMessages: (roomId: string, messages: ChatMessage[]) => void
  markRoomAsRead: (roomId: string) => void
  markRoomMessagesRead: (roomId: string, byUserId: string) => void
  updateRoomFromMessage: (message: ChatMessage) => void
  markRoomAsBlocked: (roomId: string) => void
  markRoomAsUnblocked: (roomId: string) => void
  markRoomPartnerLeft: (roomId: string) => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
  rooms: [],
  messages: {},
  activeRoomId: null,
  mutedRooms: {},

  setRooms: (rooms) => set({ rooms }),

  removeRoom: (roomId) =>
    set((state) => ({ rooms: state.rooms.filter((r) => r.id !== roomId) })),

  setActiveRoom: (roomId) => set({ activeRoomId: roomId }),

  toggleMute: (roomId) =>
    set((state) => ({
      mutedRooms: { ...state.mutedRooms, [roomId]: !state.mutedRooms[roomId] },
    })),

  updateRoomName: (roomId, name) =>
    set((state) => ({
      rooms: state.rooms.map((r) => r.id === roomId ? { ...r, groupName: name } : r),
    })),

  markRoomPartnerLeft: (roomId) =>
    set((state) => ({
      rooms: state.rooms.map((r) => r.id === roomId ? { ...r, partnerLeft: true } : r),
    })),

  appendMessage: (roomId, message) =>
    set((state) => {
      const existing = state.messages[roomId] ?? []
      if (existing.some((m) => m.id === message.id)) return state
      return {
        messages: {
          ...state.messages,
          [roomId]: [...existing, message],
        },
      }
    }),

  replaceMessage: (roomId, tempId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [roomId]: (state.messages[roomId] ?? []).map((m) =>
          m.id === tempId ? message : m,
        ),
      },
    })),

  removeMessage: (roomId, messageId) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [roomId]: (state.messages[roomId] ?? []).filter((m) => m.id !== messageId),
      },
    })),

  setMessages: (roomId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [roomId]: messages },
    })),

  prependMessages: (roomId, newMessages) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [roomId]: [...newMessages, ...(state.messages[roomId] ?? [])],
      },
    })),

  markRoomMessagesRead: (roomId, byUserId) =>
    set((state) => ({
      messages: {
        ...state.messages,
        // byUserId = 읽은 사람 → 읽은 사람이 보내지 않은 메시지(= 상대방 메시지)를 읽음 처리
        [roomId]: (state.messages[roomId] ?? []).map((m) =>
          m.senderId !== byUserId ? { ...m, isRead: true } : m,
        ),
      },
    })),

  markRoomAsRead: (roomId) =>
    set((state) => ({
      rooms: state.rooms.map((r) =>
        r.id === roomId ? { ...r, unreadCount: 0 } : r,
      ),
    })),

  markRoomAsBlocked: (roomId) =>
    set((state) => ({
      rooms: state.rooms.map((r) => r.id === roomId ? { ...r, isBlocked: true } : r),
    })),

  markRoomAsUnblocked: (roomId) =>
    set((state) => ({
      rooms: state.rooms.map((r) => r.id === roomId ? { ...r, isBlocked: false } : r),
    })),

  updateRoomFromMessage: (message) =>
    set((state) => {
      const isActiveRoom = get().activeRoomId === message.roomId
      const content = message.content
      const preview =
        content === '[expired_image]' ? '🗑️ 만료된 이미지'
        : (content.includes('amazonaws.com') || content.startsWith('blob:')) ? '📷 사진을 보냈습니다'
        : content
      return {
        rooms: state.rooms.map((r) =>
          r.id === message.roomId
            ? {
                ...r,
                lastMessage: preview,
                lastMessageAt: message.createdAt,
                unreadCount: isActiveRoom ? 0 : r.unreadCount + 1,
              }
            : r,
        ),
      }
    }),
}),
    {
      name: 'ssumjeon-chat',
      partialize: (state) => ({ mutedRooms: state.mutedRooms }),
    },
  ),
)

import { create } from 'zustand'

interface MatchRequestState {
  pendingIncomingCount: number
  acceptedNotification: { requestId: string; chatRoomId: string } | null
  setPendingIncomingCount: (n: number) => void
  incrementPending: () => void
  decrementPending: () => void
  setAcceptedNotification: (n: { requestId: string; chatRoomId: string } | null) => void
}

export const useMatchRequestStore = create<MatchRequestState>((set) => ({
  pendingIncomingCount: 0,
  acceptedNotification: null,
  setPendingIncomingCount: (n) => set({ pendingIncomingCount: n }),
  incrementPending: () => set((s) => ({ pendingIncomingCount: s.pendingIncomingCount + 1 })),
  decrementPending: () => set((s) => ({ pendingIncomingCount: Math.max(0, s.pendingIncomingCount - 1) })),
  setAcceptedNotification: (n) => set({ acceptedNotification: n }),
}))

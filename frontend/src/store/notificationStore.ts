import { create } from 'zustand'

export type NotiCat = 'match' | 'group' | 'inbox' | 'inquiry'

interface NotificationState {
  pendingUsers: number      // 가입 승인 대기 (관리자)
  pendingInquiries: number  // 미답변 건의 (관리자)
  groupIncoming: number     // 받은 과팅 신청
  seen: Record<NotiCat, number> // 카테고리별 '확인'한 시점의 카운트
  setAdminCounts: (pendingUsers: number, pendingInquiries: number) => void
  setGroupIncoming: (n: number) => void
  decPendingUsers: () => void
  decPendingInquiries: () => void
  markSeen: (cat: NotiCat, count: number) => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  pendingUsers: 0,
  pendingInquiries: 0,
  groupIncoming: 0,
  seen: { match: 0, group: 0, inbox: 0, inquiry: 0 },
  setAdminCounts: (pendingUsers, pendingInquiries) => set({ pendingUsers, pendingInquiries }),
  setGroupIncoming: (groupIncoming) => set({ groupIncoming }),
  decPendingUsers: () => set((s) => ({ pendingUsers: Math.max(0, s.pendingUsers - 1) })),
  decPendingInquiries: () => set((s) => ({ pendingInquiries: Math.max(0, s.pendingInquiries - 1) })),
  markSeen: (cat, count) => set((s) => ({ seen: { ...s.seen, [cat]: count } })),
}))

import { create } from 'zustand'

interface NotificationState {
  pendingUsers: number      // 가입 승인 대기 (관리자)
  pendingInquiries: number  // 미답변 건의 (관리자)
  groupIncoming: number     // 받은 과팅 신청
  setAdminCounts: (pendingUsers: number, pendingInquiries: number) => void
  setGroupIncoming: (n: number) => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  pendingUsers: 0,
  pendingInquiries: 0,
  groupIncoming: 0,
  setAdminCounts: (pendingUsers, pendingInquiries) => set({ pendingUsers, pendingInquiries }),
  setGroupIncoming: (groupIncoming) => set({ groupIncoming }),
}))

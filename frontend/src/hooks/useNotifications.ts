import { useChatStore } from '@/store/chatStore'
import { useMatchRequestStore } from '@/store/matchRequestStore'
import { useNotificationStore } from '@/store/notificationStore'
import { useAuthStore } from '@/store/authStore'

// 알림 개수 집계 — 카테고리별 '본 시점' 이후의 미확인 개수만 센다.
// (채팅은 메시지 읽음으로 자연 차감되므로 seen 미적용)
export function useNotifications() {
  const rooms = useChatStore((s) => s.rooms)
  const pendingIncomingCount = useMatchRequestStore((s) => s.pendingIncomingCount)
  const groupIncoming = useNotificationStore((s) => s.groupIncoming)
  const pendingUsers = useNotificationStore((s) => s.pendingUsers)
  const pendingInquiries = useNotificationStore((s) => s.pendingInquiries)
  const seen = useNotificationStore((s) => s.seen)
  const isAdmin = useAuthStore((s) => s.user?.isAdmin === true)

  const chat = rooms.reduce((a, r) => a + r.unreadCount, 0)
  const match = Math.max(0, pendingIncomingCount - seen.match)
  const group = Math.max(0, groupIncoming - seen.group)
  const inbox = isAdmin ? Math.max(0, pendingUsers - seen.inbox) : 0
  const inquiry = isAdmin ? Math.max(0, pendingInquiries - seen.inquiry) : 0
  const total = chat + match + group + inbox + inquiry

  return { chat, match, group, inbox, inquiry, total, isAdmin }
}

import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import TabBar, { MobileNav } from './TabBar'
import AuroraBackground from './AuroraBackground'
import NotificationBell from '@/components/NotificationBell'
import { useSocket } from '@/hooks/useSocket'
import { chatApi } from '@/api/chat'
import { groupMatchingApi } from '@/api/groupMatching'
import { adminApi } from '@/api/auth'
import { useChatStore } from '@/store/chatStore'
import { useAuthStore } from '@/store/authStore'
import { useNotificationStore } from '@/store/notificationStore'

const FULL_HEIGHT_ROUTES = /^\/chat/

export default function MainLayout() {
  useSocket()
  const { setRooms } = useChatStore()
  const { user } = useAuthStore()
  const { setAdminCounts, setGroupIncoming } = useNotificationStore()
  const { pathname } = useLocation()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === '1')

  const toggleSidebar = () => {
    setCollapsed((c) => {
      const next = !c
      localStorage.setItem('sidebar-collapsed', next ? '1' : '0')
      return next
    })
  }

  useEffect(() => {
    chatApi.getRooms().then((res) => setRooms(res.data))
  }, [setRooms])

  // 알림 카운트 주기적 갱신 (받은 과팅 신청 + 관리자: 가입대기/미답변 건의)
  useEffect(() => {
    const load = () => {
      groupMatchingApi.getMatchRequests().then((r) => setGroupIncoming(r.data.incoming.length)).catch(() => {})
      if (user?.isAdmin) {
        adminApi.getCounts().then((r) => setAdminCounts(r.data.pendingUsers, r.data.pendingInquiries)).catch(() => {})
      }
    }
    load()
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [user?.isAdmin, setAdminCounts, setGroupIncoming])

  const isFullHeight = FULL_HEIGHT_ROUTES.test(pathname)

  return (
    <div className="min-h-dvh">
      <AuroraBackground />
      <NotificationBell />
      <TabBar collapsed={collapsed} onToggle={toggleSidebar} />
      <MobileNav />
      {/* 데스크톱은 사이드바 폭만큼 좌측 여백, 모바일은 여백 없음(하단바만) */}
      <main className={`min-h-dvh transition-[margin] duration-200 ${collapsed ? 'md:ml-16' : 'md:ml-52'}`}>
        {isFullHeight ? (
          <Outlet />
        ) : (
          <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 pb-24 md:pb-6">
            <Outlet />
          </div>
        )}
      </main>
    </div>
  )
}

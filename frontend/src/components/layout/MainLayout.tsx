import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import TabBar from './TabBar'
import { useSocket } from '@/hooks/useSocket'
import { chatApi } from '@/api/chat'
import { useChatStore } from '@/store/chatStore'

export default function MainLayout() {
  useSocket()
  const { setRooms } = useChatStore()
  const { pathname } = useLocation()

  useEffect(() => {
    chatApi.getRooms().then((res) => setRooms(res.data))
  }, [setRooms])

  // 채팅방(개별 대화) 화면 — 풀스크린, 하단 탭 숨김
  const isChatRoom = /^\/chat\/[^/]+/.test(pathname)
  // 풀높이로 자체 스크롤을 가진 화면 (채팅 목록·채팅방)
  const isFullHeight = pathname === '/chat' || isChatRoom
  const showTab = !isChatRoom

  return (
    // 데스크탑에선 폰 너비 중앙 정렬, 모바일에선 풀폭 — 시중 매칭앱 느낌
    <div className="min-h-dvh bg-cream-200 flex justify-center">
      <div className="relative w-full max-w-[440px] h-dvh bg-cream flex flex-col overflow-hidden shadow-[0_0_40px_-12px_rgba(0,0,0,0.12)]">
        {isFullHeight ? (
          <main className="flex-1 min-h-0">
            <Outlet />
          </main>
        ) : (
          <main className="flex-1 overflow-y-auto">
            <div className="px-5 pt-5 pb-6">
              <Outlet />
            </div>
          </main>
        )}
        {showTab && <TabBar />}
      </div>
    </div>
  )
}

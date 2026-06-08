import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import TabBar from './TabBar'
import SeasonalBackground from '@/components/SeasonalBackground'
import { useSocket } from '@/hooks/useSocket'
import { chatApi } from '@/api/chat'
import { useChatStore } from '@/store/chatStore'

const FULL_HEIGHT_ROUTES = /^\/chat/

export default function MainLayout() {
  useSocket()
  const { setRooms } = useChatStore()
  const { pathname } = useLocation()

  useEffect(() => {
    chatApi.getRooms().then((res) => setRooms(res.data))
  }, [setRooms])

  const isFullHeight = FULL_HEIGHT_ROUTES.test(pathname)

  return (
    <div className="min-h-dvh bg-cream">
      {/* 계절 배경 연출 (채팅방 등 풀스크린에선 가려짐) */}
      {!isFullHeight && <SeasonalBackground />}
      <TabBar />
      <main className="relative z-10 ml-52 min-h-dvh">
        {isFullHeight ? (
          <Outlet />
        ) : (
          <div className="max-w-5xl mx-auto px-8 py-6">
            <Outlet />
          </div>
        )}
      </main>
    </div>
  )
}

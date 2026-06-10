import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import TabBar from './TabBar'
import { useSocket } from '@/hooks/useSocket'
import { chatApi } from '@/api/chat'
import { useChatStore } from '@/store/chatStore'

const FULL_HEIGHT_ROUTES = /^\/chat/

export default function MainLayout() {
  useSocket()
  const { setRooms } = useChatStore()
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

  const isFullHeight = FULL_HEIGHT_ROUTES.test(pathname)

  return (
    <div className="min-h-dvh bg-gray-50">
      <TabBar collapsed={collapsed} onToggle={toggleSidebar} />
      <main className={`min-h-dvh transition-[margin] duration-200 ${collapsed ? 'ml-16' : 'ml-52'}`}>
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

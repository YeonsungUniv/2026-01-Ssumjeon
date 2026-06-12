import { NavLink, useLocation } from 'react-router-dom'
import { useChatStore } from '@/store/chatStore'
import { useAuthStore } from '@/store/authStore'
import { useMatchRequestStore } from '@/store/matchRequestStore'
import { useNotificationStore } from '@/store/notificationStore'

type Tab = { to: string; label: string; icon: ({ className }: { className?: string }) => JSX.Element; badge?: 'chat' | 'request' | 'inbox' | 'inquiry' | 'admin' }

const baseTabs: Tab[] = [
  { to: '/',               label: '홈',    icon: HomeIcon },
  { to: '/matching',       label: '매칭',  icon: HeartIcon, badge: 'request' },
  { to: '/group-matching', label: '과팅',  icon: GroupIcon },
  { to: '/chat',           label: '채팅',  icon: ChatIcon, badge: 'chat' },
  { to: '/profile',        label: '나',    icon: PersonIcon },
]

const adminTabs: Tab[] = [
  { to: '/admin/users',  label: '사용자 관리', icon: UsersIcon },
  { to: '/admin/inbox',  label: '가입 수신함', icon: InboxIcon, badge: 'inbox' },
  { to: '/suggestions',  label: '건의사항',   icon: SuggestionIcon, badge: 'inquiry' },
]

export default function TabBar({ collapsed = false, onToggle }: { collapsed?: boolean; onToggle?: () => void }) {
  const { rooms } = useChatStore()
  const { user } = useAuthStore()
  const { pendingIncomingCount } = useMatchRequestStore()
  const { pendingUsers, pendingInquiries } = useNotificationStore()
  const totalUnread = rooms.reduce((acc, r) => acc + r.unreadCount, 0)
  const isAdmin = user?.isAdmin === true

  const badgeFor = (badge?: Tab['badge']) =>
    badge === 'chat' ? totalUnread
      : badge === 'request' ? pendingIncomingCount
      : badge === 'inbox' ? pendingUsers
      : badge === 'inquiry' ? pendingInquiries
      : badge === 'admin' ? pendingUsers + pendingInquiries
      : 0

  const renderTab = ({ to, label, icon: Icon, badge }: Tab) => {
    const badgeCount = badgeFor(badge)
    return (
      <NavLink
        key={to}
        to={to}
        end={to === '/'}
        title={collapsed ? label : undefined}
        className={({ isActive }) =>
          `flex items-center gap-3 rounded-2xl text-sm font-medium transition-colors ${
            collapsed ? 'w-11 h-11 justify-center' : 'px-4 py-3'
          } ${
            isActive
              ? 'bg-primary-50 text-primary-600'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
          }`
        }
      >
        <div className="relative shrink-0">
          <Icon className="w-5 h-5" />
          {badgeCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 text-[10px] font-bold text-white bg-primary-500 rounded-full flex items-center justify-center">
              {badgeCount > 99 ? '99+' : badgeCount}
            </span>
          )}
        </div>
        {!collapsed && label}
      </NavLink>
    )
  }

  return (
    <nav className={`hidden md:flex fixed left-0 top-0 h-full bg-white/60 backdrop-blur-xl border-r border-white/50 flex-col z-50 shadow-[0_8px_30px_rgba(120,90,200,0.08)] transition-[width] duration-200 ${collapsed ? 'w-16' : 'w-52'}`}>
      {/* 헤더 + 접기/펴기 토글 */}
      <div className={`flex items-center border-b border-gray-100 ${collapsed ? 'justify-center py-5' : 'justify-between px-6 py-6'}`}>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-2xl font-black text-primary-500 tracking-tight">썸전</h1>
            <p className="text-xs text-gray-400 mt-0.5 whitespace-nowrap">연성대학교 과팅 매칭</p>
          </div>
        )}
        <button
          onClick={onToggle}
          title={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
          className="w-8 h-8 shrink-0 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <svg className={`w-5 h-5 transition-transform ${collapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <div className={`flex-1 flex flex-col gap-1 py-4 overflow-y-auto ${collapsed ? 'px-2 items-center' : 'px-3'}`}>
        {baseTabs.map(renderTab)}

        {/* 관리바 (관리자 전용) */}
        {isAdmin && (
          <>
            <div className={`mt-3 mb-1 ${collapsed ? 'w-8 border-t border-gray-100' : 'px-4'}`}>
              {!collapsed && <p className="text-[11px] font-bold text-gray-300 tracking-wider uppercase">관리</p>}
            </div>
            {adminTabs.map(renderTab)}
          </>
        )}
      </div>
    </nav>
  )
}

// 모바일 하단 탭바 (md 미만에서만 노출)
export function MobileNav() {
  const { rooms } = useChatStore()
  const { user } = useAuthStore()
  const { pendingIncomingCount } = useMatchRequestStore()
  const { pendingUsers, pendingInquiries } = useNotificationStore()
  const { pathname } = useLocation()
  const totalUnread = rooms.reduce((acc, r) => acc + r.unreadCount, 0)
  const isAdmin = user?.isAdmin === true

  // 채팅방(입력창 있는 화면)에서는 하단바 숨김 — 입력창 가림 방지
  if (/^\/chat\/.+/.test(pathname)) return null

  const tabs: Tab[] = isAdmin
    ? [...baseTabs, { to: '/admin/users', label: '관리', icon: UsersIcon, badge: 'admin' }]
    : baseTabs

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-white/70 backdrop-blur-xl border-t border-white/50 shadow-[0_-4px_24px_rgba(120,90,200,0.10)] z-50 flex pb-[env(safe-area-inset-bottom)]">
      {tabs.map(({ to, label, icon: Icon, badge }) => {
        const badgeCount = badge === 'chat' ? totalUnread
          : badge === 'request' ? pendingIncomingCount
          : badge === 'inbox' ? pendingUsers
          : badge === 'inquiry' ? pendingInquiries
          : badge === 'admin' ? pendingUsers + pendingInquiries
          : 0
        return (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                isActive ? 'text-primary-600' : 'text-gray-400'
              }`
            }
          >
            <div className="relative">
              <Icon className="w-[22px] h-[22px]" />
              {badgeCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[15px] h-3.5 px-1 text-[9px] font-bold text-white bg-primary-500 rounded-full flex items-center justify-center">
                  {badgeCount > 99 ? '99+' : badgeCount}
                </span>
              )}
            </div>
            {label}
          </NavLink>
        )
      })}
    </nav>
  )
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  )
}

function GroupIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  )
}

function PersonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )
}

function InboxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  )
}

function SuggestionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  )
}

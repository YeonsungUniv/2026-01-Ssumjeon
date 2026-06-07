import { NavLink } from 'react-router-dom'
import { useChatStore } from '@/store/chatStore'
import { useAuthStore } from '@/store/authStore'
import { useMatchRequestStore } from '@/store/matchRequestStore'

type Tab = { to: string; label: string; icon: ({ className }: { className?: string }) => JSX.Element; badge?: 'chat' | 'request' }

const baseTabs: Tab[] = [
  { to: '/',               label: '홈',    icon: HomeIcon },
  { to: '/matching',       label: '매칭',  icon: HeartIcon, badge: 'request' },
  { to: '/group-matching', label: '과팅',  icon: GroupIcon },
  { to: '/chat',           label: '채팅',  icon: ChatIcon, badge: 'chat' },
  { to: '/profile',        label: '나',    icon: PersonIcon },
]

const adminTab: Tab = { to: '/suggestions', label: '건의사항', icon: SuggestionIcon }

export default function TabBar() {
  const { rooms } = useChatStore()
  const { user } = useAuthStore()
  const { pendingIncomingCount } = useMatchRequestStore()
  const totalUnread = rooms.reduce((acc, r) => acc + r.unreadCount, 0)

  const tabs = user?.isAdmin ? [...baseTabs, adminTab] : baseTabs

  return (
    <nav className="fixed left-0 top-0 h-full w-52 bg-white border-r border-gray-100 flex flex-col z-50 shadow-sm">
      <div className="px-6 py-6 border-b border-gray-100">
        <h1 className="text-2xl font-black text-primary-700 tracking-tight">
          썸전<span className="text-secondary-500">.</span>
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">연성대학교 과팅 매칭</p>
      </div>
      <div className="flex-1 flex flex-col gap-1 py-4 px-3">
        {tabs.map(({ to, label, icon: Icon, badge }) => {
          const badgeCount = badge === 'chat' ? totalUnread : badge === 'request' ? pendingIncomingCount : 0
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-colors ${
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
              {label}
            </NavLink>
          )
        })}
      </div>
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

function SuggestionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  )
}

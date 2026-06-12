import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChatStore } from '@/store/chatStore'
import { useMatchRequestStore } from '@/store/matchRequestStore'
import { useNotificationStore } from '@/store/notificationStore'
import { useAuthStore } from '@/store/authStore'

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { rooms } = useChatStore()
  const { pendingIncomingCount } = useMatchRequestStore()
  const { groupIncoming, pendingUsers, pendingInquiries } = useNotificationStore()
  const isAdmin = useAuthStore((s) => s.user?.isAdmin === true)

  const totalUnread = rooms.reduce((a, r) => a + r.unreadCount, 0)

  const items = [
    { key: 'chat', n: totalUnread, label: '읽지 않은 메시지', icon: '💬', to: '/chat' },
    { key: 'match', n: pendingIncomingCount, label: '받은 채팅 신청', icon: '💗', to: '/matching' },
    { key: 'group', n: groupIncoming, label: '받은 과팅 신청', icon: '🎉', to: '/group-matching' },
    ...(isAdmin
      ? [
          { key: 'inbox', n: pendingUsers, label: '가입 승인 대기', icon: '📨', to: '/admin/inbox' },
          { key: 'inquiry', n: pendingInquiries, label: '새 건의사항', icon: '📝', to: '/suggestions' },
        ]
      : []),
  ]
  const total = items.reduce((a, i) => a + i.n, 0)
  const active = items.filter((i) => i.n > 0)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const go = (to: string) => { setOpen(false); navigate(to) }

  return (
    <div ref={ref} className="fixed top-3 right-3 z-[60]">
      <button
        onClick={() => setOpen((o) => !o)}
        title="알림"
        className="relative w-11 h-11 rounded-full bg-white/70 backdrop-blur-xl border border-white/60 shadow-[0_6px_20px_rgba(120,90,200,0.15)] flex items-center justify-center hover:bg-white transition-colors"
      >
        <BellIcon className="w-5 h-5 text-gray-600" />
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-gradient-to-br from-rose-500 to-pink-500 rounded-full flex items-center justify-center">
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white/90 backdrop-blur-2xl border border-white/60 shadow-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/50 flex items-center justify-between">
            <p className="font-bold text-gray-800 text-sm">알림</p>
            {total > 0 && <span className="text-xs text-rose-500 font-bold">{total}건</span>}
          </div>
          {active.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">새 알림이 없어요</div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-white/50">
              {active.map((i) => (
                <button
                  key={i.key}
                  onClick={() => go(i.to)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/60 transition-colors text-left"
                >
                  <span className="text-lg shrink-0">{i.icon}</span>
                  <span className="flex-1 text-sm text-gray-700">{i.label}</span>
                  <span className="shrink-0 min-w-[20px] h-5 px-1.5 text-[11px] font-bold text-white bg-gradient-to-br from-rose-500 to-pink-500 rounded-full flex items-center justify-center">
                    {i.n > 99 ? '99+' : i.n}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  )
}

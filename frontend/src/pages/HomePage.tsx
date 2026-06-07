import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useChatStore } from '@/store/chatStore'
import { appointmentApi } from '@/api/appointment'
import { isAppointmentExpired } from '@/components/AppointmentCard'
import type { Appointment } from '@/types'
import dayjs from 'dayjs'

function getGreeting() {
  const h = dayjs().hour()
  if (h < 5)  return '늦은 밤이에요 🌙'
  if (h < 8)  return '이른 아침이에요 🌅'
  if (h < 12) return '좋은 아침이에요 ☀️'
  if (h < 14) return '점심 시간이에요 🍽️'
  if (h < 18) return '좋은 오후예요 🌤'
  if (h < 21) return '좋은 저녁이에요 🌆'
  return '밤이 되었어요 🌃'
}

function HeartArrowIcon({ active }: { active: boolean }) {
  const arrowAnim = active
    ? { animation: 'arrow-fly-in 0.55s cubic-bezier(0.22,1,0.36,1) forwards' }
    : { opacity: 0, transform: 'translate(-44px,-44px)' }

  return (
    <div className="relative w-14 h-14" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))' }}>
      <svg viewBox="0 0 64 64" className="absolute inset-0 w-full h-full" style={{ zIndex: 1, ...arrowAnim }}>
        <line x1="10" y1="10" x2="22" y2="22" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" />
        <g transform="rotate(-70, 10, 10)">
          <path d="M10,10 C7,8 7,3 10,-3 C13,3 13,8 10,10Z" fill="white" stroke="#d97706" strokeWidth="0.6" />
          <line x1="10" y1="9" x2="10" y2="-3" stroke="#d97706" strokeWidth="0.7" strokeLinecap="round" />
        </g>
        <g transform="rotate(-45, 10, 10)">
          <path d="M10,10 C7,8 7,3 10,-3 C13,3 13,8 10,10Z" fill="white" stroke="#d97706" strokeWidth="0.6" />
          <line x1="10" y1="9" x2="10" y2="-3" stroke="#d97706" strokeWidth="0.7" strokeLinecap="round" />
        </g>
        <g transform="rotate(-20, 10, 10)">
          <path d="M10,10 C7,8 7,3 10,-3 C13,3 13,8 10,10Z" fill="white" stroke="#d97706" strokeWidth="0.6" />
          <line x1="10" y1="9" x2="10" y2="-3" stroke="#d97706" strokeWidth="0.7" strokeLinecap="round" />
        </g>
      </svg>
      <svg viewBox="0 0 64 64" className="absolute inset-0 w-full h-full" style={{ zIndex: 2 }}>
        <g transform="rotate(12, 32, 32)">
          <path
            d="M32 56C32 56 7 41 7 24C7 14 14 8 23 8C27.5 8 31 11 32 13C33 11 36.5 8 41 8C50 8 57 14 57 24C57 41 32 56 32 56Z"
            fill="#e11d48"
            style={active ? { animation: 'heart-bounce 0.65s ease-out' } : undefined}
          />
          <ellipse cx="22" cy="19" rx="6" ry="3.5" fill="white" opacity="0.2" transform="rotate(-30 22 19)" />
        </g>
      </svg>
      <svg viewBox="0 0 64 64" className="absolute inset-0 w-full h-full" style={{ zIndex: 3, ...arrowAnim }}>
        <line x1="42" y1="42" x2="50" y2="50" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" />
        <g transform="translate(53,53) rotate(45)">
          <path d="M0,6 C-8,1 -8,-5 -3,-5 C-1,-5 0,-3 0,-2 C0,-3 1,-5 3,-5 C8,-5 8,1 0,6Z" fill="#e11d48" />
        </g>
      </svg>
    </div>
  )
}

const FIREWORK_PARTICLES = [
  { angle: 0,   color: '#fbbf24' },
  { angle: 45,  color: '#f472b6' },
  { angle: 90,  color: '#60a5fa' },
  { angle: 135, color: '#4ade80' },
  { angle: 180, color: '#c084fc' },
  { angle: 225, color: '#fb923c' },
  { angle: 270, color: '#38bdf8' },
  { angle: 315, color: '#f87171' },
]

function FireworksIcon({ active }: { active: boolean }) {
  return (
    <div className="relative w-14 h-14 flex items-center justify-center">
      {FIREWORK_PARTICLES.map((p, i) => (
        <div key={i} style={{ position: 'absolute', top: '50%', left: '50%', transform: `rotate(${p.angle}deg)` }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%', backgroundColor: p.color,
            marginTop: -5, marginLeft: -5,
            opacity: active ? 1 : 0,
            animation: active ? `particle-out 0.6s ease-out ${i * 45}ms forwards` : 'none',
          }} />
        </div>
      ))}
      <span className="text-4xl relative z-10 drop-shadow"
        style={active ? { animation: 'firework-center 0.55s ease-out' } : undefined}>
        🎉
      </span>
    </div>
  )
}

export default function HomePage() {
  const [matchHover, setMatchHover] = useState(false)
  const [groupHover, setGroupHover] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [greeting, setGreeting] = useState(getGreeting)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const { user } = useAuthStore()
  const { rooms } = useChatStore()

  useEffect(() => {
    const id = setInterval(() => setGreeting(getGreeting()), 60_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    appointmentApi.getMine().then((res) => setAppointments(res.data)).catch(() => {})
  }, [])

  const totalUnread = rooms.reduce((acc, r) => acc + r.unreadCount, 0)
  // 만료되지 않은 다가오는 약속만 (가까운 순)
  const upcomingAppointments = appointments
    .filter((a) => !isAppointmentExpired(a))
    .sort((x, y) => dayjs(`${x.date} ${x.time}`).valueOf() - dayjs(`${y.date} ${y.time}`).valueOf())

  return (
    <>
      <div className="space-y-5">

        {/* 상단 프로필 바 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => user?.profileImage && setShowImageModal(true)}
              style={{ cursor: user?.profileImage ? 'pointer' : 'default' }}
              className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 shrink-0"
            >
              {user?.profileImage ? (
                <img src={user.profileImage} alt="프로필" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                  </svg>
                </div>
              )}
            </button>
            <div>
              <p className="text-[13px] font-semibold text-gray-900 leading-none">{user?.nickname}</p>
              <p className="text-[11px] text-gray-400 mt-0.5 leading-none">{user?.department}</p>
            </div>
          </div>
          <Link to="/profile" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </Link>
        </div>

        {/* 인사 */}
        <div>
          <p className="text-[13px] text-gray-400">{greeting}</p>
          <p className="text-2xl font-black text-gray-900 mt-0.5 leading-tight">
            오늘 새로운<br/>인연을 만나볼까요?
          </p>
        </div>

        {/* 기능 카드 2열 */}
        <div className="grid grid-cols-2 gap-4">

          <Link
            to="/matching"
            className="group bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            onMouseEnter={() => setMatchHover(true)}
            onMouseLeave={() => setMatchHover(false)}
          >
            <div className="bg-gradient-to-br from-primary-600 to-primary-800 px-5 py-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-secondary-300 uppercase tracking-widest">1:1</p>
                <p className="text-2xl font-black text-white mt-0.5">매칭</p>
              </div>
              <HeartArrowIcon active={matchHover} />
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-gray-500 leading-snug">마음에 드는 상대에게 좋아요를 보내보세요</p>
              <p className="text-xs font-bold text-primary-600 mt-3 group-hover:translate-x-1 transition-transform">시작하기 →</p>
            </div>
          </Link>

          <Link
            to="/group-matching"
            className="group bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            onMouseEnter={() => setGroupHover(true)}
            onMouseLeave={() => setGroupHover(false)}
          >
            <div className="bg-gradient-to-br from-secondary-400 to-secondary-600 px-5 py-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white/70 uppercase tracking-widest">그룹</p>
                <p className="text-2xl font-black text-white mt-0.5">과팅</p>
              </div>
              <FireworksIcon active={groupHover} />
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-gray-500 leading-snug">팀을 꾸려 다 같이 만나보세요</p>
              <p className="text-xs font-bold text-secondary-600 mt-3 group-hover:translate-x-1 transition-transform">참여하기 →</p>
            </div>
          </Link>

        </div>

        {/* 다가오는 약속 */}
        {upcomingAppointments.length > 0 && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm">
            <div className="px-5 pt-4 pb-3 flex items-center gap-2 border-b border-gray-50">
              <span className="text-base">📅</span>
              <p className="font-bold text-gray-800">다가오는 약속</p>
              <span className="text-[11px] text-gray-400 font-medium">{upcomingAppointments.length}건</span>
            </div>
            <div className="divide-y divide-gray-50">
              {upcomingAppointments.slice(0, 4).map((a) => (
                <Link
                  key={a.id}
                  to={`/chat/${a.roomId}?appt=${a.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <div className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center shrink-0 ${a.status === 'confirmed' ? 'bg-green-50' : 'bg-yellow-50'}`}>
                    <span className={`text-[10px] font-bold leading-none ${a.status === 'confirmed' ? 'text-green-600' : 'text-yellow-600'}`}>
                      {dayjs(a.date).format('M월')}
                    </span>
                    <span className={`text-base font-black leading-tight ${a.status === 'confirmed' ? 'text-green-700' : 'text-yellow-700'}`}>
                      {dayjs(a.date).format('D')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {a.location}
                    </p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {dayjs(a.date).format('M/D(ddd)')} {a.time}
                      {a.partnerNickname && ` · ${a.partnerNickname}`}
                    </p>
                  </div>
                  <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${a.status === 'confirmed' ? 'text-green-600 bg-green-50' : 'text-yellow-600 bg-yellow-50'}`}>
                    {a.status === 'confirmed' ? '확정' : '대기'}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 최근 채팅 */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm">
          <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-gray-50">
            <div className="flex items-center gap-2">
              <p className="font-bold text-gray-800">채팅</p>
              {totalUnread > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 text-[11px] font-bold text-white bg-primary-500 rounded-full flex items-center justify-center">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              )}
            </div>
            <Link to="/chat" className="text-xs text-primary-500 font-semibold">전체 보기</Link>
          </div>
          {rooms.length === 0 ? (
            <div className="py-10 flex flex-col items-center gap-2 text-gray-300">
              <span className="text-3xl">💬</span>
              <p className="text-xs">아직 채팅이 없어요</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {rooms.slice(0, 5).map((room) => (
                <Link
                  key={room.id}
                  to={`/chat/${room.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0 overflow-hidden">
                    {room.type === 'individual' && room.partner?.profileImage ? (
                      <img src={room.partner.profileImage} alt={room.partner.nickname} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-primary-500">
                        {room.type === 'individual' ? (room.partner?.nickname?.[0] ?? '?') : '👥'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {room.type === 'individual' ? room.partner?.nickname : room.groupName}
                    </p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {room.lastMessage === '[expired_image]'
                        ? '🗑️ 만료된 이미지'
                        : (room.lastMessage?.includes('amazonaws.com') || room.lastMessage?.startsWith('blob:'))
                        ? '📷 사진을 보냈습니다'
                        : (room.lastMessage ?? '대화를 시작해보세요')}
                    </p>
                  </div>
                  {room.unreadCount > 0 && (
                    <span className="shrink-0 min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-primary-500 rounded-full flex items-center justify-center">
                      {room.unreadCount}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* 이미지 모달 */}
      {showImageModal && user?.profileImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowImageModal(false)}>
          <div className="relative max-w-sm w-full mx-6" onClick={(e) => e.stopPropagation()}>
            <img src={user.profileImage} alt="프로필" className="w-full rounded-3xl shadow-2xl object-cover" />
            <button onClick={() => setShowImageModal(false)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  )
}

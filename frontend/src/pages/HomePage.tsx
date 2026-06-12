import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useChatStore } from '@/store/chatStore'
import { appointmentApi } from '@/api/appointment'
import { isAppointmentExpired } from '@/components/AppointmentCard'
import { useSocketInstance } from '@/hooks/useSocket'
import type { Appointment, ChatMessage } from '@/types'
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

  const HEART_PATH = 'M32 56C32 56 7 41 7 24C7 14 14 8 23 8C27.5 8 31 11 32 13C33 11 36.5 8 41 8C50 8 57 14 57 24C57 41 32 56 32 56Z'

  return (
    <div className="relative w-14 h-14" style={{ filter: 'drop-shadow(0 3px 6px rgba(130,20,50,0.40))' }}>
      {/* 뒤쪽 화살 (깃·샤프트) — 골드 메탈릭 */}
      <svg viewBox="0 0 64 64" className="absolute inset-0 w-full h-full" style={{ zIndex: 1, ...arrowAnim }}>
        <defs>
          <linearGradient id="arrowGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="45%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#a85a00" />
          </linearGradient>
        </defs>
        {[-70, -45, -20].map((deg, i) => (
          <g key={i} transform={`rotate(${deg}, 10, 10)`}>
            <path d="M10,10 C7,8 7,3 10,-3 C13,3 13,8 10,10Z" fill="#fff7e6" stroke="url(#arrowGrad)" strokeWidth="0.8" />
            <line x1="10" y1="9" x2="10" y2="-3" stroke="#c2740a" strokeWidth="0.7" strokeLinecap="round" />
          </g>
        ))}
        <line x1="10" y1="10" x2="24" y2="24" stroke="#a85a00" strokeWidth="3.6" strokeLinecap="round" />
        <line x1="10" y1="10" x2="24" y2="24" stroke="url(#arrowGrad)" strokeWidth="2.4" strokeLinecap="round" />
        <line x1="11" y1="10.5" x2="22" y2="21.5" stroke="#fff3cf" strokeWidth="0.8" strokeLinecap="round" opacity="0.85" />
      </svg>

      {/* 하트 — 그라데이션 + 광택으로 입체감 */}
      <svg viewBox="0 0 64 64" className="absolute inset-0 w-full h-full" style={{ zIndex: 2 }}>
        <defs>
          <linearGradient id="heartGrad" x1="0.15" y1="0" x2="0.85" y2="1">
            <stop offset="0%" stopColor="#ff8aa6" />
            <stop offset="45%" stopColor="#f5295b" />
            <stop offset="100%" stopColor="#b3123c" />
          </linearGradient>
          <radialGradient id="heartGloss" cx="0.32" cy="0.26" r="0.55">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g transform="rotate(12, 32, 32)" style={active ? { animation: 'heart-bounce 0.65s ease-out' } : undefined}>
          <path d={HEART_PATH} fill="url(#heartGrad)" />
          <path d={HEART_PATH} fill="url(#heartGloss)" />
          <ellipse cx="21" cy="18" rx="7" ry="4.2" fill="#ffffff" opacity="0.45" transform="rotate(-28 21 18)" />
          <circle cx="39" cy="15" r="1.8" fill="#ffffff" opacity="0.5" />
        </g>
      </svg>

      {/* 앞쪽 화살촉 — 골드(하트와 대비), 관통 그림자 포함 */}
      <svg viewBox="0 0 64 64" className="absolute inset-0 w-full h-full" style={{ zIndex: 3, ...arrowAnim }}>
        {/* 화살이 하트를 뚫고 나온 자리 그림자 */}
        <ellipse cx="40.5" cy="40.5" rx="3.4" ry="1.7" fill="#7a0f2e" opacity="0.5" transform="rotate(45 40.5 40.5)" />
        <line x1="42" y1="42" x2="50" y2="50" stroke="#a85a00" strokeWidth="3.6" strokeLinecap="round" />
        <line x1="42" y1="42" x2="50" y2="50" stroke="url(#arrowGrad)" strokeWidth="2.4" strokeLinecap="round" />
        <line x1="42.5" y1="42.5" x2="49" y2="49" stroke="#fff3cf" strokeWidth="0.8" strokeLinecap="round" opacity="0.85" />
        <g transform="translate(53,53) rotate(45)">
          <path d="M0,6 C-8,1 -8,-5 -3,-5 C-1,-5 0,-3 0,-2 C0,-3 1,-5 3,-5 C8,-5 8,1 0,6Z" fill="url(#arrowGrad)" stroke="#a85a00" strokeWidth="0.5" />
          <path d="M0,4 C-4,1 -4,-3 -1.5,-3.5 L0,-2 Z" fill="#fff3cf" opacity="0.55" />
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

const GLASS = 'bg-white/55 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgba(120,90,200,0.10)]'

export default function HomePage() {
  const [matchHover, setMatchHover] = useState(false)
  const [groupHover, setGroupHover] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [greeting, setGreeting] = useState(getGreeting)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const { user } = useAuthStore()
  const { rooms } = useChatStore()
  const socket = useSocketInstance()

  useEffect(() => {
    const id = setInterval(() => setGreeting(getGreeting()), 60_000)
    return () => clearInterval(id)
  }, [])

  const fetchAppointments = () =>
    appointmentApi.getMine().then((res) => setAppointments(res.data)).catch(() => {})

  useEffect(() => {
    fetchAppointments()
  }, [])

  // 실시간: 약속 제안/취소 알림(마커 메시지) 수신 시 일정 즉시 갱신
  useEffect(() => {
    if (!socket) return
    const onMsg = (m: ChatMessage) => {
      if (m?.content?.startsWith('[appointment:')) fetchAppointments()
    }
    socket.on('message:new', onMsg)
    return () => { socket.off('message:new', onMsg) }
  }, [socket])

  const totalUnread = rooms.reduce((acc, r) => acc + r.unreadCount, 0)
  // 만료되지 않은 다가오는 약속만 (가까운 순)
  const upcomingAppointments = appointments
    .filter((a) => !isAppointmentExpired(a))
    .sort((x, y) => dayjs(`${x.date} ${x.time}`).valueOf() - dayjs(`${y.date} ${y.time}`).valueOf())

  return (
    <>
      <div className="relative z-10 space-y-5">

        {/* 상단 프로필 바 — glass */}
        <div className={`flex items-center justify-between rounded-3xl px-4 py-3 ${GLASS}`}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => user?.profileImage && setShowImageModal(true)}
              style={{ cursor: user?.profileImage ? 'pointer' : 'default' }}
              className="w-10 h-10 rounded-full overflow-hidden bg-white/70 ring-2 ring-white/80 shrink-0"
            >
              {user?.profileImage ? (
                <img src={user.profileImage} alt="프로필" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-rose-100 to-violet-100 text-violet-400">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                  </svg>
                </div>
              )}
            </button>
            <div>
              <p className="text-[13px] font-bold text-gray-900 leading-none">{user?.nickname}</p>
              <p className="text-[11px] text-gray-400 mt-1 leading-none">{user?.department}</p>
            </div>
          </div>
          <Link to="/profile" className="w-9 h-9 rounded-full bg-white/70 border border-white/80 flex items-center justify-center hover:bg-white transition-colors">
            <svg className="w-4 h-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </Link>
        </div>

        {/* 인사 */}
        <div className="px-1 pt-1">
          <p className="text-[13px] font-semibold text-violet-500/80">{greeting}</p>
          <h1 className="text-[28px] font-black mt-1.5 leading-[1.2] tracking-tight">
            <span className="bg-gradient-to-br from-gray-900 via-gray-800 to-violet-700 bg-clip-text text-transparent">오늘 새로운<br/>인연을 만나볼까요?</span>
          </h1>
        </div>

        {/* 기능 카드 2열 */}
        <div className="grid grid-cols-2 gap-4">

          <Link
            to="/matching"
            className="group relative rounded-[28px] overflow-hidden border border-white/60 bg-white/45 backdrop-blur-xl shadow-[0_10px_38px_rgba(244,114,182,0.20)] hover:shadow-[0_16px_48px_rgba(244,114,182,0.34)] hover:-translate-y-0.5 transition-all duration-300"
            onMouseEnter={() => setMatchHover(true)}
            onMouseLeave={() => setMatchHover(false)}
          >
            <div className="relative bg-gradient-to-br from-rose-400 via-pink-500 to-fuchsia-500 px-5 py-6 flex items-center justify-between overflow-hidden">
              <div className="absolute -right-6 -bottom-8 w-28 h-28 rounded-full bg-white/15 blur-md" />
              <div className="relative">
                <p className="text-[11px] font-bold text-rose-50/90 uppercase tracking-[0.2em]">1:1</p>
                <p className="text-2xl font-black text-white mt-0.5 drop-shadow-sm">매칭</p>
              </div>
              <div className="relative"><HeartArrowIcon active={matchHover} /></div>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-gray-600 leading-snug">마음에 드는 상대에게 좋아요를 보내보세요</p>
              <p className="text-xs font-bold text-rose-500 mt-3 group-hover:translate-x-1 transition-transform">시작하기 →</p>
            </div>
          </Link>

          <Link
            to="/group-matching"
            className="group relative rounded-[28px] overflow-hidden border border-white/60 bg-white/45 backdrop-blur-xl shadow-[0_10px_38px_rgba(139,92,246,0.20)] hover:shadow-[0_16px_48px_rgba(139,92,246,0.34)] hover:-translate-y-0.5 transition-all duration-300"
            onMouseEnter={() => setGroupHover(true)}
            onMouseLeave={() => setGroupHover(false)}
          >
            <div className="relative bg-gradient-to-br from-violet-400 via-purple-500 to-indigo-500 px-5 py-6 flex items-center justify-between overflow-hidden">
              <div className="absolute -right-6 -bottom-8 w-28 h-28 rounded-full bg-white/15 blur-md" />
              <div className="relative">
                <p className="text-[11px] font-bold text-violet-50/90 uppercase tracking-[0.2em]">그룹</p>
                <p className="text-2xl font-black text-white mt-0.5 drop-shadow-sm">과팅</p>
              </div>
              <div className="relative"><FireworksIcon active={groupHover} /></div>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-gray-600 leading-snug">팀을 꾸려 다 같이 만나보세요</p>
              <p className="text-xs font-bold text-violet-500 mt-3 group-hover:translate-x-1 transition-transform">참여하기 →</p>
            </div>
          </Link>

        </div>

        {/* 내 약속 일정 (항상 표시되는 고정 박스) */}
        <div className={`rounded-3xl overflow-hidden ${GLASS}`}>
          <div className="px-5 pt-4 pb-3 flex items-center gap-2 border-b border-white/40">
            <span className="text-base">📅</span>
            <p className="font-bold text-gray-800">내 약속 일정</p>
            {upcomingAppointments.length > 0 && (
              <span className="text-[11px] text-violet-500 font-bold bg-violet-100/70 px-2 py-0.5 rounded-full">{upcomingAppointments.length}건</span>
            )}
          </div>
          {upcomingAppointments.length === 0 ? (
            <div className="py-10 flex flex-col items-center gap-2 text-gray-400">
              <span className="text-3xl opacity-60">🗓️</span>
              <p className="text-xs">예정된 약속이 없어요</p>
            </div>
          ) : (
            <div className="divide-y divide-white/40 max-h-72 overflow-y-auto">
              {upcomingAppointments.map((a) => (
                <Link
                  key={a.id}
                  to={`/chat/${a.roomId}?appt=${a.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/50 transition-colors"
                >
                  <div className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center shrink-0 ${a.status === 'confirmed' ? 'bg-emerald-100/80' : 'bg-amber-100/80'}`}>
                    <span className={`text-[10px] font-bold leading-none ${a.status === 'confirmed' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {dayjs(a.date).format('M월')}
                    </span>
                    <span className={`text-base font-black leading-tight ${a.status === 'confirmed' ? 'text-emerald-700' : 'text-amber-700'}`}>
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
                  <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${a.status === 'confirmed' ? 'text-emerald-600 bg-emerald-100/70' : 'text-amber-600 bg-amber-100/70'}`}>
                    {a.status === 'confirmed' ? '확정' : '대기'}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* 최근 채팅 */}
        <div className={`rounded-3xl overflow-hidden ${GLASS}`}>
          <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-white/40">
            <div className="flex items-center gap-2">
              <p className="font-bold text-gray-800">채팅</p>
              {totalUnread > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 text-[11px] font-bold text-white bg-gradient-to-br from-rose-500 to-pink-500 rounded-full flex items-center justify-center">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              )}
            </div>
            <Link to="/chat" className="text-xs text-violet-500 font-bold">전체 보기</Link>
          </div>
          {rooms.length === 0 ? (
            <div className="py-10 flex flex-col items-center gap-2 text-gray-400">
              <span className="text-3xl opacity-60">💬</span>
              <p className="text-xs">아직 채팅이 없어요</p>
            </div>
          ) : (
            <div className="divide-y divide-white/40">
              {rooms.slice(0, 5).map((room) => (
                <Link
                  key={room.id}
                  to={`/chat/${room.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-100 to-violet-100 flex items-center justify-center shrink-0 overflow-hidden">
                    {room.type === 'individual' && room.partner?.profileImage ? (
                      <img src={room.partner.profileImage} alt={room.partner.nickname} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-violet-500">
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
                    <span className="shrink-0 min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-gradient-to-br from-rose-500 to-pink-500 rounded-full flex items-center justify-center">
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

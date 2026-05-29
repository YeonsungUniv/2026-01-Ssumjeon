import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useChatStore } from '@/store/chatStore'

function HeartArrowIcon({ active }: { active: boolean }) {
  // 왼쪽 위 → 오른쪽 아래 방향, 3레이어로 관통 효과
  // 화살 경로: (10,10)→(54,54), 하트 진입 ≈(22,22), 탈출 ≈(42,42)
  const arrowAnim = active
    ? { animation: 'arrow-fly-in 0.55s cubic-bezier(0.22,1,0.36,1) forwards' }
    : { opacity: 0, transform: 'translate(-44px,-44px)' }

  return (
    <div className="relative w-14 h-14" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))' }}>

      {/* ① 화살 뒷부분 (하트 뒤) — 깃털 + 뒷 화살대 */}
      <svg viewBox="0 0 64 64" className="absolute inset-0 w-full h-full" style={{ zIndex: 1, ...arrowAnim }}>
        {/* 뒷 화살대: 깃털 끝(10,10) → 하트 진입(22,22) */}
        <line x1="10" y1="10" x2="22" y2="22" stroke="#d97706" strokeWidth="2" strokeLinecap="butt" />
        {/* 깃털 — 45° 방향 기준 양쪽으로 퍼진 삼각 날개 */}
        <polygon points="10,10 3,3 16,7"  fill="#f59e0b" />
        <polygon points="10,10 3,3 7,16"  fill="#f59e0b" />
      </svg>

      {/* ② 하트 (12° 기울임) */}
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

      {/* ③ 화살 앞부분 (하트 앞) — 앞 화살대 + 촉 */}
      <svg viewBox="0 0 64 64" className="absolute inset-0 w-full h-full" style={{ zIndex: 3, ...arrowAnim }}>
        {/* 앞 화살대: 하트 탈출(42,42) → 촉 직전(48,48) */}
        <line x1="42" y1="42" x2="48" y2="48" stroke="#d97706" strokeWidth="2" strokeLinecap="butt" />
        {/* 화살촉 — 뾰족한 삼각형 */}
        <polygon points="54,54 43,49 49,43" fill="#f59e0b" />
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
        <div
          key={i}
          style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: `rotate(${p.angle}deg)`,
          }}
        >
          <div
            style={{
              width: 10, height: 10,
              borderRadius: '50%',
              backgroundColor: p.color,
              marginTop: -5, marginLeft: -5,
              opacity: active ? 1 : 0,
              animation: active ? `particle-out 0.6s ease-out ${i * 45}ms forwards` : 'none',
            }}
          />
        </div>
      ))}
      <span
        className="text-4xl relative z-10 drop-shadow"
        style={active ? { animation: 'firework-center 0.55s ease-out' } : undefined}
      >
        🎉
      </span>
    </div>
  )
}

export default function HomePage() {
  const [matchHover, setMatchHover] = useState(false)
  const [groupHover, setGroupHover] = useState(false)
  const { user } = useAuthStore()
  const { rooms } = useChatStore()
  const totalUnread = rooms.reduce((acc, r) => acc + r.unreadCount, 0)

  return (
    <div className="space-y-4">

      {/* 유저 인사 카드 */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-rose-400 to-pink-500 px-6 pt-6 pb-10" />
        <div className="px-6 -mt-7 pb-5 flex items-end gap-4">
          <div className="w-16 h-16 rounded-full bg-white ring-4 ring-white overflow-hidden flex items-center justify-center shadow">
            {user?.profileImage
              ? <img src={user.profileImage} alt="프로필" className="w-full h-full object-cover" />
              : <span className="text-3xl">{user?.gender === 'male' ? '🧑' : '👩'}</span>
            }
          </div>
          <div className="pb-1">
            <p className="font-black text-xl text-gray-800 leading-tight">{user?.nickname ?? ''}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {user?.department}{user?.grade ? ` · ${user.grade}학년` : ''}
            </p>
          </div>
          <Link to="/profile" className="ml-auto mb-1 text-xs text-primary-500 font-semibold border border-primary-200 bg-primary-50 px-3 py-1.5 rounded-full hover:bg-primary-100 transition-colors">
            프로필 수정
          </Link>
        </div>
        {user?.bio && (
          <div className="px-6 pb-5 -mt-1">
            <p className="text-sm text-gray-500 leading-relaxed">{user.bio}</p>
          </div>
        )}
      </div>

      {/* 기능 카드 2열 */}
      <div className="grid grid-cols-2 gap-4">

        {/* 1:1 매칭 */}
        <Link
          to="/matching"
          className="group bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
          onMouseEnter={() => setMatchHover(true)}
          onMouseLeave={() => setMatchHover(false)}
        >
          <div className="bg-gradient-to-br from-rose-400 to-pink-500 px-5 py-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-rose-100 uppercase tracking-widest">1:1</p>
              <p className="text-2xl font-black text-white mt-0.5">매칭</p>
            </div>
            <HeartArrowIcon active={matchHover} />
          </div>
          <div className="px-5 py-4">
            <p className="text-sm text-gray-500 leading-snug">마음에 드는 상대에게 좋아요를 보내보세요</p>
            <p className="text-xs font-bold text-rose-400 mt-3 group-hover:translate-x-1 transition-transform">시작하기 →</p>
          </div>
        </Link>

        {/* 과팅 매칭 */}
        <Link
          to="/group-matching"
          className="group bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
          onMouseEnter={() => setGroupHover(true)}
          onMouseLeave={() => setGroupHover(false)}
        >
          <div className="bg-gradient-to-br from-violet-400 to-purple-500 px-5 py-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-violet-100 uppercase tracking-widest">그룹</p>
              <p className="text-2xl font-black text-white mt-0.5">과팅</p>
            </div>
            <FireworksIcon active={groupHover} />
          </div>
          <div className="px-5 py-4">
            <p className="text-sm text-gray-500 leading-snug">팀을 꾸려 다 같이 만나보세요</p>
            <p className="text-xs font-bold text-violet-400 mt-3 group-hover:translate-x-1 transition-transform">참여하기 →</p>
          </div>
        </Link>

      </div>

      {/* 최근 채팅 카드 */}
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
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary-500">
                    {room.type === 'individual' ? (room.partner?.nickname?.[0] ?? '?') : '👥'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {room.type === 'individual' ? room.partner?.nickname : room.groupName}
                  </p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{room.lastMessage ?? '대화를 시작해보세요'}</p>
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
  )
}

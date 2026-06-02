import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useChatStore } from '@/store/chatStore'

function HeartArrowIcon({ active }: { active: boolean }) {
  // 큐피트 화살: 황금 화살대 + 하트 촉 + 깃털 날개
  // 방향: 왼쪽 위 → 오른쪽 아래, 진입≈(22,22), 탈출≈(42,42)
  const arrowAnim = active
    ? { animation: 'arrow-fly-in 0.55s cubic-bezier(0.22,1,0.36,1) forwards' }
    : { opacity: 0, transform: 'translate(-44px,-44px)' }

  return (
    <div className="relative w-14 h-14" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))' }}>

      {/* ① 화살 뒷부분 (하트 뒤) — 새꽁지깃 3장 + 뒷 화살대 */}
      <svg viewBox="0 0 64 64" className="absolute inset-0 w-full h-full" style={{ zIndex: 1, ...arrowAnim }}>
        {/* 황금 화살대 (뒷부분) */}
        <line x1="10" y1="10" x2="22" y2="22" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" />
        {/* 새꽁지깃: 꼬리(10,10) 기준으로 rotate해 3장 부채꼴 배치 */}
        {/* 깃털 템플릿 — 위쪽(-y)으로 뻗는 긴 타원형, rotate로 방향 조정 */}
        {/* 왼쪽 깃털 */}
        <g transform="rotate(-70, 10, 10)">
          <path d="M10,10 C7,8 7,3 10,-3 C13,3 13,8 10,10Z" fill="white" stroke="#d97706" strokeWidth="0.6" />
          <line x1="10" y1="9" x2="10" y2="-3" stroke="#d97706" strokeWidth="0.7" strokeLinecap="round" />
        </g>
        {/* 가운데 깃털 (화살 반대 방향 = 225°, rotate -45) */}
        <g transform="rotate(-45, 10, 10)">
          <path d="M10,10 C7,8 7,3 10,-3 C13,3 13,8 10,10Z" fill="white" stroke="#d97706" strokeWidth="0.6" />
          <line x1="10" y1="9" x2="10" y2="-3" stroke="#d97706" strokeWidth="0.7" strokeLinecap="round" />
        </g>
        {/* 오른쪽 깃털 */}
        <g transform="rotate(-20, 10, 10)">
          <path d="M10,10 C7,8 7,3 10,-3 C13,3 13,8 10,10Z" fill="white" stroke="#d97706" strokeWidth="0.6" />
          <line x1="10" y1="9" x2="10" y2="-3" stroke="#d97706" strokeWidth="0.7" strokeLinecap="round" />
        </g>
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

      {/* ③ 화살 앞부분 (하트 앞) — 앞 화살대 + 하트 모양 촉 */}
      <svg viewBox="0 0 64 64" className="absolute inset-0 w-full h-full" style={{ zIndex: 3, ...arrowAnim }}>
        {/* 황금 화살대 (앞부분) */}
        <line x1="42" y1="42" x2="50" y2="50" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" />
        {/* 하트 모양 화살촉: rotate(45)로 하트 끝이 오른쪽 아래를 향함 */}
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
  const [showImageModal, setShowImageModal] = useState(false)
  const { user } = useAuthStore()
  const { rooms } = useChatStore()
  const totalUnread = rooms.reduce((acc, r) => acc + r.unreadCount, 0)

  return (
    <>
    <div className="space-y-4">

      {/* 유저 프로필 카드 */}
      <div
        className="relative rounded-3xl overflow-hidden shadow-sm"
        style={{ background: 'linear-gradient(135deg, #ff2d6f 0%, #a855f7 60%, #6366f1 100%)' }}
      >
        {/* 배경 장식 원 */}
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10" style={{ background: 'white' }} />
        <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full opacity-10" style={{ background: 'white' }} />

        <div className="relative px-6 py-5 flex items-center gap-4">
          {/* 프로필 이미지 */}
          <div className="shrink-0">
            <button
              className="w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-white/30 shadow-lg active:scale-95 transition-transform"
              onClick={() => user?.profileImage && setShowImageModal(true)}
              style={{ cursor: user?.profileImage ? 'pointer' : 'default' }}
            >
              {user?.profileImage
                ? <img src={user.profileImage} alt="프로필" className="w-full h-full object-cover" />
                : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ background: user?.gender === 'male' ? 'linear-gradient(135deg,#60a5fa,#6366f1)' : 'linear-gradient(135deg,#f472b6,#f43f5e)' }}
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                    </svg>
                  </div>
                )
              }
            </button>
          </div>

          {/* 텍스트 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-black text-lg text-white leading-tight truncate">{user?.nickname ?? ''}</p>
              {user?.mbti && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">{user.mbti}</span>
              )}
            </div>
            <p className="text-xs text-white/70 mt-0.5">
              {user?.department}{user?.grade ? ` · ${user.grade}학년` : ''}
            </p>
            {user?.bio && (
              <p className="text-xs text-white/60 mt-1.5 line-clamp-1">{user.bio}</p>
            )}
          </div>

          {/* 프로필 수정 버튼 */}
          <Link
            to="/profile"
            className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors backdrop-blur-sm border border-white/20"
          >
            수정
          </Link>
        </div>

        {/* 관심사 태그 */}
        {user?.interests && user.interests.length > 0 && (
          <div className="px-6 pb-4 flex flex-wrap gap-1.5">
            {user.interests.slice(0, 5).map((i) => (
              <span key={i} className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/15 text-white/80 border border-white/10">
                {i}
              </span>
            ))}
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

    {/* 프로필 이미지 확대 모달 */}
    {showImageModal && user?.profileImage && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        onClick={() => setShowImageModal(false)}
      >
        <div className="relative max-w-sm w-full mx-6" onClick={(e) => e.stopPropagation()}>
          <img
            src={user.profileImage}
            alt="프로필"
            className="w-full rounded-3xl shadow-2xl object-cover"
          />
          <button
            onClick={() => setShowImageModal(false)}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
          >
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

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useChatStore } from '@/store/chatStore'
import dayjs from 'dayjs'

function getGreeting() {
  const h = dayjs().hour()
  if (h < 6) return '늦은 밤이에요 🌙'
  if (h < 12) return '좋은 아침이에요 ☀️'
  if (h < 18) return '좋은 오후예요 🌤'
  return '좋은 저녁이에요 🌆'
}

export default function HomePage() {
  const [showImageModal, setShowImageModal] = useState(false)
  const { user } = useAuthStore()
  const { rooms } = useChatStore()
  const totalUnread = rooms.reduce((acc, r) => acc + r.unreadCount, 0)

  return (
    <>
      <div className="space-y-6">

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
          <p className="text-[13px] text-gray-400">{getGreeting()}</p>
          <p className="text-2xl font-black text-gray-900 mt-0.5 leading-tight">
            오늘 새로운<br/>인연을 만나볼까요?
          </p>
        </div>

        {/* 1:1 매칭 메인 CTA */}
        <Link to="/matching" className="block group">
          <div className="rounded-3xl p-6 relative overflow-hidden" style={{ background: '#111' }}>
            <div className="relative z-10">
              <span className="inline-block text-xs font-semibold text-primary-400 bg-primary-400/10 px-2.5 py-1 rounded-full mb-3">
                1:1 매칭
              </span>
              <p className="text-white text-xl font-black leading-snug">
                마음에 드는 상대를<br/>지금 바로 찾아보세요
              </p>
              <div className="flex items-center gap-1.5 mt-4">
                <span className="text-sm text-gray-400 font-medium">매칭 시작하기</span>
                <svg className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
            {/* 핑크 블러 원 */}
            <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full opacity-20"
              style={{ background: 'radial-gradient(circle, #ff2d6f, transparent)' }} />
            <div className="absolute -right-4 bottom-4 w-24 h-24 rounded-full opacity-10"
              style={{ background: 'radial-gradient(circle, #a855f7, transparent)' }} />
          </div>
        </Link>

        {/* 보조 기능 */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/group-matching" className="rounded-2xl bg-gray-50 p-4 flex flex-col gap-3 hover:bg-gray-100 transition-colors border border-gray-100">
            <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#7c3aed">
                <circle cx="9" cy="7" r="3" />
                <circle cx="16" cy="8.5" r="2.5" opacity=".6" />
                <path d="M2 19c0-3.3 3.1-6 7-6s7 2.7 7 6" />
                <path d="M17 14c1.9.5 4 1.9 4 5" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity=".6" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">과팅</p>
              <p className="text-xs text-gray-400 mt-0.5">팀으로 만나요</p>
            </div>
          </Link>

          <Link to="/chat" className="rounded-2xl bg-gray-50 p-4 flex flex-col gap-3 hover:bg-gray-100 transition-colors border border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#ff2d6f">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                </svg>
              </div>
              {totalUnread > 0 && (
                <span className="text-[10px] font-bold text-white bg-primary-500 rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                  {totalUnread}
                </span>
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">채팅</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {rooms.length > 0 ? `${rooms.length}개의 대화` : '대화 없음'}
              </p>
            </div>
          </Link>
        </div>

        {/* 최근 대화 */}
        {rooms.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-900">최근 대화</p>
              <Link to="/chat" className="text-xs text-gray-400">더 보기</Link>
            </div>
            <div className="space-y-1">
              {rooms.slice(0, 3).map((room) => (
                <Link
                  key={room.id}
                  to={`/chat/${room.id}`}
                  className="flex items-center gap-3 px-1 py-2.5 rounded-2xl hover:bg-gray-50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-gray-500">
                      {room.type === 'individual' ? (room.partner?.nickname?.[0] ?? '?') : '👥'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {room.type === 'individual' ? room.partner?.nickname : room.groupName}
                    </p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {room.lastMessage === '[expired_image]'
                        ? '만료된 이미지'
                        : (room.lastMessage?.includes('amazonaws.com') || room.lastMessage?.startsWith('blob:'))
                        ? '📷 사진'
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
          </div>
        )}

      </div>

      {/* 이미지 모달 */}
      {showImageModal && user?.profileImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setShowImageModal(false)}>
          <div className="relative max-w-xs w-full mx-6" onClick={(e) => e.stopPropagation()}>
            <img src={user.profileImage} alt="프로필" className="w-full rounded-2xl shadow-2xl object-cover" />
            <button onClick={() => setShowImageModal(false)} className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  )
}

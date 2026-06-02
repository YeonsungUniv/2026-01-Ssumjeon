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

        {/* 메뉴 */}
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
          <Link to="/matching" className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
            <div className="w-9 h-9 rounded-full bg-primary-500 flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M12 21C12 21 3 15.5 3 9.5C3 6.46 5.46 4 8.5 4C10.24 4 11.91 4.81 13 6.08C14.09 4.81 15.76 4 17.5 4C20.54 4 23 6.46 23 9.5C23 15.5 12 21 12 21Z"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">1:1 매칭</p>
              <p className="text-xs text-gray-400 mt-0.5">지금 바로 인연을 찾아보세요</p>
            </div>
            <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          <Link to="/group-matching" className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
            <div className="w-9 h-9 rounded-full bg-violet-500 flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <circle cx="9" cy="7" r="3"/>
                <circle cx="16" cy="8" r="2.5" opacity=".7"/>
                <path d="M2 19c0-3.3 3.1-6 7-6s7 2.7 7 6"/>
                <path d="M17 14c2 .5 4 2 4 5" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity=".7"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">과팅</p>
              <p className="text-xs text-gray-400 mt-0.5">팀을 꾸려 함께 만나보세요</p>
            </div>
            <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          <Link to="/chat" className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
            <div className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">채팅</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {rooms.length > 0 ? `${rooms.length}개의 대화` : '아직 대화가 없어요'}
              </p>
            </div>
            {totalUnread > 0
              ? <span className="min-w-[20px] h-5 px-1.5 text-[11px] font-bold text-white bg-primary-500 rounded-full flex items-center justify-center">{totalUnread}</span>
              : <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            }
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

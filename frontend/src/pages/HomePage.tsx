import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useChatStore } from '@/store/chatStore'

export default function HomePage() {
  const [showImageModal, setShowImageModal] = useState(false)
  const { user } = useAuthStore()
  const { rooms } = useChatStore()
  const totalUnread = rooms.reduce((acc, r) => acc + r.unreadCount, 0)

  return (
    <>
      <div className="space-y-4">

        {/* ── 프로필 카드 ───────────────────────── */}
        <div className="bg-white rounded-3xl overflow-hidden border border-gray-100">
          {/* 상단 컬러 배너 */}
          <div className="h-20 bg-primary-50 relative">
            <div className="absolute bottom-0 left-0 right-0 h-8"
              style={{ background: 'linear-gradient(to bottom, transparent, white)' }} />
          </div>

          <div className="px-5 pb-5 -mt-8 flex flex-col">
            <div className="flex items-end justify-between mb-3">
              {/* 아바타 */}
              <button
                onClick={() => user?.profileImage && setShowImageModal(true)}
                style={{ cursor: user?.profileImage ? 'pointer' : 'default' }}
                className="w-16 h-16 rounded-2xl overflow-hidden border-4 border-white shadow-md shrink-0"
              >
                {user?.profileImage ? (
                  <img src={user.profileImage} alt="프로필" className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${user?.gender === 'male' ? 'bg-blue-100' : 'bg-pink-100'}`}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill={user?.gender === 'male' ? '#60a5fa' : '#f472b6'}>
                      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                    </svg>
                  </div>
                )}
              </button>

              {/* 수정 버튼 */}
              <Link
                to="/profile"
                className="mb-1 text-xs font-medium text-gray-500 border border-gray-200 px-3 py-1.5 rounded-full hover:bg-gray-50 transition-colors"
              >
                프로필 수정
              </Link>
            </div>

            {/* 이름 + 정보 */}
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-gray-900 text-lg leading-tight">{user?.nickname ?? ''}</p>
              {user?.mbti && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-50 text-primary-500 border border-primary-100">
                  {user.mbti}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400 mt-0.5">
              {user?.department}{user?.grade ? ` · ${user.grade}학년` : ''}
            </p>
            {user?.bio && (
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">{user.bio}</p>
            )}

            {/* 관심사 */}
            {user?.interests && user.interests.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {user.interests.slice(0, 6).map((i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-gray-50 text-gray-500 border border-gray-100">
                    {i}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── 기능 카드 ─────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">

          {/* 1:1 매칭 */}
          <Link to="/matching" className="group relative bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-5">
              <div className="w-10 h-10 rounded-2xl bg-rose-500 flex items-center justify-center mb-4 shadow-sm">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M12 21C12 21 3 15.5 3 9.5C3 6.46 5.46 4 8.5 4C10.24 4 11.91 4.81 13 6.08C14.09 4.81 15.76 4 17.5 4C20.54 4 23 6.46 23 9.5C23 15.5 12 21 12 21Z"/>
                </svg>
              </div>
              <p className="font-bold text-gray-900 text-sm">1:1 매칭</p>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">인연을<br/>찾아보세요</p>
            </div>
            <div className="absolute bottom-4 right-4 w-7 h-7 rounded-full bg-rose-50 flex items-center justify-center group-hover:bg-rose-100 transition-colors">
              <svg className="w-3.5 h-3.5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          {/* 과팅 */}
          <Link to="/group-matching" className="group relative bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-5">
              <div className="w-10 h-10 rounded-2xl bg-violet-500 flex items-center justify-center mb-4 shadow-sm">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <circle cx="9" cy="7" r="3.5"/>
                  <circle cx="16.5" cy="8.5" r="2.5"/>
                  <path d="M2 19c0-3.3 3.1-6 7-6s7 2.7 7 6"/>
                  <path d="M17 14c2 .5 4 2 4 5" strokeWidth="1.5" strokeLinecap="round" stroke="white" fill="none"/>
                </svg>
              </div>
              <p className="font-bold text-gray-900 text-sm">과팅</p>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">팀으로<br/>만나보세요</p>
            </div>
            <div className="absolute bottom-4 right-4 w-7 h-7 rounded-full bg-violet-50 flex items-center justify-center group-hover:bg-violet-100 transition-colors">
              <svg className="w-3.5 h-3.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

        </div>

        {/* ── 채팅 ──────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="font-bold text-gray-900 text-sm">최근 채팅</p>
              {totalUnread > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-primary-500 rounded-full flex items-center justify-center">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              )}
            </div>
            <Link to="/chat" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              전체 보기
            </Link>
          </div>

          <div className="border-t border-gray-50">
            {rooms.length === 0 ? (
              <div className="py-10 flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-400">아직 채팅이 없어요</p>
                  <p className="text-xs text-gray-300 mt-0.5">매칭 후 채팅을 시작해보세요</p>
                </div>
              </div>
            ) : (
              <div>
                {rooms.slice(0, 5).map((room, i) => (
                  <Link
                    key={room.id}
                    to={`/chat/${room.id}`}
                    className={`flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors ${i !== 0 ? 'border-t border-gray-50' : ''}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center shrink-0 border border-primary-100">
                      <span className="text-xs font-bold text-primary-400">
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

      </div>

      {/* 이미지 모달 */}
      {showImageModal && user?.profileImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-xs w-full mx-6" onClick={(e) => e.stopPropagation()}>
            <img src={user.profileImage} alt="프로필" className="w-full rounded-2xl shadow-2xl object-cover" />
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center"
            >
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

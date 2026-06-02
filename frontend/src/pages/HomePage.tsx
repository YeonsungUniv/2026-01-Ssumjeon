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
      <div className="space-y-3">

        {/* 프로필 카드 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-4">
            {/* 아바타 */}
            <button
              className="shrink-0 w-14 h-14 rounded-full overflow-hidden bg-gray-100 ring-1 ring-gray-200"
              onClick={() => user?.profileImage && setShowImageModal(true)}
              style={{ cursor: user?.profileImage ? 'pointer' : 'default' }}
            >
              {user?.profileImage ? (
                <img src={user.profileImage} alt="프로필" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="8" r="4" fill="#d1d5db" />
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill="#d1d5db" />
                  </svg>
                </div>
              )}
            </button>

            {/* 텍스트 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-gray-900 text-base truncate">{user?.nickname ?? ''}</p>
                {user?.mbti && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 shrink-0">
                    {user.mbti}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {user?.department}{user?.grade ? ` · ${user.grade}학년` : ''}
              </p>
              {user?.bio && (
                <p className="text-xs text-gray-500 mt-1.5 line-clamp-1">{user.bio}</p>
              )}
            </div>

            {/* 편집 버튼 */}
            <Link to="/profile" className="shrink-0 p-2 rounded-xl hover:bg-gray-50 transition-colors text-gray-300 hover:text-gray-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </Link>
          </div>

          {/* 관심사 */}
          {user?.interests && user.interests.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-50">
              {user.interests.slice(0, 6).map((i) => (
                <span key={i} className="text-[11px] px-2.5 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-100">
                  {i}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 기능 카드 */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/matching"
            className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-gray-200 hover:shadow-sm transition-all group"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center mb-3">
              <svg className="w-4.5 h-4.5" width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 21C12 21 3 15.5 3 9.5C3 6.46 5.46 4 8.5 4C10.24 4 11.91 4.81 13 6.08C14.09 4.81 15.76 4 17.5 4C20.54 4 23 6.46 23 9.5C23 15.5 12 21 12 21Z" fill="#f43f5e" />
              </svg>
            </div>
            <p className="font-bold text-gray-900 text-sm">1:1 매칭</p>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">인연을 찾아보세요</p>
            <p className="text-xs text-rose-400 font-semibold mt-3 group-hover:translate-x-0.5 transition-transform">시작하기 →</p>
          </Link>

          <Link
            to="/group-matching"
            className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-gray-200 hover:shadow-sm transition-all group"
          >
            <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center mb-3">
              <svg className="w-4.5 h-4.5" width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="9" cy="7" r="3" fill="#8b5cf6" />
                <circle cx="16" cy="8" r="2.5" fill="#c4b5fd" />
                <path d="M2 19c0-3.3 3.1-6 7-6s7 2.7 7 6" fill="#8b5cf6" />
                <path d="M16 13c2.2.5 4 2.3 4 5" stroke="#c4b5fd" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <p className="font-bold text-gray-900 text-sm">과팅</p>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">팀으로 만나보세요</p>
            <p className="text-xs text-violet-400 font-semibold mt-3 group-hover:translate-x-0.5 transition-transform">참여하기 →</p>
          </Link>
        </div>

        {/* 채팅 */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-5 pt-4 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="font-bold text-gray-900 text-sm">채팅</p>
              {totalUnread > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-primary-500 rounded-full flex items-center justify-center">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              )}
            </div>
            <Link to="/chat" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">전체 보기</Link>
          </div>

          <div className="border-t border-gray-50">
            {rooms.length === 0 ? (
              <div className="py-10 flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-xs text-gray-400">아직 채팅이 없어요</p>
              </div>
            ) : (
              <div>
                {rooms.slice(0, 5).map((room, i) => (
                  <Link
                    key={room.id}
                    to={`/chat/${room.id}`}
                    className={`flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors ${i !== 0 ? 'border-t border-gray-50' : ''}`}
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
                          ? '사진을 보냈습니다'
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

      {/* 프로필 이미지 확대 모달 */}
      {showImageModal && user?.profileImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-xs w-full mx-6" onClick={(e) => e.stopPropagation()}>
            <img
              src={user.profileImage}
              alt="프로필"
              className="w-full rounded-2xl shadow-2xl object-cover"
            />
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
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

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
      <div className="space-y-5">

        {/* 인사 + 프로필 */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">안녕하세요</p>
            <p className="text-xl font-black text-gray-900">{user?.nickname ?? ''} 님</p>
          </div>
          <button
            onClick={() => user?.profileImage && setShowImageModal(true)}
            style={{ cursor: user?.profileImage ? 'pointer' : 'default' }}
            className="w-11 h-11 rounded-full overflow-hidden border-2 border-white shadow-md shrink-0"
          >
            {user?.profileImage ? (
              <img src={user.profileImage} alt="프로필" className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${user?.gender === 'male' ? 'bg-blue-100' : 'bg-pink-100'}`}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill={user?.gender === 'male' ? '#93c5fd' : '#f9a8d4'}>
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                </svg>
              </div>
            )}
          </button>
        </div>

        {/* 메인 기능 카드 — 비대칭 그리드 */}
        <div className="grid grid-cols-5 grid-rows-2 gap-3" style={{ height: '240px' }}>

          {/* 1:1 매칭 — 왼쪽 큰 카드 */}
          <Link
            to="/matching"
            className="col-span-3 row-span-2 rounded-3xl overflow-hidden relative flex flex-col justify-between p-5"
            style={{ background: 'linear-gradient(145deg, #ff2d6f, #ff6b9d)' }}
          >
            <div>
              <p className="text-white/70 text-xs font-medium tracking-wide">MATCHING</p>
              <p className="text-white font-black text-2xl mt-1 leading-tight">1:1<br/>매칭</p>
            </div>
            <div className="flex items-end justify-between">
              <p className="text-white/80 text-xs leading-relaxed">조건에 맞는<br/>인연을 찾아보세요</p>
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
            {/* 배경 장식 */}
            <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10" />
          </Link>

          {/* 과팅 — 오른쪽 위 */}
          <Link
            to="/group-matching"
            className="col-span-2 rounded-3xl overflow-hidden relative flex flex-col justify-between p-4"
            style={{ background: 'linear-gradient(145deg, #7c3aed, #a855f7)' }}
          >
            <p className="text-white font-black text-base leading-tight">과팅</p>
            <div className="flex items-end justify-between">
              <p className="text-white/70 text-[11px]">팀 매칭</p>
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
            <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-white/10" />
          </Link>

          {/* 채팅 바로가기 — 오른쪽 아래 */}
          <Link
            to="/chat"
            className="col-span-2 rounded-3xl bg-gray-900 relative flex flex-col justify-between p-4 overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <p className="text-white font-black text-base leading-tight">채팅</p>
              {totalUnread > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-primary-500 rounded-full flex items-center justify-center">
                  {totalUnread}
                </span>
              )}
            </div>
            <p className="text-gray-400 text-[11px]">
              {rooms.length > 0 ? `${rooms.length}개의 대화` : '대화 없음'}
            </p>
            <div className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full bg-white/5" />
          </Link>

        </div>

        {/* 프로필 한줄 정보 */}
        <div className="flex items-center gap-3 px-1">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xs text-gray-400">{user?.department}</span>
            {user?.grade && <span className="text-xs text-gray-300">·</span>}
            {user?.grade && <span className="text-xs text-gray-400">{user.grade}학년</span>}
            {user?.mbti && <span className="text-xs text-gray-300">·</span>}
            {user?.mbti && <span className="text-xs font-semibold text-primary-400">{user.mbti}</span>}
          </div>
          <Link to="/profile" className="text-xs text-gray-400 hover:text-gray-600 transition-colors shrink-0">
            프로필 수정
          </Link>
        </div>

        {/* 최근 채팅 리스트 */}
        {rooms.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <p className="text-sm font-bold text-gray-900">최근 대화</p>
              <Link to="/chat" className="text-xs text-gray-400">전체 보기</Link>
            </div>
            <div className="space-y-1">
              {rooms.slice(0, 4).map((room) => (
                <Link
                  key={room.id}
                  to={`/chat/${room.id}`}
                  className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-colors"
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
          </div>
        )}

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

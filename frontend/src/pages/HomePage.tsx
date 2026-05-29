import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useChatStore } from '@/store/chatStore'

export default function HomePage() {
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
        <Link to="/matching" className="group bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
          <div className="bg-gradient-to-br from-rose-400 to-pink-500 px-5 py-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-rose-100 uppercase tracking-widest">1:1</p>
              <p className="text-2xl font-black text-white mt-0.5">매칭</p>
            </div>
            <span className="text-4xl drop-shadow transition-all duration-300 group-hover:scale-125 group-hover:-translate-y-1 group-hover:drop-shadow-lg">💘</span>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm text-gray-500 leading-snug">마음에 드는 상대에게 좋아요를 보내보세요</p>
            <p className="text-xs font-bold text-rose-400 mt-3 group-hover:translate-x-1 transition-transform">시작하기 →</p>
          </div>
        </Link>

        {/* 과팅 매칭 */}
        <Link to="/group-matching" className="group bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
          <div className="bg-gradient-to-br from-violet-400 to-purple-500 px-5 py-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-violet-100 uppercase tracking-widest">그룹</p>
              <p className="text-2xl font-black text-white mt-0.5">과팅</p>
            </div>
            <span className="text-4xl drop-shadow transition-all duration-300 group-hover:scale-125 group-hover:rotate-12 group-hover:-translate-y-1 group-hover:drop-shadow-lg">🎉</span>
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

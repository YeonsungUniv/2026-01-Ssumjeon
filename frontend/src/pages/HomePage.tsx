import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useChatStore } from '@/store/chatStore'

export default function HomePage() {
  const { user } = useAuthStore()
  const { rooms } = useChatStore()
  const totalUnread = rooms.reduce((acc, r) => acc + r.unreadCount, 0)

  return (
    <div className="space-y-6">

      {/* 환영 배너 */}
      <div className="bg-gradient-to-r from-pink-100 to-purple-100 rounded-3xl p-10 flex items-center justify-between">
        <div>
          <p className="text-base text-pink-400">안녕하세요,</p>
          <p className="text-4xl font-bold mt-1 text-gray-700">{user?.nickname ?? ''}님 👋</p>
          {(user?.department || user?.grade) && (
            <p className="text-sm text-purple-400 mt-2">
              {user?.department}{user?.grade ? ` · ${user.grade}학년` : ''}
            </p>
          )}
        </div>
        <p className="text-7xl hidden lg:block">💘</p>
      </div>

      {/* 빠른 메뉴 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { to: '/matching',       emoji: '💘', label: '1:1 매칭',  desc: '마음에 드는 상대에게 좋아요', bg: 'from-rose-100 to-pink-100',    text: 'text-rose-500',   sub: 'text-rose-400' },
          { to: '/group-matching', emoji: '🎉', label: '과팅 매칭', desc: '팀을 만들어 함께 만나요',      bg: 'from-violet-100 to-purple-100', text: 'text-violet-500', sub: 'text-violet-400' },
          { to: '/chat',           emoji: '💬', label: '채팅',      desc: '매칭된 상대와 대화해요',       bg: 'from-sky-100 to-blue-100',      text: 'text-sky-500',    sub: 'text-sky-400',   badge: totalUnread },
        ].map(({ to, emoji, label, desc, bg, text, sub, badge }) => (
          <Link
            key={to}
            to={to}
            className={`bg-gradient-to-br ${bg} rounded-2xl p-6 hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col items-center gap-3 py-10 relative`}
          >
            <span className="text-5xl">{emoji}</span>
            <div className="text-center">
              <p className={`font-bold ${text}`}>{label}</p>
              <p className={`text-xs mt-1 ${sub}`}>{desc}</p>
            </div>
            {!!badge && (
              <span className="absolute top-3 right-3 min-w-[20px] h-5 px-1 text-xs font-bold text-white bg-rose-400 rounded-full flex items-center justify-center">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </Link>
        ))}

        {/* 내 프로필 카드 */}
        <Link
          to="/profile"
          className="bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl p-6 hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col items-center gap-3 py-10 relative"
        >
          <div className="w-14 h-14 rounded-full bg-white ring-4 ring-emerald-200 overflow-hidden flex items-center justify-center">
            {user?.profileImage
              ? <img src={user.profileImage} alt="프로필" className="w-full h-full object-cover" />
              : <span className="text-3xl">{user?.gender === 'male' ? '🧑' : '👩'}</span>
            }
          </div>
          <div className="text-center">
            <p className="font-bold text-emerald-500">내 프로필</p>
            <p className="text-xs text-emerald-400 mt-1">프로필을 꾸며보세요</p>
          </div>
        </Link>
      </div>

      {/* 하단 2분할 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* 최근 채팅 */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-gray-700">최근 채팅</p>
            <Link to="/chat" className="text-xs text-primary-500 hover:underline">전체 보기</Link>
          </div>
          {rooms.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              <p className="text-2xl mb-1">💬</p>
              <p className="text-xs">아직 채팅이 없어요</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rooms.slice(0, 4).map((room) => (
                <Link
                  key={room.id}
                  to={`/chat/${room.id}`}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary-500">
                      {room.type === 'individual' ? (room.partner?.nickname?.[0] ?? '?') : '👥'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {room.type === 'individual' ? room.partner?.nickname : room.groupName}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{room.lastMessage ?? '대화를 시작해보세요'}</p>
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

        {/* 이용 안내 */}
        <div className="card bg-amber-50 border-amber-100 space-y-3">
          <p className="text-sm font-bold text-amber-700">💡 이용 안내</p>
          <ul className="text-sm text-amber-600 space-y-2">
            {[
              '연성대학교 재학생만 이용 가능합니다',
              '매너 있는 대화 문화를 지켜주세요',
              '상대방의 개인정보를 무단 공유하지 마세요',
            ].map((text) => (
              <li key={text} className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0">•</span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
          <div className="pt-2 border-t border-amber-200">
            <Link to="/support" className="text-sm text-amber-700 font-semibold hover:underline">
              문의하기 →
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}

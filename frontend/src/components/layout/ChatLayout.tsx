import { Link, Outlet, useParams } from 'react-router-dom'
import { useChatStore } from '@/store/chatStore'
import { useEffect } from 'react'
import { chatApi } from '@/api/chat'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/ko'

dayjs.extend(relativeTime)
dayjs.locale('ko')

export default function ChatLayout() {
  const { roomId } = useParams<{ roomId?: string }>()
  const { rooms, setRooms } = useChatStore()

  useEffect(() => {
    chatApi.getRooms().then((res) => setRooms(res.data))
  }, [setRooms])

  // 채팅방(개별 대화) 진입 시 — 대화 화면만 풀스크린
  if (roomId) return <Outlet />

  // 채팅 목록 (모바일 단일 컬럼)
  return (
    <div className="h-full flex flex-col bg-cream">
      <div className="px-5 pt-5 pb-3 shrink-0">
        <h2 className="text-xl font-bold text-gray-900">채팅</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400 py-12">
            <span className="text-4xl">💬</span>
            <p className="text-sm font-medium">아직 채팅이 없어요</p>
            <p className="text-xs">매칭 후 채팅을 시작해보세요</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {rooms.map((room) => (
              <Link
                key={room.id}
                to={`/chat/${room.id}`}
                className="flex items-center gap-3 px-3 py-3 rounded-2xl bg-white hover:bg-gray-50 transition-colors shadow-[0_2px_10px_-8px_rgba(0,0,0,0.25)]"
              >
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center shrink-0 overflow-hidden">
                  {room.type === 'individual' && room.partner?.profileImage ? (
                    <img src={room.partner.profileImage} alt={room.partner.nickname} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-bold text-primary-400">
                      {room.type === 'individual' ? (room.partner?.nickname?.[0] ?? '?') : '👥'}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline gap-1">
                    <p className="font-semibold truncate text-sm text-gray-800">
                      {room.type === 'individual' ? room.partner?.nickname : room.groupName}
                    </p>
                    <span className="text-[10px] text-gray-400 shrink-0">
                      {room.lastMessageAt ? dayjs(room.lastMessageAt).fromNow() : ''}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {room.lastMessage ?? '대화를 시작해보세요'}
                  </p>
                </div>
                {room.unreadCount > 0 && (
                  <span className="shrink-0 min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-primary-500 rounded-full flex items-center justify-center">
                    {room.unreadCount > 99 ? '99+' : room.unreadCount}
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

import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { chatApi } from '@/api/chat'
import { useChatStore } from '@/store/chatStore'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/ko'

dayjs.extend(relativeTime)
dayjs.locale('ko')

export default function ChatListPage() {
  const { rooms, setRooms } = useChatStore()

  useEffect(() => {
    chatApi.getRooms().then((res) => setRooms(res.data))
  }, [setRooms])

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800 pt-2">채팅</h2>

      {rooms.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">💬</p>
          <p className="text-gray-500 font-medium">아직 채팅이 없어요</p>
          <p className="text-sm text-gray-400 mt-1">매칭 후 채팅을 시작해보세요!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rooms.map((room) => (
            <Link
              key={room.id}
              to={`/chat/${room.id}`}
              className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                <span className="text-primary-500 font-bold">
                  {room.type === 'individual' ? (room.partner?.nickname?.[0] ?? '?') : '👥'}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <p className="font-semibold text-gray-800 truncate">
                    {room.type === 'individual' ? room.partner?.nickname : room.groupName}
                  </p>
                  <span className="text-xs text-gray-400 shrink-0 ml-2">
                    {room.lastMessageAt ? dayjs(room.lastMessageAt).fromNow() : ''}
                  </span>
                </div>
                <p className="text-sm text-gray-400 truncate mt-0.5">
                  {room.lastMessage?.startsWith('/uploads/chat/') ? '📷 사진' : (room.lastMessage ?? '대화를 시작해보세요')}
                </p>
              </div>

              {room.unreadCount > 0 && (
                <span className="shrink-0 min-w-[20px] h-5 px-1 text-xs font-bold text-white bg-primary-500 rounded-full flex items-center justify-center">
                  {room.unreadCount}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

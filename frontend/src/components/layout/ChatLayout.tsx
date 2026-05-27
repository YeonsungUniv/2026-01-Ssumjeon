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

  return (
    <div className="flex h-screen">
      {/* 좌측 채팅방 목록 */}
      <div className="w-80 shrink-0 border-r border-gray-100 bg-white flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">채팅</h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          {rooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400 py-12">
              <span className="text-4xl">💬</span>
              <p className="text-sm font-medium">아직 채팅이 없어요</p>
              <p className="text-xs">매칭 후 채팅을 시작해보세요</p>
            </div>
          ) : (
            <div className="py-2">
              {rooms.map((room) => {
                const isActive = room.id === roomId
                return (
                  <Link
                    key={room.id}
                    to={`/chat/${room.id}`}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                      isActive ? 'bg-primary-50 border-r-2 border-primary-500' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                      <span className={`font-bold text-sm ${isActive ? 'text-primary-600' : 'text-primary-400'}`}>
                        {room.type === 'individual' ? (room.partner?.nickname?.[0] ?? '?') : '👥'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline gap-1">
                        <p className={`font-semibold truncate text-sm ${isActive ? 'text-primary-700' : 'text-gray-800'}`}>
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
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* 우측 채팅방 또는 빈 상태 */}
      <div className="flex-1 min-w-0">
        {roomId ? (
          <Outlet />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
            <span className="text-5xl">💬</span>
            <p className="text-base font-medium">대화를 선택해주세요</p>
            <p className="text-sm">왼쪽 목록에서 채팅방을 선택하면 대화가 시작됩니다</p>
          </div>
        )}
      </div>
    </div>
  )
}

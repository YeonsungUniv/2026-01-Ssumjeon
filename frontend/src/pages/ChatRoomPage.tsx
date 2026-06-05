import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { chatApi } from '@/api/chat'
import { useChatStore } from '@/store/chatStore'
import { useAuthStore } from '@/store/authStore'
import { getSocket } from '@/hooks/useSocket'
import ProfileSheet from '@/components/ProfileSheet'
import ChatRoomSettingsSheet from '@/components/ChatRoomSettingsSheet'
import AppointmentCard from '@/components/AppointmentCard'
import AppointmentSheet from '@/components/AppointmentSheet'
import EmojiPicker from '@/components/EmojiPicker'
import { appointmentApi } from '@/api/appointment'
import type { Appointment } from '@/types'
import dayjs from 'dayjs'
import 'dayjs/locale/ko'
dayjs.locale('ko')

const isImageContent = (content: string) =>
  content.startsWith('blob:') || content.includes('amazonaws.com')

const isExpiredImage = (content: string) => content === '[expired_image]'

export default function ChatRoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { messages, setMessages, prependMessages, appendMessage, replaceMessage, removeMessage, markRoomAsRead, markRoomMessagesRead, setActiveRoom, removeRoom, rooms } = useChatStore()
  const [input, setInput] = useState('')
  const [showProfile, setShowProfile] = useState(false)
  const [profileUserId, setProfileUserId] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showAppointment, setShowAppointment] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
  const [showEmoji, setShowEmoji] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const suppressScrollRef = useRef(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const roomMessages = messages[roomId!] ?? []
  const room = rooms.find((r) => r.id === roomId)

  useEffect(() => {
    if (!roomId) return
    setActiveRoom(roomId)
    setPage(1)
    chatApi.getMessages(roomId, 1).then((res) => {
      setMessages(roomId, res.data.items)
      setHasMore(res.data.hasMore)
    })
    chatApi.markAsRead(roomId)
    markRoomAsRead(roomId)
    appointmentApi.getByRoom(roomId).then((res) => setAppointments(res.data))

    const socket = getSocket()
    socket?.emit('room:join', roomId)

    const onNewAppt = (a: Appointment) => setAppointments((prev) => [a, ...prev])
    const onUpdatedAppt = (a: Appointment) => setAppointments((prev) => prev.map((p) => p.id === a.id ? a : p))
    const onMessagesRead = ({ userId }: { userId: string }) => markRoomMessagesRead(roomId, userId)
    socket?.on('appointment:new', onNewAppt)
    socket?.on('appointment:updated', onUpdatedAppt)
    socket?.on('messages:read', onMessagesRead)

    return () => {
      socket?.emit('room:leave', roomId)
      socket?.off('appointment:new', onNewAppt)
      socket?.off('appointment:updated', onUpdatedAppt)
      socket?.off('messages:read', onMessagesRead)
      setActiveRoom(null)
    }
  }, [roomId, setMessages, markRoomAsRead, markRoomMessagesRead, setActiveRoom])

  const loadMore = async () => {
    if (!roomId || loadingMore || !hasMore) return
    setLoadingMore(true)
    const container = scrollRef.current
    const prevHeight = container?.scrollHeight ?? 0
    const nextPage = page + 1
    const res = await chatApi.getMessages(roomId, nextPage)
    suppressScrollRef.current = true
    prependMessages(roomId, res.data.items)
    setHasMore(res.data.hasMore)
    setPage(nextPage)
    setLoadingMore(false)
    requestAnimationFrame(() => {
      if (container) container.scrollTop = container.scrollHeight - prevHeight
    })
  }

  useEffect(() => {
    if (suppressScrollRef.current) {
      suppressScrollRef.current = false
      return
    }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [roomMessages])

  const adjustTextarea = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  const send = async () => {
    if (!input.trim() || !roomId || !user) return
    const content = input.trim()
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    const optimistic = {
      id: `optimistic-${Date.now()}`,
      roomId,
      senderId: user.id,
      senderNickname: user.nickname,
      content,
      createdAt: new Date().toISOString(),
      isRead: false,
    }
    appendMessage(roomId, optimistic)

    try {
      const res = await chatApi.sendMessage(roomId, content)
      replaceMessage(roomId, optimistic.id, res.data)
    } catch {
      removeMessage(roomId, optimistic.id)
      setInput(content)
    }
  }

  const sendImageFile = async (file: File) => {
    if (!roomId || !user) return
    const blobUrl = URL.createObjectURL(file)
    const optimistic = {
      id: `optimistic-${Date.now()}`,
      roomId,
      senderId: user.id,
      senderNickname: user.nickname,
      content: blobUrl,
      createdAt: new Date().toISOString(),
      isRead: false,
    }
    appendMessage(roomId, optimistic)
    try {
      const res = await chatApi.sendImage(roomId, file)
      URL.revokeObjectURL(blobUrl)
      replaceMessage(roomId, optimistic.id, res.data)
    } catch {
      URL.revokeObjectURL(blobUrl)
      removeMessage(roomId, optimistic.id)
    }
  }

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) sendImageFile(file)
    e.target.value = ''
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const handleLeave = async () => {
    if (!roomId) return
    await chatApi.leaveRoom(roomId)
    removeRoom(roomId)
    navigate('/chat', { replace: true })
  }

  const handleBlock = async () => {
    if (!roomId || !room?.partner?.id) return
    await chatApi.blockUser(room.partner.id)
    removeRoom(roomId)
    navigate('/chat', { replace: true })
  }

  const openProfile = (userId: string) => {
    setProfileUserId(userId)
    setShowProfile(true)
  }

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 shrink-0">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          className="flex items-center gap-2 flex-1 text-left"
          onClick={() => room?.type === 'individual' && room.partner?.id && openProfile(room.partner.id)}
        >
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-primary-500">
              {room?.type === 'individual' ? (room.partner?.nickname?.[0] ?? '?') : '👥'}
            </span>
          </div>
          <div>
            <p className="font-bold text-gray-800 leading-tight">
              {room?.type === 'individual' ? room.partner?.nickname : room?.groupName ?? '채팅방'}
            </p>
            {room?.type === 'individual' && (
              <p className="text-[10px] text-gray-400">프로필 보기</p>
            )}
          </div>
        </button>

        {/* 설정 버튼 */}
        <button onClick={() => setShowSettings(true)} className="text-gray-400 hover:text-gray-600 p-1 shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* 약속 배너 (확정 또는 대기 중인 약속) */}
      {appointments.filter((a) => a.status !== 'cancelled').slice(0, 1).map((a) => (
        <div key={a.id} className={`px-4 py-2 text-xs flex items-center gap-2 border-b ${a.status === 'confirmed' ? 'bg-green-50 border-green-100' : 'bg-yellow-50 border-yellow-100'}`}>
          <span>📅</span>
          <span className={`font-semibold ${a.status === 'confirmed' ? 'text-green-700' : 'text-yellow-700'}`}>
            {a.status === 'confirmed' ? '확정된 약속' : '약속 대기 중'}:
          </span>
          <span className="text-gray-600">{dayjs(a.date).format('M/D(ddd)')} {a.time} · {a.location}</span>
        </div>
      ))}

      {/* 메시지 목록 */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50"
        onScroll={(e) => { if (e.currentTarget.scrollTop === 0) loadMore() }}
      >
        {loadingMore && (
          <div className="flex justify-center py-2">
            <div className="animate-spin w-5 h-5 border-2 border-primary-300 border-t-primary-500 rounded-full" />
          </div>
        )}
        {/* 약속 카드 목록 */}
        {appointments.map((a) => (
          <AppointmentCard
            key={a.id}
            appointment={a}
            myUserId={user?.id ?? ''}
            onUpdate={(updated) => setAppointments((prev) => prev.map((p) => p.id === updated.id ? updated : p))}
            onEdit={(appt) => setEditingAppointment(appt)}
          />
        ))}
        {appointments.length > 0 && <div className="border-t border-dashed border-gray-200 my-1" />}

        {roomMessages.map((msg) => {
          const isMe = msg.senderId === user?.id
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} gap-2`}>
              {!isMe && (
                <button
                  className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0 self-end mb-0.5"
                  onClick={() => openProfile(msg.senderId)}
                >
                  <span className="text-xs text-primary-500 font-bold">{msg.senderNickname[0]}</span>
                </button>
              )}

              {/* 버블 + 메타(시간·읽음) 가로 배치 — 내 메시지는 reverse */}
              <div className={`max-w-[70%] flex ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end gap-1.5`}>

                {/* 메시지 버블 */}
                <div className={`flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && <span className="text-xs text-gray-400 px-1">{msg.senderNickname}</span>}
                  <div className={`rounded-2xl overflow-hidden text-sm ${isMe ? 'bg-primary-500 text-white rounded-br-sm' : 'bg-white text-gray-800 rounded-bl-sm shadow-sm'}`}>
                    {isExpiredImage(msg.content) ? (
                      <span className="block px-4 py-2.5 text-xs opacity-60">🗑️ 이미지가 만료되었습니다</span>
                    ) : isImageContent(msg.content) ? (
                      <img
                        src={msg.content}
                        alt="사진"
                        className="max-w-[220px] max-h-[280px] object-cover cursor-pointer"
                        onClick={() => window.open(msg.content, '_blank')}
                      />
                    ) : (
                      <span className="block px-4 py-2.5">{msg.content}</span>
                    )}
                  </div>
                </div>

                {/* 읽음 "1" + 시간 — 버블 옆에 세로 배치 */}
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} shrink-0 gap-0.5 pb-0.5`}>
                  {isMe && !msg.isRead && (
                    <span className="text-[10px] text-primary-400 font-bold leading-none">1</span>
                  )}
                  <span className="text-[10px] text-gray-400 leading-none whitespace-nowrap">
                    {dayjs(msg.createdAt).format('HH:mm')}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div className="border-t border-gray-100 bg-white">
        <div className="flex gap-2 px-4 py-3">
          {/* 숨겨진 파일 입력 */}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />

          {/* 이모지 + 갤러리 + 카메라 버튼 영역 (상대적 위치) */}
          <div className="relative self-end">
            {showEmoji && (
              <EmojiPicker
                onSelect={(emoji) => { setInput((prev) => prev + emoji); setShowEmoji(false); textareaRef.current?.focus() }}
                onClose={() => setShowEmoji(false)}
              />
            )}
            <button
              onClick={() => setShowEmoji((v) => !v)}
              className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-xl hover:bg-gray-50"
              title="이모티콘"
            >
              😊
            </button>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center shrink-0 hover:bg-gray-50 self-end"
            title="갤러리"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>

{room?.type === 'individual' && (
            <button
              onClick={() => setShowAppointment(true)}
              className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center shrink-0 text-gray-400 hover:bg-gray-50 self-end"
              title="약속 잡기"
            >
              📅
            </button>
          )}

          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => { setInput(e.target.value); adjustTextarea(e.target) }}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요..."
            className="input-field flex-1 resize-none py-2.5 leading-5 overflow-y-auto"
            style={{ maxHeight: '120px' }}
          />
          <button
            onClick={send}
            disabled={!input.trim()}
            className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center shrink-0 hover:bg-primary-600 transition-colors disabled:opacity-40 self-end"
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* 약속 제안 시트 */}
      {showAppointment && roomId && (
        <AppointmentSheet
          roomId={roomId}
          onClose={() => setShowAppointment(false)}
          onProposed={(a) => setAppointments((prev) => [a, ...prev])}
        />
      )}

      {/* 약속 수정 시트 */}
      {editingAppointment && roomId && (
        <AppointmentSheet
          roomId={roomId}
          editAppointment={editingAppointment}
          onClose={() => setEditingAppointment(null)}
          onProposed={(updated) => {
            setAppointments((prev) => prev.map((p) => p.id === updated.id ? updated : p))
            setEditingAppointment(null)
          }}
        />
      )}

      {/* 설정 시트 */}
      {showSettings && roomId && (
        <ChatRoomSettingsSheet
          roomId={roomId}
          onClose={() => setShowSettings(false)}
          onLeave={handleLeave}
          onViewProfile={(userId) => { setShowSettings(false); openProfile(userId) }}
        />
      )}

      {/* 프로필 시트 */}
      {showProfile && profileUserId && (
        <ProfileSheet
          userId={profileUserId}
          onClose={() => { setShowProfile(false); setProfileUserId(null) }}
          onBlock={room?.type === 'individual' && profileUserId === room?.partner?.id ? handleBlock : undefined}
        />
      )}
    </div>
  )
}

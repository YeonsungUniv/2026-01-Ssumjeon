import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { chatApi } from '@/api/chat'
import { useChatStore } from '@/store/chatStore'
import { useAuthStore } from '@/store/authStore'
import { getSocket } from '@/hooks/useSocket'
import ProfileSheet from '@/components/ProfileSheet'
import ChatRoomSettingsSheet from '@/components/ChatRoomSettingsSheet'
import AppointmentCard, { isAppointmentExpired } from '@/components/AppointmentCard'
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

const isSystemMessage = (content: string) => content.startsWith('[system:')

// 약속 제안 마커 — 버블/타임라인에 표시하지 않음(카드가 대체). 알림/미리보기 용도
const isApptProposedMarker = (content: string) => content === '[appointment:proposed]'
// 약속 취소 마커 — 중앙 시스템 안내로 표시
const isApptCancelledMarker = (content: string) => content === '[appointment:cancelled]'

export default function ChatRoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { messages, setMessages, prependMessages, appendMessage, replaceMessage, removeMessage, markRoomAsRead, markRoomMessagesRead, setActiveRoom, removeRoom, markRoomAsBlocked, markRoomAsUnblocked, rooms } = useChatStore()
  const [input, setInput] = useState('')
  const [showProfile, setShowProfile] = useState(false)
  const [profileUserId, setProfileUserId] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showAppointment, setShowAppointment] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
  const [showEmoji, setShowEmoji] = useState(false)
  // 내가 지운 약속 카드(로컬 전용 — 상대에겐 영향 없음), localStorage에 영구 저장
  const [dismissedAppts, setDismissedAppts] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('dismissed-appts') ?? '[]')) } catch { return new Set() }
  })
  const dismissAppt = (id: string) => {
    setDismissedAppts((prev) => {
      const next = new Set(prev).add(id)
      localStorage.setItem('dismissed-appts', JSON.stringify([...next]))
      return next
    })
  }
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

  // 메시지 + 약속을 하나의 타임라인으로 병합 (약속은 수정·취소 시각 기준 → 변경 시 맨 아래로)
  type TimelineItem =
    | { kind: 'message'; ts: number; data: typeof roomMessages[number] }
    | { kind: 'appointment'; ts: number; data: Appointment }
  const timeline: TimelineItem[] = [
    ...roomMessages
      .filter((m) => !isApptProposedMarker(m.content))
      .map((m) => ({ kind: 'message' as const, ts: new Date(m.createdAt).getTime(), data: m })),
    ...appointments
      .filter((a) => !dismissedAppts.has(a.id))
      .map((a) => ({
        kind: 'appointment' as const,
        ts: new Date(a.updatedAt ?? a.createdAt).getTime(),
        data: a,
      })),
  ].sort((x, y) => x.ts - y.ts)

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

  // 약속 만료를 실시간 반영하기 위해 1분마다 리렌더
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

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

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items)
    const imageItem = items.find((item) => item.type.startsWith('image/'))
    if (!imageItem) return
    e.preventDefault()
    const file = imageItem.getAsFile()
    if (file) sendImageFile(file)
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
    markRoomAsBlocked(roomId)
    setShowProfile(false)
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
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0 overflow-hidden">
            {room?.type === 'individual' && room.partner?.profileImage ? (
              <img src={room.partner.profileImage} alt={room.partner.nickname} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-primary-500">
                {room?.type === 'individual' ? (room.partner?.nickname?.[0] ?? '?') : '👥'}
              </span>
            )}
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

      {/* 약속 공지 배너 (상단 고정 — 확정/대기 중인 약속 요약, 만료 제외) */}
      {appointments.filter((a) => a.status !== 'cancelled' && !isAppointmentExpired(a)).slice(0, 1).map((a) => (
        <div key={a.id} className={`px-4 py-2 text-xs flex items-center gap-2 border-b ${a.status === 'confirmed' ? 'bg-green-50 border-green-100' : 'bg-yellow-50 border-yellow-100'}`}>
          <span>📅</span>
          <span className={`font-semibold ${a.status === 'confirmed' ? 'text-green-700' : 'text-yellow-700'}`}>
            {a.status === 'confirmed' ? '확정된 약속' : '약속 대기 중'}:
          </span>
          <span className="text-gray-600 truncate">{dayjs(a.date).format('M/D(ddd)')} {a.time} · {a.location}</span>
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
        {timeline.map((item) => {
          if (item.kind === 'appointment') {
            const a = item.data
            return (
              <AppointmentCard
                key={`appt-${a.id}`}
                appointment={a}
                myUserId={user?.id ?? ''}
                onUpdate={(updated) => setAppointments((prev) => prev.map((p) => p.id === updated.id ? updated : p))}
                onEdit={(appt) => setEditingAppointment(appt)}
                onDismiss={() => dismissAppt(a.id)}
              />
            )
          }
          const msg = item.data
          // 시스템 메시지(상대방 나감 등)는 중앙 안내로 표시
          if (isSystemMessage(msg.content)) {
            return (
              <div key={msg.id} className="flex justify-center my-2">
                <span className="text-[11px] text-gray-400 bg-gray-200/60 px-3 py-1 rounded-full">
                  상대방이 채팅방을 나갔습니다
                </span>
              </div>
            )
          }
          // 약속 취소 안내 — 닫아둔 사람도 알 수 있도록 중앙 안내로 표시
          if (isApptCancelledMarker(msg.content)) {
            return (
              <div key={msg.id} className="flex justify-center my-2">
                <span className="text-[11px] text-gray-500 bg-gray-200/60 px-3 py-1 rounded-full">
                  📅 약속이 취소되었습니다
                </span>
              </div>
            )
          }
          const isMe = msg.senderId === user?.id
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} gap-2`}>
              {!isMe && (
                <button
                  className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0 self-end mb-0.5 overflow-hidden"
                  onClick={() => openProfile(msg.senderId)}
                >
                  {msg.senderProfileImage ? (
                    <img src={msg.senderProfileImage} alt={msg.senderNickname} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-primary-500 font-bold">{msg.senderNickname[0]}</span>
                  )}
                </button>
              )}

              {/* 버블 + 메타(시간·읽음) 가로 배치 — 내 메시지는 reverse */}
              <div className={`max-w-[70%] flex ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end gap-1.5`}>

                {/* 메시지 버블 */}
                <div className={`flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && <span className="text-xs text-gray-400 px-1">{msg.senderNickname}</span>}
                  {isExpiredImage(msg.content) ? (
                    <div className={`rounded-2xl overflow-hidden text-sm ${isMe ? 'bg-primary-500 text-white rounded-br-sm' : 'bg-white text-gray-800 rounded-bl-sm shadow-sm'}`}>
                      <span className="block px-4 py-2.5 text-xs opacity-60">🗑️ 이미지가 만료되었습니다</span>
                    </div>
                  ) : isImageContent(msg.content) ? (
                    <img
                      src={msg.content}
                      alt="사진"
                      className={`block max-w-[260px] max-h-[320px] object-contain cursor-pointer rounded-2xl shadow-sm ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                      onClick={() => window.open(msg.content, '_blank')}
                    />
                  ) : (
                    <div className={`rounded-2xl overflow-hidden text-sm ${isMe ? 'bg-primary-500 text-white rounded-br-sm' : 'bg-white text-gray-800 rounded-bl-sm shadow-sm'}`}>
                      <span className="block px-4 py-2.5">{msg.content}</span>
                    </div>
                  )}
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

      {/* 차단된 대화 배너 */}
      {room?.isBlocked && (
        <div className="bg-red-50 border-t border-red-100 px-4 py-3 text-center">
          <p className="text-xs text-red-500 font-semibold">차단한 상대방입니다.</p>
        </div>
      )}

      {/* 상대방이 나간 대화 배너 */}
      {!room?.isBlocked && room?.partnerLeft && (
        <div className="bg-gray-50 border-t border-gray-100 px-4 py-3 text-center">
          <p className="text-xs text-gray-500 font-semibold">상대방이 채팅방을 나가 더 이상 대화할 수 없습니다.</p>
        </div>
      )}

      {/* 입력창 */}
      <div className={`border-t border-gray-100 bg-white ${room?.isBlocked || room?.partnerLeft ? 'opacity-40 pointer-events-none' : ''}`}>
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
            onPaste={handlePaste}
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
          onUnblock={room?.type === 'individual' && profileUserId === room?.partner?.id ? () => {
            if (roomId) markRoomAsUnblocked(roomId)
          } : undefined}
        />
      )}
    </div>
  )
}

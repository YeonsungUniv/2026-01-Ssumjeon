import { useEffect, useState } from 'react'
import { chatApi, type RoomInfo, type RoomMember } from '@/api/chat'
import { useChatStore } from '@/store/chatStore'
import { useAuthStore } from '@/store/authStore'

interface Props {
  roomId: string
  onClose: () => void
  onLeave: () => void
  onViewProfile: (userId: string) => void
}

export default function ChatRoomSettingsSheet({ roomId, onClose, onLeave, onViewProfile }: Props) {
  const [info, setInfo] = useState<RoomInfo | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [confirm, setConfirm] = useState<'leave' | null>(null)
  const { mutedRooms, toggleMute, updateRoomName } = useChatStore()
  const { user } = useAuthStore()
  const isMuted = mutedRooms[roomId] ?? false

  useEffect(() => {
    chatApi.getRoomInfo(roomId).then((res) => {
      setInfo(res.data)
      if (res.data.name) setNameInput(res.data.name)
    })
  }, [roomId])

  const saveName = async () => {
    if (!nameInput.trim()) return
    await chatApi.updateRoomName(roomId, nameInput.trim())
    updateRoomName(roomId, nameInput.trim())
    setEditingName(false)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white rounded-t-3xl z-50 animate-slide-up max-h-[85dvh] flex flex-col">
        {/* 핸들 */}
        <div className="flex justify-center pt-3 pb-2 shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <p className="text-center font-bold text-gray-800 pb-3 shrink-0">채팅방 설정</p>

        <div className="overflow-y-auto flex-1 pb-8">
          {!info ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="px-5 space-y-3">

              {/* 1:1 - 상대방 프로필 */}
              {info.type === 'individual' && info.partner && (
                <Section title="상대방">
                  <button
                    className="flex items-center gap-3 w-full py-1"
                    onClick={() => { onClose(); onViewProfile(info.partner!.userId) }}
                  >
                    <Avatar name={info.partner.nickname} />
                    <div className="text-left">
                      <p className="font-semibold text-gray-800">{info.partner.nickname}</p>
                      <p className="text-xs text-gray-400">{info.partner.department} · {info.partner.grade}학년</p>
                    </div>
                    <svg className="w-4 h-4 text-gray-300 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </Section>
              )}

              {/* 그룹 - 채팅방 이름 */}
              {info.type === 'group' && (
                <Section title="채팅방 이름">
                  {info.isLeader ? (
                    editingName ? (
                      <div className="flex gap-2">
                        <input
                          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400"
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveName()}
                          autoFocus
                        />
                        <button onClick={saveName} className="px-3 py-2 bg-primary-500 text-white text-sm rounded-xl">저장</button>
                        <button onClick={() => setEditingName(false)} className="px-3 py-2 text-gray-400 text-sm">취소</button>
                      </div>
                    ) : (
                      <button className="flex items-center justify-between w-full py-1" onClick={() => setEditingName(true)}>
                        <span className="text-sm text-gray-800">{nameInput || '이름 없음'}</span>
                        <span className="text-xs text-primary-500">수정</span>
                      </button>
                    )
                  ) : (
                    <p className="text-sm text-gray-800 py-1">{info.name}</p>
                  )}
                </Section>
              )}

              {/* 그룹 - 멤버 목록 */}
              {info.type === 'group' && info.members && (
                <Section title={`멤버 ${info.members.length}명`}>
                  <div className="space-y-2">
                    {info.members.map((m: RoomMember) => (
                      <button
                        key={m.userId}
                        className="flex items-center gap-3 w-full py-1"
                        onClick={() => { onClose(); onViewProfile(m.userId) }}
                      >
                        <Avatar name={m.nickname} />
                        <div className="text-left">
                          <p className="font-medium text-sm text-gray-800 flex items-center gap-1">
                            {m.nickname}
                            {m.userId === user?.id
                              ? <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">나</span>
                              : m.isLeader && <span className="text-[10px] bg-primary-100 text-primary-500 px-1.5 py-0.5 rounded-full">방장</span>
                            }
                          </p>
                          <p className="text-xs text-gray-400">{m.department} · {m.grade}학년</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </Section>
              )}

              {/* 알림 설정 */}
              <button
                onClick={() => toggleMute(roomId)}
                className="w-full bg-gray-50 rounded-2xl px-4 py-3.5 flex items-center justify-between gap-4"
              >
                <span className="text-sm text-gray-700">알림</span>
                <div className={`relative w-11 h-6 rounded-full overflow-hidden transition-colors duration-200 shrink-0 ${isMuted ? 'bg-gray-200' : 'bg-primary-500'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200 ${isMuted ? 'left-0.5' : 'left-[22px]'}`} />
                </div>
              </button>

              {/* 위험 구역 */}
              <Section>
                <button
                  className="w-full py-3 text-sm text-gray-600 text-left"
                  onClick={() => setConfirm('leave')}
                >
                  대화방 나가기
                </button>
              </Section>
            </div>
          )}
        </div>
      </div>

      {/* 확인 다이얼로그 */}
      {confirm === 'leave' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xs shadow-xl">
            <p className="font-bold text-gray-900 text-center mb-2">대화방 나가기</p>
            <p className="text-sm text-gray-500 text-center mb-6">대화방을 나가면 목록에서 삭제됩니다.</p>
            <div className="flex gap-3">
              <button className="flex-1 py-2.5 rounded-2xl border border-gray-200 text-sm text-gray-600" onClick={() => setConfirm(null)}>취소</button>
              <button
                className="flex-1 py-2.5 rounded-2xl text-sm text-white bg-primary-500"
                onClick={() => { setConfirm(null); onLeave() }}
              >
                나가기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-50 rounded-2xl px-4 py-3">
      {title && <p className="text-xs text-gray-400 font-medium mb-2">{title}</p>}
      {children}
    </div>
  )
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
      <span className="text-sm font-bold text-primary-500">{name[0]}</span>
    </div>
  )
}

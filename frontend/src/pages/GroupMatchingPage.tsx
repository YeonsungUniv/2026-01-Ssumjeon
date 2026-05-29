import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { groupMatchingApi, type CreateRoomPayload } from '@/api/groupMatching'
import { userApi, type UserProfile } from '@/api/user'
import { chatApi } from '@/api/chat'
import { useChatStore } from '@/store/chatStore'
import type { GroupMatchingRoom, GroupMember } from '@/types'
import { useAuthStore } from '@/store/authStore'
import { useSocketInstance } from '@/hooks/useSocket'

const MBTI_LIST = [
  'INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP',
  'ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP',
]

function MemberAvatar({ member, size = 'md' }: { member: GroupMember; size?: 'sm' | 'md' }) {
  const sz = size === 'sm' ? 'w-7 h-7 text-sm' : 'w-10 h-10 text-base'
  if (member.profileImage) {
    return (
      <img
        src={member.profileImage}
        alt={member.nickname}
        className={`${sz} rounded-full object-cover shrink-0`}
      />
    )
  }
  return (
    <div className={`${sz} rounded-full bg-primary-100 flex items-center justify-center shrink-0 text-base`}>
      {member.isLeader ? '👑' : '😊'}
    </div>
  )
}

export default function GroupMatchingPage() {
  const { user } = useAuthStore()
  const { setRooms: setChatRooms } = useChatStore()
  const navigate = useNavigate()
  const socket = useSocketInstance()
  const [rooms, setRooms] = useState<GroupMatchingRoom[]>([])
  const [myRoom, setMyRoom] = useState<GroupMatchingRoom | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [createError, setCreateError] = useState('')
  const [confirm, setConfirm] = useState<'leave' | 'cancelMatch' | null>(null)
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all')
  const [form, setForm] = useState<CreateRoomPayload>({ title: '', maxMembers: 3, preferredGender: 'female', roomPassword: '', allowedGender: undefined })
  const [matchedBanner, setMatchedBanner] = useState(false)
  const [searchingBanner, setSearchingBanner] = useState(false)
  const [showJoinByCode, setShowJoinByCode] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joinCodeError, setJoinCodeError] = useState('')
  const [copied, setCopied] = useState(false)
  const [profileModal, setProfileModal] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [passwordJoinRoom, setPasswordJoinRoom] = useState<{ id: string; title: string } | null>(null)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      const [roomsRes, myRoomRes] = await Promise.all([
        groupMatchingApi.getRooms(),
        groupMatchingApi.getMyRoom(),
      ])
      setRooms(roomsRes.data)
      setMyRoom(myRoomRes.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (!socket) return
    const onGroupMatched = ({ chatRoomId }: { chatRoomId: string }) => {
      setSearchingBanner(true)
      chatApi.getRooms().then((res) => setChatRooms(res.data))
      setTimeout(() => {
        setSearchingBanner(false)
        setMatchedBanner(true)
        setTimeout(() => navigate(`/chat/${chatRoomId}`), 1500)
      }, 3000)
    }
    socket.on('group:matched', onGroupMatched)
    return () => { socket.off('group:matched', onGroupMatched) }
  }, [socket, navigate, setChatRooms])

  const handleViewProfile = async (userId: string) => {
    setProfileLoading(true)
    setProfileModal(null)
    try {
      const res = await userApi.getProfile(userId)
      setProfileModal(res.data)
    } finally {
      setProfileLoading(false)
    }
  }

  const createRoom = async () => {
    setCreateError('')
    if (!form.title.trim()) { setCreateError('방 제목을 입력해주세요.'); return }
    if (form.roomPassword && !/^\d{4}$/.test(form.roomPassword)) {
      setCreateError('비밀번호는 숫자 4자리여야 합니다.')
      return
    }
    try {
      const payload: CreateRoomPayload = {
        title: form.title,
        maxMembers: form.maxMembers,
        preferredGender: form.preferredGender,
        ...(form.roomPassword ? { roomPassword: form.roomPassword } : {}),
        ...(form.allowedGender ? { allowedGender: form.allowedGender } : {}),
      }
      await groupMatchingApi.createRoom(payload)
      setShowCreate(false)
      setForm({ title: '', maxMembers: 3, preferredGender: 'female', roomPassword: '', allowedGender: undefined })
      await loadData()
      chatApi.getRooms().then((res) => setChatRooms(res.data))
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : '방 생성에 실패했습니다.')
    }
  }

  const joinRoom = async (room: { id: string; hasPassword: boolean; title: string }) => {
    if (room.hasPassword) {
      setPasswordInput('')
      setPasswordError('')
      setPasswordJoinRoom({ id: room.id, title: room.title })
      return
    }
    try {
      await groupMatchingApi.joinRoom(room.id)
      await loadData()
      chatApi.getRooms().then((res) => setChatRooms(res.data))
    } catch (e) {
      alert(e instanceof Error ? e.message : '참여에 실패했습니다.')
    }
  }

  const handlePasswordJoin = async () => {
    if (!passwordJoinRoom) return
    setPasswordError('')
    if (!/^\d{4}$/.test(passwordInput)) { setPasswordError('숫자 4자리를 입력해주세요.'); return }
    try {
      await groupMatchingApi.joinRoom(passwordJoinRoom.id, passwordInput)
      setPasswordJoinRoom(null)
      await loadData()
      chatApi.getRooms().then((res) => setChatRooms(res.data))
    } catch (e) {
      setPasswordError(e instanceof Error ? e.message : '참여에 실패했습니다.')
    }
  }

  const handleJoinByCode = async () => {
    setJoinCodeError('')
    if (!joinCode.trim()) { setJoinCodeError('초대 코드를 입력해주세요.'); return }
    try {
      await groupMatchingApi.joinByCode(joinCode.trim())
      setShowJoinByCode(false)
      setJoinCode('')
      await loadData()
      chatApi.getRooms().then((res) => setChatRooms(res.data))
    } catch (e) {
      setJoinCodeError(e instanceof Error ? e.message : '참여에 실패했습니다.')
    }
  }

  const handleCopyCode = () => {
    if (!myRoom?.inviteCode) return
    navigator.clipboard.writeText(myRoom.inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const requestMatch = async (targetRoomId: string) => {
    if (!myRoom) return
    const res = await groupMatchingApi.requestMatch(myRoom.id, targetRoomId)
    if (res.data.matched) {
      alert('매칭 성공! 채팅방으로 이동합니다.')
      loadData()
    }
  }

  const isLeader = !!myRoom?.members.find((m) => m.userId === user?.id && m.isLeader)

  const handleConfirm = async () => {
    if (!myRoom) return
    if (confirm === 'leave') await groupMatchingApi.leaveRoom(myRoom.id)
    else if (confirm === 'cancelMatch') await groupMatchingApi.cancelMatch(myRoom.id)
    setConfirm(null)
    await loadData()
    chatApi.getRooms().then((res) => setChatRooms(res.data))
  }

  if (searchingBanner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
        <div className="relative w-44 h-44">
          <div className="absolute inset-0 rounded-full border-[6px] border-pink-200 animate-ping" />
          <div className="absolute inset-0 rounded-full border-[6px] border-pink-400 animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center text-6xl">🔍</div>
        </div>
        <div className="text-center space-y-2">
          <p className="text-2xl font-bold text-gray-800">팀을 찾았어요!</p>
          <p className="text-gray-400 animate-pulse">상대 팀 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (matchedBanner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-7xl animate-bounce">🎉</p>
        <p className="text-2xl font-bold text-gray-800">과팅 매칭 성공!</p>
        <p className="text-gray-400">채팅방으로 이동합니다...</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center pt-32">
        <div className="animate-spin w-8 h-8 border-4 border-primary-300 border-t-primary-500 rounded-full" />
      </div>
    )
  }

  const filteredRooms = rooms.filter((r) => genderFilter === 'all' || r.gender === genderFilter)

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">과팅 매칭</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* 좌측: 내 방 + 방 만들기 */}
        <div className="space-y-4">

          {myRoom ? (
            <div className="card border-primary-200 bg-primary-50 space-y-4">
              <div>
                <p className="text-xs font-semibold text-primary-500 mb-1">내가 속한 방</p>
                <h3 className="font-bold text-gray-800 text-base">{myRoom.title}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {myRoom.members.length}/{myRoom.maxMembers}명 ·{' '}
                  <span className={myRoom.status === 'matched' ? 'text-green-600 font-semibold' : 'text-primary-600'}>
                    {myRoom.status === 'waiting' ? '매칭 대기 중' : '매칭 완료 🎉'}
                  </span>
                </p>
              </div>

              {/* 초대 코드 */}
              {myRoom.status === 'waiting' && myRoom.inviteCode && (
                <div className="bg-white rounded-2xl border border-primary-100 px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">초대 코드</p>
                    <p className="font-mono font-bold text-lg tracking-widest text-primary-600">{myRoom.inviteCode}</p>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="text-xs px-3 py-1.5 rounded-xl bg-primary-100 text-primary-600 font-semibold hover:bg-primary-200 transition-colors shrink-0"
                  >
                    {copied ? '복사됨 ✓' : '복사'}
                  </button>
                </div>
              )}

              {/* 멤버 리스트 */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-400">멤버</p>
                {myRoom.members.map((m) => (
                  <button
                    key={m.userId}
                    onClick={() => handleViewProfile(m.userId)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-white border border-primary-100 hover:border-primary-300 hover:shadow-sm transition-all text-left"
                  >
                    <MemberAvatar member={m} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {m.nickname}
                        {m.isLeader && <span className="ml-1 text-xs text-yellow-500">👑</span>}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{m.department} · {m.grade}학년</p>
                    </div>
                    <span className="text-gray-300 text-xs shrink-0">›</span>
                  </button>
                ))}
              </div>

              {myRoom.chatRoomId && (
                <button
                  onClick={() => navigate(`/chat/${myRoom.chatRoomId}`)}
                  className="w-full py-2.5 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors"
                >
                  💬 팀 채팅
                </button>
              )}
              <div className="flex gap-2">
                {myRoom.status === 'matched' && isLeader && (
                  <button onClick={() => setConfirm('cancelMatch')} className="flex-1 py-2.5 rounded-xl border-2 border-red-300 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors">
                    매칭 취소
                  </button>
                )}
                {myRoom.status === 'waiting' && (
                  <button onClick={() => setConfirm('leave')} className="flex-1 py-2.5 rounded-xl border-2 border-gray-300 text-gray-500 text-sm font-semibold hover:bg-gray-50 transition-colors">
                    방 나가기
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="card flex flex-col items-center gap-4 py-8 text-center">
              <p className="text-4xl">🎉</p>
              <div>
                <p className="font-bold text-gray-800">아직 방이 없어요</p>
                <p className="text-sm text-gray-400 mt-1">방을 만들거나 코드로 참여해보세요</p>
              </div>
              <button onClick={() => setShowCreate(true)} className="btn-primary w-full">방 만들기</button>
              <button
                onClick={() => { setShowJoinByCode(true); setJoinCode(''); setJoinCodeError('') }}
                className="btn-outline w-full"
              >
                초대 코드로 참여
              </button>
            </div>
          )}

          {showCreate && (
            <div className="card border-secondary-200 space-y-4">
              <h3 className="font-bold text-gray-800">방 만들기</h3>
              <input
                className="input-field"
                placeholder="방 제목 (예: 컴소과 3학년 과팅해요!)"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <div>
                <p className="text-xs text-gray-400 mb-2">인원</p>
                <div className="flex gap-2">
                  {[2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setForm({ ...form, maxMembers: n })}
                      className={`flex-1 py-2 rounded-xl border-2 text-sm font-semibold transition ${
                        form.maxMembers === n ? 'border-primary-500 bg-primary-50 text-primary-600' : 'border-gray-200 text-gray-500'
                      }`}
                    >
                      {n}명
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-2">원하는 상대 성별</p>
                <div className="flex gap-2">
                  {(['male', 'female'] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setForm({ ...form, preferredGender: g })}
                      className={`flex-1 py-2 rounded-xl border-2 text-sm font-semibold transition ${
                        form.preferredGender === g ? 'border-secondary-500 bg-secondary-50 text-secondary-600' : 'border-gray-200 text-gray-500'
                      }`}
                    >
                      {g === 'male' ? '남성 팀' : '여성 팀'}
                    </button>
                  ))}
                </div>
              </div>
              {/* 참여 성별 제한 */}
              <div>
                <p className="text-xs text-gray-400 mb-2">참여 가능 성별</p>
                <div className="flex gap-2">
                  {([undefined, 'male', 'female'] as const).map((g) => (
                    <button
                      key={g ?? 'all'}
                      onClick={() => setForm({ ...form, allowedGender: g })}
                      className={`flex-1 py-2 rounded-xl border-2 text-sm font-semibold transition ${
                        form.allowedGender === g ? 'border-primary-500 bg-primary-50 text-primary-600' : 'border-gray-200 text-gray-500'
                      }`}
                    >
                      {g === undefined ? '제한 없음' : g === 'male' ? '남성만' : '여성만'}
                    </button>
                  ))}
                </div>
              </div>
              {/* 비밀방 */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded accent-primary-500"
                    checked={!!form.roomPassword || form.roomPassword === ''}
                    onChange={(e) => setForm({ ...form, roomPassword: e.target.checked ? '' : undefined })}
                  />
                  <span className="text-xs text-gray-600 font-medium">🔒 비밀방</span>
                </label>
                {form.roomPassword !== undefined && (
                  <input
                    className="input-field font-mono text-center tracking-widest"
                    placeholder="숫자 4자리 입력해주세요"
                    maxLength={4}
                    inputMode="numeric"
                    value={form.roomPassword}
                    onChange={(e) => setForm({ ...form, roomPassword: e.target.value.replace(/\D/g, '') })}
                    autoFocus
                  />
                )}
              </div>
              {createError && <p className="text-sm text-red-500 text-center">{createError}</p>}
              <div className="flex gap-2">
                <button onClick={() => setShowCreate(false)} className="btn-outline flex-1">취소</button>
                <button onClick={createRoom} className="btn-primary flex-1">만들기</button>
              </div>
            </div>
          )}
        </div>

        {/* 우측: 방 목록 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex bg-gray-100 rounded-2xl p-1 gap-1">
            {([['all', '전체'], ['male', '남성팀'], ['female', '여성팀']] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setGenderFilter(val)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${genderFilter === val ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {filteredRooms.length === 0 ? (
            <div className="card text-center py-16">
              <p className="text-4xl mb-3">🏠</p>
              <p className="text-gray-500 font-medium">아직 과팅 방이 없어요</p>
              <p className="text-sm text-gray-400 mt-1">첫 번째로 방을 만들어보세요!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {filteredRooms.map((room) => {
                const isSameGender = room.gender === user?.gender
                const genderBlocked = room.allowedGender && room.allowedGender !== user?.gender
                const canJoin = !myRoom && !isSameGender && !genderBlocked
                const canMatch = myRoom && myRoom.id !== room.id && myRoom.gender !== room.gender && myRoom.status === 'waiting'
                return (
                  <div key={room.id} className="card hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${room.gender === 'male' ? 'bg-blue-50 text-blue-500' : 'bg-pink-50 text-pink-500'}`}>
                            {room.gender === 'male' ? '남성팀' : '여성팀'}
                          </span>
                          <span className="text-xs text-gray-400">{room.members.length}/{room.maxMembers}명</span>
                          {room.hasPassword && (
                            <span className="text-xs bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded-full flex items-center gap-0.5">🔒 비밀방</span>
                          )}
                          {room.allowedGender && (
                            <span className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full">
                              {room.allowedGender === 'male' ? '남성만' : '여성만'}
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-gray-800">{room.title}</h3>
                      </div>
                      <div className="shrink-0">
                        {canJoin && (
                          <button onClick={() => joinRoom(room)} className="btn-primary text-sm px-4 py-2">
                            {room.hasPassword ? '🔒 참여' : '참여'}
                          </button>
                        )}
                        {canMatch && (
                          <button onClick={() => requestMatch(room.id)} className="btn-secondary text-sm px-4 py-2">과팅 신청</button>
                        )}
                        {!canJoin && !canMatch && !myRoom && (
                          <span className="text-xs text-gray-300">
                            {genderBlocked ? '입장 불가' : '같은 성별'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {room.members.map((m) => (
                        <span key={m.userId} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                          {m.nickname}{m.isLeader ? ' 👑' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>

      {/* 프로필 모달 */}
      {(profileLoading || profileModal) && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6"
          onClick={() => { if (!profileLoading) setProfileModal(null) }}
        >
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {profileLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin w-8 h-8 border-4 border-primary-300 border-t-primary-500 rounded-full" />
              </div>
            ) : profileModal && (
              <>
                {/* 헤더 배경 */}
                <div className={`h-24 ${profileModal.gender === 'male' ? 'bg-gradient-to-br from-blue-100 to-indigo-100' : 'bg-gradient-to-br from-pink-100 to-purple-100'}`} />
                <div className="px-6 pb-6 -mt-12">
                  {/* 아바타 */}
                  <div className="mb-4">
                    {profileModal.profileImage ? (
                      <img
                        src={profileModal.profileImage}
                        alt={profileModal.nickname}
                        className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-white border-4 border-white shadow-md flex items-center justify-center text-3xl">
                        {profileModal.gender === 'male' ? '👦' : '👧'}
                      </div>
                    )}
                  </div>

                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{profileModal.nickname}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">{profileModal.department} · {profileModal.grade}학년</p>
                    </div>
                    {profileModal.mbti && MBTI_LIST.includes(profileModal.mbti) && (
                      <span className="px-3 py-1 rounded-full bg-primary-100 text-primary-600 text-sm font-bold shrink-0">
                        {profileModal.mbti}
                      </span>
                    )}
                  </div>

                  {profileModal.bio && (
                    <div className="mb-4 p-3 rounded-2xl bg-gray-50">
                      <p className="text-sm text-gray-600 leading-relaxed">{profileModal.bio}</p>
                    </div>
                  )}

                  {profileModal.interests && profileModal.interests.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-400 mb-2">관심사</p>
                      <div className="flex flex-wrap gap-1.5">
                        {profileModal.interests.map((i) => (
                          <span key={i} className="px-3 py-1 bg-secondary-50 text-secondary-600 rounded-full text-xs font-medium">
                            {i}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setProfileModal(null)}
                    className="w-full py-3 rounded-2xl bg-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-200 transition-colors"
                  >
                    닫기
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 초대 코드 참여 모달 */}
      {showJoinByCode && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-lg">초대 코드 입력</h3>
              <button onClick={() => setShowJoinByCode(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <p className="text-sm text-gray-500">방장에게 받은 6자리 초대 코드를 입력하세요.</p>
            <input
              className="input-field font-mono text-center text-xl tracking-widest uppercase"
              placeholder="XXXXXX"
              maxLength={6}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              autoFocus
            />
            {joinCodeError && <p className="text-sm text-red-500 text-center">{joinCodeError}</p>}
            <div className="flex gap-2">
              <button onClick={() => setShowJoinByCode(false)} className="btn-outline flex-1">취소</button>
              <button onClick={handleJoinByCode} className="btn-primary flex-1">참여</button>
            </div>
          </div>
        </div>
      )}

      {/* 비밀방 비밀번호 입력 모달 */}
      {passwordJoinRoom && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-lg">🔒 비밀방</h3>
              <button onClick={() => setPasswordJoinRoom(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-gray-700">"{passwordJoinRoom.title}"</span> 방의 비밀번호 4자리를 입력하세요.
            </p>
            <input
              className="input-field font-mono text-center text-2xl tracking-widest"
              placeholder="0000"
              maxLength={4}
              inputMode="numeric"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordJoin()}
              autoFocus
            />
            {passwordError && <p className="text-sm text-red-500 text-center">{passwordError}</p>}
            <div className="flex gap-2">
              <button onClick={() => setPasswordJoinRoom(null)} className="btn-outline flex-1">취소</button>
              <button onClick={handlePasswordJoin} className="btn-primary flex-1">입장</button>
            </div>
          </div>
        </div>
      )}

      {/* 확인 다이얼로그 */}
      {confirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
            <p className="font-bold text-gray-900 text-center mb-2 text-lg">
              {confirm === 'leave' ? '방 나가기' : '매칭 취소'}
            </p>
            <p className="text-sm text-gray-500 text-center mb-6">
              {confirm === 'leave' && isLeader && myRoom && myRoom.members.length > 1
                ? '방장이 나가면 다음 멤버에게 방장이 위임됩니다.'
                : confirm === 'leave'
                ? '방에서 나가시겠어요?'
                : '매칭을 취소하면 그룹 채팅방이 삭제되고 대기 상태로 돌아갑니다.'}
            </p>
            <div className="flex gap-3">
              <button className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50" onClick={() => setConfirm(null)}>
                취소
              </button>
              <button
                className="flex-1 py-3 rounded-2xl text-sm text-white font-semibold bg-gray-500 hover:bg-gray-600"
                onClick={handleConfirm}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

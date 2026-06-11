import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { groupMatchingApi, type CreateRoomPayload, type GroupMatchRequests } from '@/api/groupMatching'
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

const ROOMS_PER_PAGE = 10

// 남/여 팀이 한쪽 열로 몰리지 않도록 섞기 (Fisher-Yates)
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

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
  const [form, setForm] = useState<CreateRoomPayload>({ title: '', maxMembers: 3, preferredGender: undefined, isPrivate: false, allowedGender: undefined })
  const [matchedBanner, setMatchedBanner] = useState(false)
  const [searchingBanner, setSearchingBanner] = useState(false)
  const [showJoinByCode, setShowJoinByCode] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joinCodeError, setJoinCodeError] = useState('')
  const [copied, setCopied] = useState(false)
  const [profileModal, setProfileModal] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [page, setPage] = useState(0)
  const [matchReqs, setMatchReqs] = useState<GroupMatchRequests>({ incoming: [], outgoing: [] })
  const [respondingId, setRespondingId] = useState<string | null>(null)

  // 필터/목록이 바뀌면 페이지를 섞어 1페이지부터 다시 표시
  const filteredRooms = useMemo(
    () => shuffle(rooms.filter((r) => genderFilter === 'all' || r.gender === genderFilter)),
    [rooms, genderFilter],
  )
  useEffect(() => { setPage(0) }, [genderFilter, rooms])

  const loadData = async () => {
    setLoading(true)
    try {
      const [roomsRes, myRoomRes, reqRes] = await Promise.all([
        groupMatchingApi.getRooms(),
        groupMatchingApi.getMyRoom(),
        groupMatchingApi.getMatchRequests(),
      ])
      setRooms(roomsRes.data)
      setMyRoom(myRoomRes.data)
      setMatchReqs(reqRes.data)
    } finally {
      setLoading(false)
    }
  }

  const refreshRequests = () =>
    groupMatchingApi.getMatchRequests().then((res) => setMatchReqs(res.data)).catch(() => {})

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
    const onMatchRequest = () => refreshRequests()
    socket.on('group:matched', onGroupMatched)
    socket.on('group:matchRequest', onMatchRequest)
    return () => {
      socket.off('group:matched', onGroupMatched)
      socket.off('group:matchRequest', onMatchRequest)
    }
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
    try {
      await groupMatchingApi.createRoom(form)
      setShowCreate(false)
      setForm({ title: '', maxMembers: 3, preferredGender: undefined, isPrivate: false, allowedGender: undefined })
      await loadData()
      chatApi.getRooms().then((res) => setChatRooms(res.data))
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : '방 생성에 실패했습니다.')
    }
  }

  const joinRoom = async (roomId: string) => {
    try {
      await groupMatchingApi.joinRoom(roomId)
      await loadData()
      chatApi.getRooms().then((res) => setChatRooms(res.data))
    } catch (e) {
      alert(e instanceof Error ? e.message : '참여에 실패했습니다.')
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
    try {
      await groupMatchingApi.requestMatch(myRoom.id, targetRoomId)
      await refreshRequests()
      alert('과팅 신청을 보냈어요! 상대 팀장이 수락하면 매칭됩니다.')
    } catch (e) {
      alert(e instanceof Error ? e.message : '신청에 실패했습니다.')
    }
  }

  const respondMatch = async (requestId: string, accept: boolean) => {
    setRespondingId(requestId)
    try {
      const res = await groupMatchingApi.respondMatch(requestId, accept)
      if (res.data.accepted && res.data.chatRoomId) {
        alert('매칭 성공! 채팅방으로 이동합니다.')
        chatApi.getRooms().then((r) => setChatRooms(r.data))
        navigate(`/chat/${res.data.chatRoomId}`)
      } else {
        await loadData()
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : '처리에 실패했습니다.')
      await refreshRequests()
    } finally {
      setRespondingId(null)
    }
  }

  const cancelRequest = async (requestId: string) => {
    try {
      await groupMatchingApi.cancelMatchRequest(requestId)
      await refreshRequests()
    } catch (e) {
      alert(e instanceof Error ? e.message : '취소에 실패했습니다.')
    }
  }

  const outgoingRoomIds = new Set(matchReqs.outgoing.map((o) => o.toRoomId))

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

  const totalPages = Math.max(1, Math.ceil(filteredRooms.length / ROOMS_PER_PAGE))
  const safePage = Math.min(page, totalPages - 1)
  const pagedRooms = filteredRooms.slice(safePage * ROOMS_PER_PAGE, safePage * ROOMS_PER_PAGE + ROOMS_PER_PAGE)

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

              {/* 방 설정 요약 */}
              <div className="rounded-2xl bg-white/55 border border-white/60 px-4 py-3">
                <p className="text-xs font-semibold text-gray-400 mb-2">방 설정</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                  <span className="text-gray-400">팀 성별</span>
                  <span className="text-gray-700 font-medium text-right">{myRoom.gender === 'male' ? '남성팀' : '여성팀'}</span>
                  <span className="text-gray-400">최대 인원</span>
                  <span className="text-gray-700 font-medium text-right">{myRoom.maxMembers}명</span>
                  <span className="text-gray-400">참여 가능 성별</span>
                  <span className="text-gray-700 font-medium text-right">
                    {myRoom.allowedGender ? (myRoom.allowedGender === 'male' ? '남성만' : '여성만') : '제한 없음'}
                  </span>
                  <span className="text-gray-400">공개 여부</span>
                  <span className="text-gray-700 font-medium text-right">{myRoom.isPrivate ? '🔒 초대코드방' : '공개방'}</span>
                </div>
              </div>

              {/* 받은 과팅 신청 (팀장만 수락/거절) */}
              {isLeader && myRoom.status === 'waiting' && matchReqs.incoming.length > 0 && (
                <div className="rounded-2xl bg-rose-50/70 border border-rose-100 p-3 space-y-2">
                  <p className="text-xs font-bold text-rose-500">💌 받은 과팅 신청 {matchReqs.incoming.length}건</p>
                  {matchReqs.incoming.map((r) => (
                    <div key={r.requestId} className="bg-white/80 rounded-xl p-2.5">
                      <p className="text-sm font-semibold text-gray-800 truncate">{r.room.title}</p>
                      <p className="text-xs text-gray-400 mb-2">
                        {r.room.gender === 'male' ? '남성팀' : '여성팀'} · {r.room.memberCount}/{r.room.maxMembers}명
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => respondMatch(r.requestId, true)}
                          disabled={respondingId === r.requestId}
                          className="flex-1 py-1.5 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-semibold disabled:opacity-50"
                        >
                          수락
                        </button>
                        <button
                          onClick={() => respondMatch(r.requestId, false)}
                          disabled={respondingId === r.requestId}
                          className="flex-1 py-1.5 rounded-lg border border-gray-200 text-gray-500 text-xs font-semibold disabled:opacity-50"
                        >
                          거절
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 초대 코드 */}
              {myRoom.status === 'waiting' && myRoom.inviteCode && (
                <div className="bg-white/55 backdrop-blur-xl rounded-2xl border border-white/60 shadow-[0_6px_24px_rgba(120,90,200,0.08)] px-4 py-3 flex items-center justify-between gap-3">
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
              {/* 초대코드방 */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded accent-primary-500"
                  checked={!!form.isPrivate}
                  onChange={(e) => setForm({ ...form, isPrivate: e.target.checked })}
                />
                <span className="text-xs text-gray-600 font-medium">🔒 초대코드방 (초대코드로만 입장 가능)</span>
              </label>
              {createError && <p className="text-sm text-red-500 text-center">{createError}</p>}
              <div className="flex gap-2">
                <button onClick={() => setShowCreate(false)} className="btn-outline flex-1">취소</button>
                <button onClick={createRoom} className="btn-primary flex-1">만들기</button>
              </div>
            </div>
          )}

          {/* 신청중인 과팅 (보낸 신청 + 취소) — 항상 표시 */}
          <div className="card space-y-2.5">
            <p className="text-sm font-bold text-gray-800">
              신청중인 과팅 <span className="text-violet-500">{matchReqs.outgoing.length}</span>
            </p>
            {matchReqs.outgoing.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3">아직 신청한 과팅이 없어요</p>
            ) : (
              matchReqs.outgoing.map((o) => (
                <div key={o.requestId} className="flex items-center gap-2 rounded-2xl bg-white/55 border border-white/60 px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{o.room?.title ?? '상대 팀'}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {o.room ? `${o.room.gender === 'male' ? '남성팀' : '여성팀'} · ${o.room.memberCount}/${o.room.maxMembers}명 · ` : ''}수락 대기 중
                    </p>
                  </div>
                  <button
                    onClick={() => cancelRequest(o.requestId)}
                    className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 font-semibold hover:bg-gray-50 transition-colors"
                  >
                    취소
                  </button>
                </div>
              ))
            )}
          </div>
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
              {pagedRooms.map((room) => {
                // 성별 제한(allowedGender)이 설정된 경우에만 차단. 제한없음이면 동성도 참여 가능
                const genderBlocked = room.allowedGender && room.allowedGender !== user?.gender
                const canJoin = !myRoom && !genderBlocked && !room.isPrivate
                // 비공개 방은 참여 누르면 초대코드 입력 후 입장
                const canJoinPrivate = !myRoom && !genderBlocked && room.isPrivate
                // 과팅 신청은 팀장만 가능 (상대 팀이 대기중이면 성별 무관)
                const canMatch = myRoom && isLeader && myRoom.id !== room.id && myRoom.status === 'waiting'
                return (
                  <div key={room.id} className="card hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${room.gender === 'male' ? 'bg-blue-50 text-blue-500' : 'bg-pink-50 text-pink-500'}`}>
                            {room.gender === 'male' ? '남성팀' : '여성팀'}
                          </span>
                          <span className="text-xs text-gray-400">{room.members.length}/{room.maxMembers}명</span>
                          {room.isPrivate && (
                            <span className="text-xs bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded-full">🔒 초대코드방</span>
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
                          <button onClick={() => joinRoom(room.id)} className="btn-primary text-sm px-4 py-2">참여</button>
                        )}
                        {canJoinPrivate && (
                          <button
                            onClick={() => { setJoinCode(''); setJoinCodeError(''); setShowJoinByCode(true) }}
                            className="btn-primary text-sm px-4 py-2"
                          >
                            참여
                          </button>
                        )}
                        {canMatch && (
                          outgoingRoomIds.has(room.id) ? (
                            <button disabled className="btn-secondary text-sm px-4 py-2 opacity-50 cursor-default">신청됨</button>
                          ) : (
                            <button onClick={() => requestMatch(room.id)} className="btn-secondary text-sm px-4 py-2">과팅 신청</button>
                          )
                        )}
                        {!canJoin && !canJoinPrivate && !canMatch && !myRoom && genderBlocked && (
                          <span className="text-xs text-gray-300">입장 불가</span>
                        )}
                        {myRoom && !canMatch && myRoom.id !== room.id && myRoom.status === 'waiting' && !isLeader && (
                          <span className="text-xs text-gray-300">팀장만 신청</span>
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

          {/* 페이지네이션 (10개/페이지) */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={safePage === 0}
                className="w-9 h-9 rounded-xl bg-white/60 backdrop-blur border border-white/60 text-gray-500 text-sm disabled:opacity-30 hover:bg-white/80 transition-colors"
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`w-9 h-9 rounded-xl text-sm font-semibold transition-colors ${
                    i === safePage
                      ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-[0_4px_14px_rgba(244,63,94,0.30)]'
                      : 'bg-white/60 backdrop-blur border border-white/60 text-gray-500 hover:bg-white/80'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={safePage === totalPages - 1}
                className="w-9 h-9 rounded-xl bg-white/60 backdrop-blur border border-white/60 text-gray-500 text-sm disabled:opacity-30 hover:bg-white/80 transition-colors"
              >
                ›
              </button>
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
          <div className="bg-white/90 backdrop-blur-2xl border border-white/60 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
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
          <div className="bg-white/90 backdrop-blur-2xl border border-white/60 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
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

      {/* 확인 다이얼로그 */}
      {confirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6">
          <div className="bg-white/90 backdrop-blur-2xl border border-white/60 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
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

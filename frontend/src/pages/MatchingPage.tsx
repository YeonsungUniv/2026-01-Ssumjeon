import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { type MatchFilters } from '@/api/matching'
import { chatRequestApi } from '@/api/chatRequest'
import { chatApi } from '@/api/chat'
import { useChatStore } from '@/store/chatStore'
import { useMatchRequestStore } from '@/store/matchRequestStore'
import { useSocketInstance } from '@/hooks/useSocket'
import { GRADES, DEPARTMENT_MAX_GRADE } from '@/constants'
import DepartmentSelect from '@/components/DepartmentSelect'
import type { BrowseUser, IncomingRequest, OutgoingRequest } from '@/types'

const GENDER_OPTIONS = [
  { value: 'male' as const, label: '남성' },
  { value: 'female' as const, label: '여성' },
]

type RealtimePhase = 'idle' | 'waiting' | 'searching' | 'matched'
type BrowseTab = 'list' | 'incoming' | 'outgoing'
type PageMode = 'realtime' | 'browse'

// ── 공통 유저 카드 ─────────────────────────────────────────────────
function UserAvatar({ gender, profileImage, size = 'md' }: { gender: string; profileImage?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'lg' ? 'w-14 h-14' : size === 'md' ? 'w-10 h-10' : 'w-8 h-8'
  const iconSz = size === 'lg' ? 'w-7 h-7' : size === 'md' ? 'w-5 h-5' : 'w-4 h-4'
  if (profileImage) {
    return <img src={profileImage} alt="프로필" className={`${sz} rounded-full object-cover shrink-0`} />
  }
  const bgStyle = gender === 'male'
    ? { background: 'linear-gradient(135deg, #60a5fa, #6366f1)' }
    : { background: 'linear-gradient(135deg, #f472b6, #f43f5e)' }
  return (
    <div className={`${sz} rounded-full flex items-center justify-center shrink-0`} style={bgStyle}>
      <svg className={`${iconSz}`} fill="white" viewBox="0 0 24 24">
        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
      </svg>
    </div>
  )
}

// ── 필터 패널 (실시간/둘러보기 공통) ─────────────────────────────────
function FilterPanel({
  filters,
  onChange,
}: {
  filters: MatchFilters
  onChange: (f: MatchFilters) => void
}) {
  const hasFilters = !!(filters.departments?.length || filters.grades?.length || filters.gender)

  const toggleGrade = (g: number) =>
    onChange({
      ...filters,
      grades: (filters.grades ?? []).includes(g)
        ? (filters.grades ?? []).filter((x) => x !== g)
        : [...(filters.grades ?? []), g],
    })

  const toggleGender = (g: 'male' | 'female') =>
    onChange({ ...filters, gender: filters.gender === g ? undefined : g })

  return (
    <div className="card space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-base font-bold text-gray-700">매칭 조건</p>
        {hasFilters && (
          <button
            onClick={() => onChange({ departments: [], grades: [], gender: undefined })}
            className="text-xs text-gray-400 hover:text-red-400 transition-colors"
          >
            초기화
          </button>
        )}
      </div>

      <div>
        <p className="text-sm font-medium text-gray-500 mb-2">성별</p>
        <div className="flex gap-2">
          {GENDER_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => toggleGender(value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                filters.gender === value
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-primary-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-500 mb-2">학년</p>
        <div className="flex gap-2 flex-wrap">
          {GRADES.filter((g) =>
            !filters.departments?.length ||
            filters.departments.some((d) => g <= (DEPARTMENT_MAX_GRADE[d] ?? 4))
          ).map((g) => (
            <button
              key={g}
              onClick={() => toggleGrade(g)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                filters.grades?.includes(g)
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-primary-300'
              }`}
            >
              {g}학년
            </button>
          ))}
        </div>
        {(filters.grades ?? []).map((g) => {
          const excluded = (filters.departments ?? []).filter((d) => g > (DEPARTMENT_MAX_GRADE[d] ?? 4))
          if (!excluded.length) return null
          return (
            <p key={g} className="text-xs text-amber-600 mt-1 flex items-start gap-1">
              <span className="shrink-0">⚠️</span>
              <span><strong>{g}학년</strong> 선택 시 <strong>{excluded.join(', ')}</strong>은(는) 매칭에서 제외됩니다</span>
            </p>
          )
        })}
      </div>

      <div>
        <p className="text-sm font-medium text-gray-500 mb-2">
          학과
          {filters.departments?.length
            ? <span className="ml-2 text-primary-500 font-semibold">{filters.departments.length}개 선택</span>
            : <span className="ml-2 text-gray-400 font-normal">(전체)</span>
          }
        </p>
        <DepartmentSelect
          multiple
          value={filters.departments ?? []}
          onChange={(deps) => {
            const maxGrade = deps.length ? Math.max(...deps.map((d) => DEPARTMENT_MAX_GRADE[d] ?? 4)) : 4
            const validGrades = (filters.grades ?? []).filter((g) => g <= maxGrade)
            onChange({ ...filters, departments: deps, grades: validGrades })
          }}
        />
      </div>
    </div>
  )
}

// ── 실시간 매칭 섹션 ──────────────────────────────────────────────
function RealtimeSection({ filters, onFilterChange }: { filters: MatchFilters; onFilterChange: (f: MatchFilters) => void }) {
  const navigate = useNavigate()
  const { setRooms } = useChatStore()
  const socket = useSocketInstance()
  const [phase, setPhase] = useState<RealtimePhase>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [matchError, setMatchError] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const phaseRef = useRef<RealtimePhase>('idle')
  useEffect(() => { phaseRef.current = phase }, [phase])

  useEffect(() => {
    if (!socket) return
    const onWaiting = () => {
      setMatchError('')
      setPhase('waiting')
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
    }
    const onSuccess = ({ chatRoomId }: { chatRoomId: string }) => {
      clearInterval(timerRef.current!)
      setPhase('searching')
      chatApi.getRooms().then((res) => setRooms(res.data))
      setTimeout(() => { setPhase('matched'); setTimeout(() => navigate(`/chat/${chatRoomId}`), 1500) }, 3000)
    }
    const onError = ({ message }: { message?: string } = {}) => {
      clearInterval(timerRef.current!)
      setPhase('idle')
      setMatchError(message ?? '매칭 오류가 발생했습니다.')
    }
    const onReconnect = () => {
      if (phaseRef.current === 'waiting') {
        clearInterval(timerRef.current!)
        setPhase('idle')
        setElapsed(0)
        setMatchError('서버와 재연결되었습니다. 다시 매칭을 시작해주세요.')
      }
    }
    socket.on('matching:waiting', onWaiting)
    socket.on('matching:success', onSuccess)
    socket.on('matching:error', onError)
    socket.on('connect', onReconnect)
    return () => {
      socket.off('matching:waiting', onWaiting)
      socket.off('matching:success', onSuccess)
      socket.off('matching:error', onError)
      socket.off('connect', onReconnect)
    }
  }, [socket, navigate, setRooms])

  useEffect(() => () => { clearInterval(timerRef.current!) }, [])

  const handleStart = () => { if (!socket) return; socket.emit('matching:join', filters) }
  const handleCancel = () => {
    if (!socket) return
    socket.emit('matching:cancel')
    clearInterval(timerRef.current!)
    setPhase('idle')
    setElapsed(0)
  }

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  const hasFilters = !!(filters.departments?.length || filters.grades?.length || filters.gender)

  if (phase === 'searching') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
        <div className="relative w-44 h-44">
          <div className="absolute inset-0 rounded-full border-[6px] border-pink-200 animate-ping" />
          <div className="absolute inset-0 rounded-full border-[6px] border-pink-400 animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center text-6xl">🔍</div>
        </div>
        <div className="text-center space-y-2">
          <p className="text-2xl font-bold text-gray-800">인연을 찾았어요!</p>
          <p className="text-gray-400 animate-pulse">상대방 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (phase === 'matched') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-7xl animate-bounce">🎉</p>
        <p className="text-2xl font-bold text-gray-800">매칭 성공!</p>
        <p className="text-gray-400">채팅방으로 이동합니다...</p>
      </div>
    )
  }

  if (phase === 'waiting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
        <div className="relative w-44 h-44">
          <div className="absolute inset-0 rounded-full border-[6px] border-primary-100 animate-ping" />
          <div className="absolute inset-0 rounded-full border-[6px] border-primary-300 animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center text-6xl">💘</div>
        </div>
        <div className="text-center space-y-2">
          <p className="text-2xl font-bold text-gray-800">매칭 중입니다...</p>
          <p className="text-5xl font-mono text-primary-500">{fmt(elapsed)}</p>
        </div>
        {hasFilters ? (
          <div className="flex flex-wrap gap-2 justify-center max-w-xl">
            {filters.gender && <span className="bg-primary-50 text-primary-600 text-sm px-3 py-1.5 rounded-full">{filters.gender === 'male' ? '남성' : '여성'}</span>}
            {filters.grades?.map((g) => <span key={g} className="bg-primary-50 text-primary-600 text-sm px-3 py-1.5 rounded-full">{g}학년</span>)}
            {filters.departments?.map((d) => <span key={d} className="bg-primary-50 text-primary-600 text-sm px-3 py-1.5 rounded-full">{d}</span>)}
          </div>
        ) : (
          <p className="text-sm text-gray-400">조건 없이 전체 대상 매칭 중</p>
        )}
        <button onClick={handleCancel} className="px-14 py-3.5 rounded-2xl border-2 border-gray-200 text-gray-500 font-medium text-base hover:bg-gray-50 transition-colors">
          취소
        </button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
      <div className="lg:col-span-2 card flex flex-col items-center gap-6 py-12">
        <p className="text-7xl">💘</p>
        <div className="text-center space-y-1">
          <p className="text-xl font-bold text-gray-800">지금 바로 매칭해보세요</p>
          <p className="text-sm text-gray-400">{hasFilters ? '아래 조건으로 매칭합니다' : '조건 없이 전체 대상'}</p>
        </div>
        {hasFilters && (
          <div className="flex flex-wrap gap-2 justify-center px-2">
            {filters.gender && <span className="bg-primary-50 text-primary-600 text-xs font-medium px-3 py-1.5 rounded-full">{filters.gender === 'male' ? '남성' : '여성'}</span>}
            {filters.grades?.map((g) => <span key={g} className="bg-primary-50 text-primary-600 text-xs font-medium px-3 py-1.5 rounded-full">{g}학년</span>)}
            {filters.departments?.map((d) => <span key={d} className="bg-primary-50 text-primary-600 text-xs font-medium px-3 py-1.5 rounded-full">{d}</span>)}
          </div>
        )}
        {matchError && <p className="text-sm text-red-500 text-center">{matchError}</p>}
        <button
          onClick={handleStart}
          className="w-full max-w-xs py-4 rounded-2xl bg-primary-500 text-white text-lg font-bold hover:bg-primary-600 active:scale-95 transition-all shadow-md"
        >
          매칭 시작
        </button>
      </div>
      <div className="lg:col-span-3">
        <FilterPanel filters={filters} onChange={onFilterChange} />
      </div>
    </div>
  )
}

// ── 둘러보기 — 유저 카드 ──────────────────────────────────────────
function BrowseUserCard({
  user,
  onRequest,
  onCancel,
  onAcceptIncoming,
  onRejectIncoming,
  actionLoading,
}: {
  user: BrowseUser
  onRequest: (userId: string) => void
  onCancel: (requestId: string) => void
  onAcceptIncoming: (requestId: string) => void
  onRejectIncoming: (requestId: string) => void
  actionLoading: string | null
}) {
  const loading = actionLoading === user.userId || actionLoading === user.outgoingRequestId || actionLoading === user.incomingRequestId

  return (
    <div className="card space-y-3 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <UserAvatar gender={user.gender} profileImage={user.profileImage} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-gray-800">{user.nickname}</p>
            {user.mbti && (
              <span className="text-xs bg-secondary-50 text-secondary-600 px-2 py-0.5 rounded-full font-semibold">{user.mbti}</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{user.department} · {user.grade}학년</p>
        </div>
      </div>

      {user.bio && <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">{user.bio}</p>}

      {user.interests.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {user.interests.slice(0, 4).map((i) => (
            <span key={i} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{i}</span>
          ))}
          {user.interests.length > 4 && <span className="text-xs text-gray-400">+{user.interests.length - 4}</span>}
        </div>
      )}

      <div className="pt-1">
        {/* 상대방이 나에게 신청한 경우 */}
        {user.incomingRequestId && !user.outgoingRequestId && (
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-pink-100 flex items-center justify-center text-xs">💌</span>
              <p className="text-xs text-primary-500 font-semibold">나에게 채팅 신청함</p>
            </div>
            <div className="flex gap-2">
              <button
                disabled={loading}
                onClick={() => onRejectIncoming(user.incomingRequestId!)}
                className="flex-1 py-2 rounded-xl border-2 border-gray-200 text-gray-500 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
              >
                거절
              </button>
              <button
                disabled={loading}
                onClick={() => onAcceptIncoming(user.incomingRequestId!)}
                className="flex-1 py-2 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 disabled:opacity-50"
              >
                {loading ? '처리 중...' : '수락'}
              </button>
            </div>
          </div>
        )}

        {/* 내가 신청한 경우 */}
        {user.outgoingRequestId && user.outgoingRequestStatus === 'pending' && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-yellow-100 flex items-center justify-center text-xs">⏳</span>
              <span className="text-xs text-yellow-600 font-semibold">신청 대기 중</span>
            </div>
            <button
              disabled={loading}
              onClick={() => onCancel(user.outgoingRequestId!)}
              className="text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-400 hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              {loading ? '...' : '취소'}
            </button>
          </div>
        )}

        {user.outgoingRequestId && user.outgoingRequestStatus === 'rejected' && (
          <div className="flex items-center justify-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-xs">🚫</span>
            <p className="text-xs text-gray-400">거절된 신청</p>
          </div>
        )}

        {user.outgoingRequestId && user.outgoingRequestStatus === 'accepted' && (
          <div className="flex items-center justify-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-xs">💬</span>
            <p className="text-xs text-green-500 font-semibold">이미 채팅 중</p>
          </div>
        )}

        {/* 신청 안 한 경우 */}
        {!user.outgoingRequestId && !user.incomingRequestId && (
          <button
            disabled={loading}
            onClick={() => onRequest(user.userId)}
            className="w-full py-2 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? '신청 중...' : '채팅 신청'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── 둘러보기 섹션 ─────────────────────────────────────────────────
function BrowseSection({ filters, onFilterChange }: { filters: MatchFilters; onFilterChange: (f: MatchFilters) => void }) {
  const navigate = useNavigate()
  const { setRooms } = useChatStore()
  const { pendingIncomingCount, setPendingIncomingCount, acceptedNotification, setAcceptedNotification } = useMatchRequestStore()
  const socket = useSocketInstance()

  const [browseTab, setBrowseTab] = useState<BrowseTab>('list')
  const [browseUsers, setBrowseUsers] = useState<BrowseUser[]>([])
  const [browseLoading, setBrowseLoading] = useState(false)
  const [browsePage, setBrowsePage] = useState(1)
  const [browseHasMore, setBrowseHasMore] = useState(false)
  const [browseTotal, setBrowseTotal] = useState(0)

  const [incoming, setIncoming] = useState<IncomingRequest[]>([])
  const [incomingLoading, setIncomingLoading] = useState(false)
  const [outgoing, setOutgoing] = useState<OutgoingRequest[]>([])
  const [outgoingLoading, setOutgoingLoading] = useState(false)

  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [searchApplied, setSearchApplied] = useState(false)

  const loadBrowse = useCallback(async (page: number, append = false) => {
    setBrowseLoading(true)
    try {
      const res = await chatRequestApi.browse({ ...filters, page, limit: 20 })
      setBrowseUsers((prev) => append ? [...prev, ...res.data.items] : res.data.items)
      setBrowseHasMore(res.data.hasMore)
      setBrowsePage(page)
      setBrowseTotal(res.data.total)
      setSearchApplied(true)
    } finally {
      setBrowseLoading(false)
    }
  }, [filters])

  const loadIncoming = useCallback(async () => {
    setIncomingLoading(true)
    try {
      const res = await chatRequestApi.getIncoming()
      setIncoming(res.data)
      setPendingIncomingCount(res.data.length)
    } finally {
      setIncomingLoading(false)
    }
  }, [setPendingIncomingCount])

  const loadOutgoing = useCallback(async () => {
    setOutgoingLoading(true)
    try {
      const res = await chatRequestApi.getOutgoing()
      setOutgoing(res.data)
    } finally {
      setOutgoingLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBrowse(1)
    loadIncoming()
    loadOutgoing()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 실시간 신청 수신
  useEffect(() => {
    if (!socket) return
    const onReceived = (sender: IncomingRequest) => {
      setIncoming((prev) => [sender, ...prev])
      // 브라우즈 목록의 해당 유저 카드 상태 업데이트
      setBrowseUsers((prev) => prev.map((u) =>
        u.userId === sender.userId ? { ...u, incomingRequestId: sender.requestId } : u
      ))
    }
    socket.on('chat_request:received', onReceived)
    return () => { socket.off('chat_request:received', onReceived) }
  }, [socket])

  // 수락 알림 처리
  useEffect(() => {
    if (!acceptedNotification) return
    chatApi.getRooms().then((res) => setRooms(res.data))
    setAcceptedNotification(null)
    // 보낸 신청 목록 갱신 후 채팅으로 이동
    navigate(`/chat/${acceptedNotification.chatRoomId}`)
  }, [acceptedNotification, navigate, setRooms, setAcceptedNotification])

  const handleRequest = async (receiverId: string) => {
    setActionLoading(receiverId)
    try {
      const res = await chatRequestApi.sendRequest(receiverId)
      setBrowseUsers((prev) => prev.map((u) =>
        u.userId === receiverId
          ? { ...u, outgoingRequestId: res.data.requestId, outgoingRequestStatus: 'pending' }
          : u
      ))
      loadOutgoing()
    } catch (e) {
      alert(e instanceof Error ? e.message : '신청에 실패했습니다.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancel = async (requestId: string) => {
    setActionLoading(requestId)
    try {
      await chatRequestApi.cancel(requestId)
      setBrowseUsers((prev) => prev.map((u) =>
        u.outgoingRequestId === requestId
          ? { ...u, outgoingRequestId: null, outgoingRequestStatus: null }
          : u
      ))
      setOutgoing((prev) => prev.filter((r) => r.requestId !== requestId))
    } catch (e) {
      alert(e instanceof Error ? e.message : '취소에 실패했습니다.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleAcceptIncoming = async (requestId: string) => {
    setActionLoading(requestId)
    try {
      const res = await chatRequestApi.respond(requestId, 'accepted')
      chatApi.getRooms().then((r) => setRooms(r.data))
      setIncoming((prev) => prev.filter((r) => r.requestId !== requestId))
      setPendingIncomingCount(Math.max(0, pendingIncomingCount - 1))
      setBrowseUsers((prev) => prev.map((u) =>
        u.incomingRequestId === requestId ? { ...u, incomingRequestId: null } : u
      ))
      if (res.data.chatRoomId) navigate(`/chat/${res.data.chatRoomId}`)
    } catch (e) {
      alert(e instanceof Error ? e.message : '수락에 실패했습니다.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRejectIncoming = async (requestId: string) => {
    setActionLoading(requestId)
    try {
      await chatRequestApi.respond(requestId, 'rejected')
      setIncoming((prev) => prev.filter((r) => r.requestId !== requestId))
      setPendingIncomingCount(Math.max(0, pendingIncomingCount - 1))
      setBrowseUsers((prev) => prev.map((u) =>
        u.incomingRequestId === requestId ? { ...u, incomingRequestId: null } : u
      ))
    } catch (e) {
      alert(e instanceof Error ? e.message : '거절에 실패했습니다.')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

      {/* 좌측: 필터 + 검색 버튼 */}
      <div className="lg:col-span-2 space-y-3">
        <FilterPanel filters={filters} onChange={onFilterChange} />
        <button
          onClick={() => { setBrowsePage(1); setBrowseUsers([]); loadBrowse(1) }}
          disabled={browseLoading}
          className="w-full py-3 rounded-2xl border-2 border-primary-400 text-primary-500 font-bold hover:bg-primary-50 active:scale-95 transition-all disabled:opacity-60"
        >
          {browseLoading ? '검색 중...' : '🔍 필터 재검색'}
        </button>
      </div>

      {/* 우측: 탭 + 목록 */}
      <div className="lg:col-span-3 space-y-4">

        {/* 서브 탭 */}
        <div className="flex bg-gray-100 rounded-2xl p-1 gap-1">
          {([
            {
              tab: 'list' as const, label: '둘러보기', count: browseTotal > 0 ? browseTotal : null,
              icon: (active: boolean) => (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="7" stroke={active ? '#3b82f6' : '#9ca3af'} strokeWidth="2.5"/>
                  <path d="M16.5 16.5L21 21" stroke={active ? '#3b82f6' : '#9ca3af'} strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              ),
            },
            {
              tab: 'incoming' as const, label: '받은 신청', count: pendingIncomingCount > 0 ? pendingIncomingCount : null,
              icon: (active: boolean) => (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="5" width="18" height="14" rx="2" fill={active ? '#ec4899' : '#d1d5db'}/>
                  <path d="M3 8l9 6 9-6" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              ),
            },
            {
              tab: 'outgoing' as const, label: '보낸 신청', count: outgoing.length > 0 ? outgoing.length : null,
              icon: (active: boolean) => (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13" stroke={active ? '#8b5cf6' : '#9ca3af'} strokeWidth="2" strokeLinecap="round"/>
                  <path d="M22 2L15 22l-4-9-9-4 20-7z" fill={active ? '#8b5cf6' : '#d1d5db'}/>
                </svg>
              ),
            },
          ]).map(({ tab, label, count, icon }) => (
            <button
              key={tab}
              onClick={() => {
                setBrowseTab(tab)
                if (tab === 'incoming') loadIncoming()
                if (tab === 'outgoing') loadOutgoing()
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                browseTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {icon(browseTab === tab)}
              {label}
              {count !== null && (
                <span className={`min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full flex items-center justify-center ${
                  browseTab === tab ? 'text-white bg-primary-500' : 'text-gray-500 bg-gray-200'
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 둘러보기 탭 */}
        {browseTab === 'list' && (
          <div className="space-y-3">
            {!searchApplied && !browseLoading && (
              <div className="card text-center py-14">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🔍</span>
                </div>
                <p className="text-gray-500 font-medium">조건을 설정하고 검색해보세요</p>
                <p className="text-sm text-gray-400 mt-1">접속 여부와 상관없이 상대를 찾을 수 있어요</p>
              </div>
            )}
            {browseLoading && browseUsers.length === 0 && (
              <div className="flex justify-center py-16">
                <div className="animate-spin w-8 h-8 border-4 border-primary-300 border-t-primary-500 rounded-full" />
              </div>
            )}
            {searchApplied && !browseLoading && browseUsers.length === 0 && (
              <div className="card text-center py-14">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">😔</span>
                </div>
                <p className="text-gray-500 font-medium">조건에 맞는 상대가 없어요</p>
                <p className="text-sm text-gray-400 mt-1">조건을 바꿔서 다시 검색해보세요</p>
              </div>
            )}
            {browseUsers.length > 0 && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {browseUsers.map((u) => (
                  <BrowseUserCard
                    key={u.userId}
                    user={u}
                    onRequest={handleRequest}
                    onCancel={handleCancel}
                    onAcceptIncoming={handleAcceptIncoming}
                    onRejectIncoming={handleRejectIncoming}
                    actionLoading={actionLoading}
                  />
                ))}
              </div>
            )}
            {browseHasMore && (
              <button
                disabled={browseLoading}
                onClick={() => loadBrowse(browsePage + 1, true)}
                className="w-full py-3 rounded-2xl border border-gray-200 text-gray-500 text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                {browseLoading ? '불러오는 중...' : '더 보기'}
              </button>
            )}
          </div>
        )}

        {/* 받은 신청 탭 */}
        {browseTab === 'incoming' && (
          <div className="space-y-3">
            {incomingLoading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin w-8 h-8 border-4 border-primary-300 border-t-primary-500 rounded-full" />
              </div>
            ) : incoming.length === 0 ? (
              <div className="card text-center py-14">
                <div className="w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">💌</span>
                </div>
                <p className="text-gray-500 font-medium">받은 신청이 없어요</p>
              </div>
            ) : incoming.map((req) => (
              <div key={req.requestId} className="card flex items-start gap-4">
                <UserAvatar gender={req.gender} profileImage={req.profileImage} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="font-bold text-gray-800">{req.nickname}</p>
                    {req.mbti && <span className="text-xs bg-secondary-50 text-secondary-600 px-2 py-0.5 rounded-full">{req.mbti}</span>}
                  </div>
                  <p className="text-xs text-gray-400">{req.department} · {req.grade}학년</p>
                  {req.bio && <p className="text-sm text-gray-500 mt-1 line-clamp-1">{req.bio}</p>}
                  {req.interests.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {req.interests.slice(0, 3).map((i) => (
                        <span key={i} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{i}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 mt-3">
                    <button
                      disabled={actionLoading === req.requestId}
                      onClick={() => handleRejectIncoming(req.requestId)}
                      className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-500 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
                    >
                      거절
                    </button>
                    <button
                      disabled={actionLoading === req.requestId}
                      onClick={() => handleAcceptIncoming(req.requestId)}
                      className="flex-1 py-2 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 disabled:opacity-50"
                    >
                      {actionLoading === req.requestId ? '처리 중...' : '수락'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 보낸 신청 탭 */}
        {browseTab === 'outgoing' && (
          <div className="space-y-3">
            {outgoingLoading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin w-8 h-8 border-4 border-primary-300 border-t-primary-500 rounded-full" />
              </div>
            ) : outgoing.length === 0 ? (
              <div className="card text-center py-14">
                <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">📭</span>
                </div>
                <p className="text-gray-500 font-medium">보낸 신청이 없어요</p>
              </div>
            ) : outgoing.map((req) => (
              <div key={req.requestId} className="card flex items-center gap-4">
                <UserAvatar gender={req.gender} profileImage={req.profileImage} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800">{req.nickname}</p>
                  <p className="text-xs text-gray-400">{req.department} · {req.grade}학년</p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-2">
                  {req.status === 'pending' && (
                    <>
                      <span className="flex items-center gap-1 text-xs bg-yellow-50 text-yellow-600 px-2.5 py-1 rounded-full font-semibold border border-yellow-100">
                        <span className="w-3.5 h-3.5 rounded-full bg-yellow-200 flex items-center justify-center text-[9px]">⏳</span>
                        대기 중
                      </span>
                      <button
                        disabled={actionLoading === req.requestId}
                        onClick={() => handleCancel(req.requestId)}
                        className="text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-400 hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === req.requestId ? '...' : '취소'}
                      </button>
                    </>
                  )}
                  {req.status === 'accepted' && (
                    <span className="flex items-center gap-1 text-xs bg-green-50 text-green-600 px-2.5 py-1 rounded-full font-semibold border border-green-100">
                      <span className="w-3.5 h-3.5 rounded-full bg-green-200 flex items-center justify-center text-[9px]">✓</span>
                      수락됨
                    </span>
                  )}
                  {req.status === 'rejected' && (
                    <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-400 px-2.5 py-1 rounded-full border border-gray-200">
                      <span className="w-3.5 h-3.5 rounded-full bg-gray-200 flex items-center justify-center text-[9px]">✕</span>
                      거절됨
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────
export default function MatchingPage() {
  const [pageMode, setPageMode] = useState<PageMode>('realtime')
  const [filters, setFilters] = useState<MatchFilters>({ departments: [], grades: [], gender: undefined })
  const { pendingIncomingCount } = useMatchRequestStore()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">1:1 매칭</h2>
      </div>

      {/* 모드 탭 */}
      <div className="flex bg-gray-100 rounded-2xl p-1 gap-1 max-w-sm">
        <button
          onClick={() => setPageMode('realtime')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            pageMode === 'realtime' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          ⚡ 실시간 매칭
        </button>
        <button
          onClick={() => setPageMode('browse')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${
            pageMode === 'browse' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="9" cy="7" r="4" fill="#a855f7"/>
            <circle cx="17" cy="9" r="3" fill="#c084fc"/>
            <path d="M1 21c0-4 3.6-7 8-7s8 3 8 7" fill="#a855f7"/>
            <path d="M17 14c2.5 0 5 1.5 5 5" stroke="#c084fc" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          둘러보기
          {pendingIncomingCount > 0 && (
            <span className="min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-primary-500 rounded-full flex items-center justify-center">
              {pendingIncomingCount}
            </span>
          )}
        </button>
      </div>

      {pageMode === 'realtime' ? (
        <RealtimeSection filters={filters} onFilterChange={setFilters} />
      ) : (
        <BrowseSection filters={filters} onFilterChange={setFilters} />
      )}
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { type MatchFilters } from '@/api/matching'
import { chatApi } from '@/api/chat'
import { useChatStore } from '@/store/chatStore'
import { useSocketInstance } from '@/hooks/useSocket'
import { GRADES, DEPARTMENT_MAX_GRADE } from '@/constants'
import DepartmentSelect from '@/components/DepartmentSelect'

const GENDER_OPTIONS = [
  { value: 'male' as const, label: '남성' },
  { value: 'female' as const, label: '여성' },
]

type Phase = 'idle' | 'waiting' | 'searching' | 'matched'

export default function MatchingPage() {
  const navigate = useNavigate()
  const { setRooms } = useChatStore()
  const socket = useSocketInstance()
  const [phase, setPhase] = useState<Phase>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [matchError, setMatchError] = useState('')
  const [filters, setFilters] = useState<MatchFilters>({ departments: [], grades: [], gender: undefined })
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const phaseRef = useRef<Phase>('idle')
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
      setTimeout(() => {
        setPhase('matched')
        setTimeout(() => navigate(`/chat/${chatRoomId}`), 1500)
      }, 3000)
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

  const handleStart = () => {
    if (!socket) return
    socket.emit('matching:join', filters)
  }

  const handleCancel = () => {
    if (!socket) return
    socket.emit('matching:cancel')
    clearInterval(timerRef.current!)
    setPhase('idle')
    setElapsed(0)
  }

  const toggleGrade = (g: number) =>
    setFilters((prev) => {
      const grades = prev.grades ?? []
      return { ...prev, grades: grades.includes(g) ? grades.filter((x) => x !== g) : [...grades, g] }
    })

  const toggleGender = (g: 'male' | 'female') =>
    setFilters((prev) => ({ ...prev, gender: prev.gender === g ? undefined : g }))


  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const hasFilters = !!(filters.departments?.length || filters.grades?.length || filters.gender)

  // ── 상대방 검색 중 ────────────────────────────────────────────────
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

  // ── 매칭 성공 ─────────────────────────────────────────────────────
  if (phase === 'matched') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-7xl animate-bounce">🎉</p>
        <p className="text-2xl font-bold text-gray-800">매칭 성공!</p>
        <p className="text-gray-400">채팅방으로 이동합니다...</p>
      </div>
    )
  }

  // ── 매칭 대기 중 ──────────────────────────────────────────────────
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
            {filters.gender && (
              <span className="bg-primary-50 text-primary-600 text-sm px-3 py-1.5 rounded-full">
                {filters.gender === 'male' ? '남성' : '여성'}
              </span>
            )}
            {filters.grades?.map((g) => (
              <span key={g} className="bg-primary-50 text-primary-600 text-sm px-3 py-1.5 rounded-full">{g}학년</span>
            ))}
            {filters.departments?.map((d) => (
              <span key={d} className="bg-primary-50 text-primary-600 text-sm px-3 py-1.5 rounded-full">{d}</span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">조건 없이 전체 대상 매칭 중</p>
        )}
        <button
          onClick={handleCancel}
          className="px-14 py-3.5 rounded-2xl border-2 border-gray-200 text-gray-500 font-medium text-base hover:bg-gray-50 transition-colors"
        >
          취소
        </button>
      </div>
    )
  }

  // ── 초기 화면 ─────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">1:1 매칭</h2>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

        {/* 좌측: 매칭 시작 패널 */}
        <div className="lg:col-span-2 card flex flex-col items-center gap-6 py-12">
          <p className="text-7xl">💘</p>
          <div className="text-center space-y-1">
            <p className="text-xl font-bold text-gray-800">오늘의 인연을 찾아보세요</p>
            <p className="text-sm text-gray-400">
              {hasFilters ? '아래 조건으로 매칭합니다' : '조건 없이 전체 대상'}
            </p>
          </div>
          {hasFilters && (
            <div className="flex flex-wrap gap-2 justify-center px-2">
              {filters.gender && (
                <span className="bg-primary-50 text-primary-600 text-xs font-medium px-3 py-1.5 rounded-full">
                  {filters.gender === 'male' ? '남성' : '여성'}
                </span>
              )}
              {filters.grades?.map((g) => (
                <span key={g} className="bg-primary-50 text-primary-600 text-xs font-medium px-3 py-1.5 rounded-full">
                  {g}학년
                </span>
              ))}
              {filters.departments?.map((d) => (
                <span key={d} className="bg-primary-50 text-primary-600 text-xs font-medium px-3 py-1.5 rounded-full">
                  {d}
                </span>
              ))}
            </div>
          )}
          {matchError && (
            <p className="text-sm text-red-500 text-center">{matchError}</p>
          )}
          <button
            onClick={handleStart}
            className="w-full max-w-xs py-4 rounded-2xl bg-primary-500 text-white text-lg font-bold hover:bg-primary-600 active:scale-95 transition-all shadow-md"
          >
            매칭 시작
          </button>
        </div>

        {/* 우측: 필터 패널 */}
        <div className="lg:col-span-3 card space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-base font-bold text-gray-700">매칭 조건 설정</p>
            {hasFilters && (
              <button
                onClick={() => setFilters({ departments: [], grades: [], gender: undefined })}
                className="text-xs text-gray-400 hover:text-red-400 transition-colors flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                초기화
              </button>
            )}
          </div>

          {/* 성별 */}
          <div>
            <p className="text-sm font-medium text-gray-500 mb-3">성별</p>
            <div className="flex gap-2">
              {GENDER_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => toggleGender(value)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
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

          {/* 학년 */}
          <div>
            <p className="text-sm font-medium text-gray-500 mb-3">학년</p>
            <div className="flex gap-2 flex-wrap">
              {GRADES.filter((g) =>
                !filters.departments?.length ||
                filters.departments.some((d) => g <= (DEPARTMENT_MAX_GRADE[d] ?? 4))
              ).map((g) => (
                <button
                  key={g}
                  onClick={() => toggleGrade(g)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    filters.grades?.includes(g)
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-primary-300'
                  }`}
                >
                  {g}학년
                </button>
              ))}
            </div>
          </div>

          {/* 학과 */}
          <div>
            <p className="text-sm font-medium text-gray-500 mb-3">
              학과
              {filters.departments?.length ? (
                <span className="ml-2 text-primary-500 font-semibold">{filters.departments.length}개 선택</span>
              ) : (
                <span className="ml-2 text-gray-400 font-normal">(전체)</span>
              )}
            </p>
            <DepartmentSelect
              multiple
              value={filters.departments ?? []}
              onChange={(deps) => setFilters((prev) => ({ ...prev, departments: deps }))}
            />
          </div>
        </div>

      </div>
    </div>
  )
}

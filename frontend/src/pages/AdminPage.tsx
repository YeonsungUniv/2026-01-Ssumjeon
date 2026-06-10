import { useEffect, useState } from 'react'
import { adminApi, authApi, type PendingUser } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'

export default function AdminPage() {
  const { user, setAuth, logout } = useAuthStore()
  const [pending, setPending] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)

  // 로그인 폼 상태
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const isAdmin = user?.isAdmin === true

  useEffect(() => {
    if (isAdmin) fetchPending()
  }, [isAdmin])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)
    try {
      const res = await authApi.login({ username: loginUsername, password: loginPassword })
      if (!res.data.user.isAdmin) {
        setLoginError('관리자 계정이 아닙니다.')
        return
      }
      setAuth(res.data.user, res.data.accessToken)
      // isAdmin이 true가 되면 컴포넌트가 자동으로 관리자 패널을 렌더링함
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : '로그인 실패')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleLogout = async () => {
    try { await authApi.logout() } catch { /* ignore */ }
    logout()
  }

  const fetchPending = async () => {
    setLoading(true)
    try {
      const res = await adminApi.listPending()
      setPending(res.data)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (userId: string) => {
    setActionId(userId)
    try {
      await adminApi.approveUser(userId)
      setPending((prev) => prev.filter((u) => u.id !== userId))
    } catch (e) {
      alert(e instanceof Error ? e.message : '승인 실패')
    } finally {
      setActionId(null)
    }
  }

  const handleReject = async (userId: string) => {
    if (!confirm('정말 거절하시겠습니까?')) return
    setActionId(userId)
    try {
      await adminApi.rejectUser(userId)
      setPending((prev) => prev.filter((u) => u.id !== userId))
    } catch (e) {
      alert(e instanceof Error ? e.message : '거절 실패')
    } finally {
      setActionId(null)
    }
  }

  // 로그인 화면
  if (!isAdmin) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gray-50 p-5">
        <div className="card w-full max-w-sm space-y-5">
          <h2 className="text-xl font-bold text-gray-900">관리자 로그인</h2>
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="text"
              placeholder="아이디"
              className="input-field"
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="비밀번호"
              className="input-field"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
            />
            {loginError && <p className="text-sm text-red-500">{loginError}</p>}
            <button type="submit" disabled={loginLoading} className="btn-primary w-full">
              {loginLoading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // 관리자 화면
  return (
    <div className="p-5 space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center justify-between pt-2">
        <h2 className="text-xl font-bold text-gray-800">관리자 — 가입 승인</h2>
        <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-700">로그아웃</button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">불러오는 중...</div>
      ) : pending.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <p className="text-3xl mb-3">✅</p>
          <p>대기 중인 신청이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((u) => (
            <div key={u.id} className="card space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{u.nickname} <span className="text-sm text-gray-400">@{u.username}</span></p>
                  <p className="text-sm text-gray-500">{u.department} · {u.gender === 'male' ? '남' : '여'} · 학번 {u.studentId}</p>
                </div>
                <span className="text-xs text-gray-400">{new Date(u.createdAt).toLocaleDateString('ko-KR')}</span>
              </div>

              {u.enrollmentDoc && (
                <a
                  href={u.enrollmentDoc}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-primary-500 underline underline-offset-2"
                >
                  재학증명서 확인 →
                </a>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => handleApprove(u.id)}
                  disabled={actionId === u.id}
                  className="btn-primary flex-1 text-sm py-2"
                >
                  승인
                </button>
                <button
                  onClick={() => handleReject(u.id)}
                  disabled={actionId === u.id}
                  className="btn-outline flex-1 text-sm py-2"
                >
                  거절
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

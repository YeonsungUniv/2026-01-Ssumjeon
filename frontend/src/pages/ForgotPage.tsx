import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '@/api/auth'

const SCHOOL_DOMAIN = '@yeonsung.ac.kr'
type Mode = 'id' | 'pw'

export default function ForgotPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('id')

  // 공통: 이메일 + 코드
  const [emailLocal, setEmailLocal] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [sendLoading, setSendLoading] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [error, setError] = useState('')

  // 결과
  const [foundUsername, setFoundUsername] = useState('')
  const [pwReset, setPwReset] = useState(false)

  // 비밀번호 재설정용
  const [newPw, setNewPw] = useState('')
  const [newPwConfirm, setNewPwConfirm] = useState('')

  const fullEmail = emailLocal.trim() ? `${emailLocal.trim().toLowerCase()}${SCHOOL_DOMAIN}` : ''

  useEffect(() => {
    if (countdown <= 0) return
    const id = setInterval(() => setCountdown((c) => c - 1), 1000)
    return () => clearInterval(id)
  }, [countdown])

  // 모드 전환 시 상태 초기화
  const switchMode = (m: Mode) => {
    setMode(m)
    setError(''); setCode(''); setCodeSent(false); setCountdown(0)
    setFoundUsername(''); setPwReset(false); setNewPw(''); setNewPwConfirm('')
  }

  const handleSendCode = async () => {
    setError(''); setSendLoading(true)
    try {
      await authApi.sendRecoveryCode(fullEmail)
      setCodeSent(true)
      setCountdown(60)
    } catch (e) {
      setError(e instanceof Error ? e.message : '발송에 실패했습니다.')
    } finally {
      setSendLoading(false)
    }
  }

  const handleSubmit = async () => {
    setError(''); setSubmitLoading(true)
    try {
      if (mode === 'id') {
        const res = await authApi.findUsername(fullEmail, code.trim())
        setFoundUsername(res.data.username)
      } else {
        if (newPw.length < 8) { setError('비밀번호는 8자 이상이어야 합니다.'); return }
        if (newPw !== newPwConfirm) { setError('비밀번호가 일치하지 않습니다.'); return }
        await authApi.resetPassword(fullEmail, code.trim(), newPw)
        setPwReset(true)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '처리에 실패했습니다.')
    } finally {
      setSubmitLoading(false)
    }
  }

  // ── 결과 화면 ───────────────────────────────────────────────
  if (foundUsername) {
    return (
      <div className="card flex flex-col items-center gap-4 py-8">
        <span className="text-5xl">🔎</span>
        <h2 className="text-xl font-bold text-gray-900">아이디를 찾았어요</h2>
        <div className="bg-primary-50 rounded-2xl px-6 py-4 text-center">
          <p className="text-xs text-gray-400 mb-1">회원님의 아이디</p>
          <p className="text-2xl font-black text-primary-600">{foundUsername}</p>
        </div>
        <button onClick={() => navigate('/login')} className="btn-primary w-full mt-2">로그인하러 가기</button>
      </div>
    )
  }

  if (pwReset) {
    return (
      <div className="card flex flex-col items-center gap-4 py-8">
        <span className="text-5xl">✅</span>
        <h2 className="text-xl font-bold text-gray-900">비밀번호가 변경되었어요</h2>
        <p className="text-sm text-gray-400 text-center">새 비밀번호로 로그인해주세요.</p>
        <button onClick={() => navigate('/login')} className="btn-primary w-full mt-2">로그인하러 가기</button>
      </div>
    )
  }

  // ── 입력 화면 ───────────────────────────────────────────────
  return (
    <div className="card">
      <h2 className="text-xl font-bold text-gray-900 mb-1">계정 찾기</h2>
      <p className="text-sm text-gray-400 mb-5">가입한 학교 이메일로 인증해주세요.</p>

      {/* 모드 탭 */}
      <div className="flex bg-gray-100 rounded-2xl p-1 gap-1 mb-5">
        <button
          onClick={() => switchMode('id')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${mode === 'id' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
        >
          아이디 찾기
        </button>
        <button
          onClick={() => switchMode('pw')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${mode === 'pw' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
        >
          비밀번호 재설정
        </button>
      </div>

      <div className="space-y-4">
        {/* 이메일 + 코드 발송 */}
        <div>
          <label className="text-sm font-medium text-gray-600 mb-1.5 block">학교 이메일</label>
          <div className="flex gap-2">
            <div className="flex items-center flex-1 rounded-2xl border border-gray-200 bg-white overflow-hidden focus-within:border-primary-400">
              <input
                type="text"
                placeholder="아이디"
                className="flex-1 min-w-0 px-4 py-2.5 text-sm bg-transparent outline-none"
                value={emailLocal}
                onChange={(e) => { setEmailLocal(e.target.value.replace(/[@\s]/g, '')); setError('') }}
              />
              <span className="pr-3 text-sm text-gray-400 shrink-0 select-none">{SCHOOL_DOMAIN}</span>
            </div>
            <button
              type="button"
              onClick={handleSendCode}
              disabled={!emailLocal.trim() || sendLoading || countdown > 0}
              className="px-4 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 transition-colors"
            >
              {sendLoading ? '발송 중...' : countdown > 0 ? `${countdown}s` : codeSent ? '재전송' : '코드 발송'}
            </button>
          </div>
        </div>

        {/* 코드 + (비밀번호 재설정 시 새 비번) */}
        {codeSent && (
          <>
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1.5 block">인증 코드</label>
              <input
                type="text"
                placeholder="6자리 코드 입력"
                className="input-field font-mono text-center text-xl tracking-widest"
                maxLength={6}
                value={code}
                onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setError('') }}
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-1.5">이메일로 발송된 6자리 코드를 입력하세요 (10분 유효).</p>
            </div>

            {mode === 'pw' && (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-1.5 block">새 비밀번호</label>
                  <input
                    type="password"
                    placeholder="새 비밀번호 (8자 이상)"
                    className="input-field"
                    value={newPw}
                    onChange={(e) => { setNewPw(e.target.value); setError('') }}
                  />
                </div>
                <div>
                  <input
                    type="password"
                    placeholder="새 비밀번호 확인"
                    className="input-field"
                    value={newPwConfirm}
                    onChange={(e) => { setNewPwConfirm(e.target.value); setError('') }}
                  />
                </div>
              </>
            )}
          </>
        )}

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        {codeSent && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={code.length !== 6 || submitLoading || (mode === 'pw' && (!newPw || !newPwConfirm))}
            className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitLoading ? '처리 중...' : mode === 'id' ? '아이디 찾기' : '비밀번호 변경'}
          </button>
        )}
      </div>

      <p className="text-center text-sm text-gray-500 mt-4">
        <Link to="/login" className="text-primary-500 font-semibold">로그인으로 돌아가기</Link>
      </p>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { authApi } from '@/api/auth'

const SCHOOL_DOMAIN = '@yeonsung.ac.kr'

interface Step1Form {
  username: string
  password: string
  passwordConfirm: string
  nickname: string
  gender: 'male' | 'female'
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2 | 3 | 'done'>(1)
  const [error, setError] = useState('')
  const [step1Data, setStep1Data] = useState<Step1Form | null>(null)

  // 재학증명서 (Step 3)
  const [enrollmentFile, setEnrollmentFile] = useState<File | null>(null)
  const [docError, setDocError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // 이메일 인증 상태 (emailLocal = @ 앞 부분만)
  const [emailLocal, setEmailLocal] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [emailVerified, setEmailVerified] = useState(false)
  const [sendLoading, setSendLoading] = useState(false)
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [codeError, setCodeError] = useState('')
  const [countdown, setCountdown] = useState(0)

  const { register, handleSubmit, watch, formState: { errors, isSubmitting }, setError: setFieldError } = useForm<Step1Form>()

  // 재전송 카운트다운
  useEffect(() => {
    if (countdown <= 0) return
    const id = setInterval(() => setCountdown((c) => c - 1), 1000)
    return () => clearInterval(id)
  }, [countdown])

  const fullEmail = emailLocal.trim() ? `${emailLocal.trim().toLowerCase()}${SCHOOL_DOMAIN}` : ''

  const onStep1Submit = async (data: Step1Form) => {
    try {
      const res = await authApi.checkUsername(data.username)
      if (!res.data.available) {
        setFieldError('username', { message: '이미 사용중인 아이디입니다.' })
        return
      }
    } catch { /* 최종 제출에서 검증 */ }
    setStep1Data(data)
    setError('')
    setStep(2)
  }

  const handleSendCode = async () => {
    setEmailError('')
    setSendLoading(true)
    try {
      await authApi.sendEmailCode(fullEmail)
      setCodeSent(true)
      setCountdown(60)
    } catch (e) {
      setEmailError(e instanceof Error ? e.message : '발송에 실패했습니다.')
    } finally {
      setSendLoading(false)
    }
  }

  const handleVerifyCode = async () => {
    setCodeError('')
    setVerifyLoading(true)
    try {
      await authApi.verifyEmailCode(fullEmail, code.trim())
      setEmailVerified(true)
    } catch (e) {
      setCodeError(e instanceof Error ? e.message : '인증에 실패했습니다.')
    } finally {
      setVerifyLoading(false)
    }
  }

  const handleSelectDoc = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setDocError('')
    if (!file) { setEnrollmentFile(null); return }
    const allowed = ['application/pdf', 'image/jpeg', 'image/png']
    if (!allowed.includes(file.type)) {
      setDocError('PDF 또는 이미지(jpg/png) 파일만 업로드할 수 있습니다.')
      setEnrollmentFile(null)
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setDocError('파일 크기는 10MB 이하여야 합니다.')
      setEnrollmentFile(null)
      return
    }
    setEnrollmentFile(file)
  }

  const onFinalSubmit = async () => {
    if (!step1Data) return
    if (!emailVerified) { setEmailError('이메일 인증을 완료해주세요.'); return }
    if (!enrollmentFile) { setDocError('재학증명서를 첨부해주세요.'); return }
    setError('')
    setSubmitting(true)
    try {
      await authApi.register({
        ...step1Data,
        nickname: step1Data.nickname.trim() || undefined,
        email: fullEmail,
        enrollmentDoc: enrollmentFile,
      })
      setStep('done')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '회원가입에 실패했습니다.'
      if (msg.includes('아이디')) {
        setStep(1)
        setFieldError('username', { message: msg })
      } else {
        setError(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="card">
      {/* 단계 표시 */}
      {step !== 'done' && (
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((n, idx) => (
            <div key={n} className="flex items-center gap-2 flex-1 last:flex-none">
              <div className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                step >= (n as 1 | 2 | 3) ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-400'
              }`}>{n}</div>
              {idx < 2 && (
                <div className="flex-1 h-0.5 bg-gray-100">
                  <div className={`h-full bg-primary-400 transition-all ${step > (n as 1 | 2 | 3) ? 'w-full' : 'w-0'}`} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Step 1: 계정 정보 ──────────────────────────────────── */}
      {step === 1 && (
        <>
          <h2 className="text-xl font-bold text-gray-900 mb-1">계정 설정</h2>
          <p className="text-sm text-gray-400 mb-6">로그인에 사용할 정보를 입력해주세요.</p>

          <form onSubmit={handleSubmit(onStep1Submit)} className="space-y-4">
            {/* 성별 */}
            <div className="flex gap-3">
              {(['male', 'female'] as const).map((g) => (
                <label key={g} className="flex-1 flex items-center justify-center gap-2 border-2 rounded-2xl py-3 cursor-pointer transition has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50">
                  <input type="radio" value={g} className="accent-primary-500" {...register('gender', { required: true })} />
                  <span className="font-medium text-sm">{g === 'male' ? '남성' : '여성'}</span>
                </label>
              ))}
            </div>
            {errors.gender && <p className="text-xs text-red-500">성별을 선택해주세요</p>}

            {/* 아이디 */}
            <div>
              <input
                type="text"
                placeholder="아이디 (4~20자, 영문·숫자·밑줄)"
                className="input-field"
                {...register('username', {
                  required: '아이디를 입력해주세요',
                  pattern: { value: /^[a-zA-Z0-9_]{4,20}$/, message: '4~20자의 영문, 숫자, 밑줄(_)만 사용 가능합니다' },
                })}
              />
              {errors.username && <p className="text-xs text-red-500 mt-1">{errors.username.message}</p>}
            </div>

            {/* 비밀번호 */}
            <div>
              <input
                type="password"
                placeholder="비밀번호 (8자 이상)"
                className="input-field"
                {...register('password', { required: '비밀번호를 입력해주세요', minLength: { value: 8, message: '8자 이상 입력해주세요' } })}
              />
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>

            {/* 비밀번호 확인 */}
            <div>
              <input
                type="password"
                placeholder="비밀번호 확인"
                className="input-field"
                {...register('passwordConfirm', {
                  required: '비밀번호를 한 번 더 입력해주세요',
                  validate: (v) => v === watch('password') || '비밀번호가 일치하지 않습니다',
                })}
              />
              {errors.passwordConfirm && <p className="text-xs text-red-500 mt-1">{errors.passwordConfirm.message}</p>}
            </div>

            {/* 닉네임 (선택) */}
            <div>
              <input
                type="text"
                placeholder="닉네임 (선택 · 7자 이하, 공백·특수문자 불가)"
                className="input-field"
                {...register('nickname', {
                  maxLength: { value: 7, message: '7자 이하로 입력해주세요' },
                  pattern: { value: /^[^\s!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]*$/, message: '공백과 특수문자는 사용할 수 없습니다' },
                })}
              />
              {errors.nickname
                ? <p className="text-xs text-red-500 mt-1">{errors.nickname.message}</p>
                : <p className="text-xs text-gray-400 mt-1">입력하지 않으면 익명으로 시작합니다</p>
              }
            </div>

            <p className="text-xs text-gray-400">학번(입학년도)은 학교 이메일로 자동 인식됩니다. 학과는 가입 후 관리자가 설정합니다.</p>

            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full mt-1">다음</button>
          </form>
        </>
      )}

      {/* ── Step 2: 이메일 인증 ──────────────────────────────────── */}
      {step === 2 && (
        <>
          <h2 className="text-xl font-bold text-gray-900 mb-1">이메일 인증</h2>
          <p className="text-sm text-gray-400 mb-6">연성대학교 이메일로 인증해주세요.</p>

          <div className="space-y-4">
            {/* 이메일 입력 + 고정 도메인 + 발송 버튼 */}
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1.5 block">학교 이메일</label>
              <div className="flex gap-2">
                {/* 로컬파트 + 고정 도메인 */}
                <div className={`flex items-center flex-1 rounded-2xl border bg-white overflow-hidden ${emailVerified ? 'border-gray-200 bg-gray-50' : 'border-gray-200 focus-within:border-primary-400'}`}>
                  <input
                    type="text"
                    placeholder="아이디"
                    className="flex-1 min-w-0 px-4 py-2.5 text-sm bg-transparent outline-none"
                    value={emailLocal}
                    onChange={(e) => {
                      setEmailLocal(e.target.value.replace(/[@\s]/g, ''))
                      setEmailError('')
                      if (codeSent && !emailVerified) { setCodeSent(false); setCode('') }
                    }}
                    disabled={emailVerified}
                  />
                  <span className="pr-3 text-sm text-gray-400 shrink-0 select-none">{SCHOOL_DOMAIN}</span>
                </div>
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={!emailLocal.trim() || sendLoading || emailVerified || countdown > 0}
                  className="px-4 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 transition-colors"
                >
                  {sendLoading ? '발송 중...' : countdown > 0 ? `${countdown}s` : codeSent ? '재전송' : '코드 발송'}
                </button>
              </div>
              {emailError && <p className="text-xs text-red-500 mt-1.5">{emailError}</p>}
            </div>

            {/* 인증 코드 입력 */}
            {codeSent && !emailVerified && (
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1.5 block">인증 코드</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="6자리 코드 입력"
                    className="input-field flex-1 font-mono text-center text-xl tracking-widest"
                    maxLength={6}
                    value={code}
                    onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setCodeError('') }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleVerifyCode}
                    disabled={code.length !== 6 || verifyLoading}
                    className="px-4 py-2.5 rounded-xl bg-gray-700 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 transition-colors"
                  >
                    {verifyLoading ? '확인 중...' : '확인'}
                  </button>
                </div>
                {codeError && <p className="text-xs text-red-500 mt-1.5">{codeError}</p>}
                <p className="text-xs text-gray-400 mt-1.5">이메일로 발송된 6자리 코드를 입력하세요 (10분 유효).</p>
              </div>
            )}

            {/* 인증 완료 배너 */}
            {emailVerified && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-2xl px-4 py-3">
                <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-green-700">인증 완료</p>
                  <p className="text-xs text-green-500">{fullEmail}</p>
                </div>
              </div>
            )}

            {error && <p className="text-sm text-red-500 text-center">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setStep(1)} className="btn-outline flex-1">이전</button>
              <button
                type="button"
                onClick={() => { setError(''); setStep(3) }}
                disabled={!emailVerified}
                className="btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                다음
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Step 3: 재학증명서 제출 ──────────────────────────────── */}
      {step === 3 && (
        <>
          <h2 className="text-xl font-bold text-gray-900 mb-1">재학증명서 제출</h2>
          <p className="text-sm text-gray-400 mb-6">재학 여부 확인을 위해 재학증명서를 첨부해주세요. 관리자 승인 후 이용할 수 있습니다.</p>

          <div className="space-y-4">
            <label
              htmlFor="enrollment-doc"
              className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl py-10 px-4 cursor-pointer transition-colors ${
                enrollmentFile ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
              }`}
            >
              {enrollmentFile ? (
                <>
                  <svg className="w-8 h-8 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm font-semibold text-primary-600 break-all text-center">{enrollmentFile.name}</p>
                  <p className="text-xs text-gray-400">다시 선택하려면 클릭</p>
                </>
              ) : (
                <>
                  <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm font-medium text-gray-500">파일 선택 (클릭)</p>
                  <p className="text-xs text-gray-400">PDF 또는 이미지 · 최대 10MB</p>
                </>
              )}
              <input
                id="enrollment-doc"
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                className="hidden"
                onChange={handleSelectDoc}
              />
            </label>
            {docError && <p className="text-xs text-red-500">{docError}</p>}
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setStep(2)} className="btn-outline flex-1" disabled={submitting}>이전</button>
              <button
                type="button"
                onClick={onFinalSubmit}
                disabled={!enrollmentFile || submitting}
                className="btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? '제출 중...' : '가입 신청'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── 완료 ─────────────────────────────────────────────── */}
      {step === 'done' && (
        <div className="flex flex-col items-center gap-4 py-8">
          <span className="text-6xl">📨</span>
          <h2 className="text-xl font-bold text-gray-900">가입 신청이 접수되었습니다!</h2>
          <p className="text-sm text-gray-400 text-center">
            제출하신 재학증명서를 관리자가 확인 중입니다.<br />
            승인이 완료되면 로그인하여 이용할 수 있습니다.
          </p>
          <button type="button" onClick={() => navigate('/login', { replace: true })} className="btn-primary w-full mt-2">
            로그인 화면으로
          </button>
        </div>
      )}

      {step !== 'done' && (
        <p className="text-center text-sm text-gray-500 mt-4">
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className="text-primary-500 font-semibold">로그인</Link>
        </p>
      )}
    </div>
  )
}

import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { authApi } from '@/api/auth'
import { DEPARTMENTS, GRADES } from '@/constants'

interface Step1Form {
  username: string
  password: string
  nickname: string
  gender: 'male' | 'female'
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2 | 'done'>(1)
  const [enrollmentFile, setEnrollmentFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [step1Data, setStep1Data] = useState<Step1Form | null>(null)
  const [department, setDepartment] = useState('')
  const [grade, setGrade] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Step1Form>()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setEnrollmentFile(file)
  }

  const onStep1Submit = (data: Step1Form) => {
    if (!department) { setError('학과를 선택해주세요.'); return }
    if (!grade) { setError('학년을 선택해주세요.'); return }
    setStep1Data(data)
    setError('')
    setStep(2)
  }

  const onFinalSubmit = async () => {
    if (!step1Data || !department || !grade) return
    setError('')
    try {
      await authApi.register({
        ...step1Data,
        nickname: step1Data.nickname.trim() || undefined,
        department,
        grade,
        enrollmentDoc: enrollmentFile ?? undefined,
      })
      setStep('done')
      setTimeout(() => navigate('/login', { replace: true }), 2500)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '회원가입에 실패했습니다.'
      if (msg.includes('아이디')) {
        setStep(1)
      }
      setError(msg)
    }
  }

  return (
    <div className="card">
      {/* 단계 표시 */}
      {step !== 'done' && <div className="flex items-center gap-2 mb-6">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step === 1 ? 'bg-primary-500 text-white' : 'bg-primary-100 text-primary-500'}`}>1</div>
        <div className="flex-1 h-0.5 bg-gray-100">
          <div className={`h-full bg-primary-400 transition-all ${step === 2 ? 'w-full' : 'w-0'}`} />
        </div>
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step === 2 ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-400'}`}>2</div>
      </div>}

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

            {/* 학과 */}
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">학과 <span className="text-red-400">*</span></p>
              <div className="flex flex-wrap gap-2">
                {DEPARTMENTS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDepartment(d)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      department === d
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-primary-300'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* 학년 */}
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">학년 <span className="text-red-400">*</span></p>
              <div className="flex gap-2">
                {GRADES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGrade(g)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      grade === g
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-primary-300'
                    }`}
                  >
                    {g}학년
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-500 text-center">{error}</p>}

            <button type="submit" className="btn-primary w-full mt-1">
              다음
            </button>
          </form>
        </>
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center gap-4 py-8">
          <span className="text-6xl">🎉</span>
          <h2 className="text-xl font-bold text-gray-900">가입이 완료되었습니다!</h2>
          <p className="text-sm text-gray-400 text-center">썸전에 오신 것을 환영합니다.<br />잠시 후 로그인 페이지로 이동합니다.</p>
          <button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
            className="btn-primary w-full mt-2"
          >
            로그인하기
          </button>
        </div>
      )}

      {step === 2 && (
        <>
          <h2 className="text-xl font-bold text-gray-900 mb-1">재학증명서 첨부</h2>
          <p className="text-sm text-gray-400 mb-6">연성대학교 재학생 인증을 위해 재학증명서가 필요합니다.</p>

          <input
            ref={fileRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            className="hidden"
            onChange={handleFileChange}
          />

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={`w-full border-2 border-dashed rounded-2xl py-10 text-sm transition flex flex-col items-center gap-3
              ${enrollmentFile ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'}`}
          >
            {enrollmentFile ? (
              <>
                <span className="text-3xl">✅</span>
                <span className="text-primary-600 font-semibold">{enrollmentFile.name}</span>
                <span className="text-xs text-gray-400">다른 파일로 변경하려면 클릭</span>
              </>
            ) : (
              <>
                <span className="text-3xl">📄</span>
                <span className="text-gray-500">클릭하여 파일 첨부</span>
                <span className="text-xs text-gray-400">jpg / png / pdf · 최대 10MB</span>
              </>
            )}
          </button>

          {error && <p className="text-sm text-red-500 text-center mt-3">{error}</p>}

          <div className="flex gap-3 mt-5">
            <button type="button" onClick={() => setStep(1)} className="btn-outline flex-1">
              이전
            </button>
            <button
              type="button"
              onClick={onFinalSubmit}
              disabled={isSubmitting}
              className="btn-primary flex-1"
            >
              {isSubmitting ? '가입 중...' : '가입하기'}
            </button>
          </div>
        </>
      )}

      {step !== 'done' && <p className="text-center text-sm text-gray-500 mt-4">
        이미 계정이 있으신가요?{' '}
        <Link to="/login" className="text-primary-500 font-semibold">로그인</Link>
      </p>}
    </div>
  )
}

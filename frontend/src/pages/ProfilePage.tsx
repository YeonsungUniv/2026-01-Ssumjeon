import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/auth'
import { chatApi } from '@/api/chat'
import { userApi } from '@/api/user'
import client from '@/api/client'
import type { ApiResponse } from '@/types'

interface PasswordForm {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuthStore()
  const navigate = useNavigate()
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [pwSuccess, setPwSuccess] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [withdrawPassword, setWithdrawPassword] = useState('')
  const [withdrawError, setWithdrawError] = useState('')
  const [withdrawLoading, setWithdrawLoading] = useState(false)
  const [imgUploading, setImgUploading] = useState(false)
  const [showBlockedList, setShowBlockedList] = useState(false)
  const [blockedUsers, setBlockedUsers] = useState<{ id: string; nickname: string }[]>([])
  const [loadingBlocked, setLoadingBlocked] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<PasswordForm>()

  const handleLogout = async () => {
    await authApi.logout()
    logout()
    navigate('/login', { replace: true })
  }

  const handleWithdraw = async () => {
    if (!withdrawPassword) { setWithdrawError('비밀번호를 입력해주세요.'); return }
    setWithdrawLoading(true)
    setWithdrawError('')
    try {
      await userApi.deleteAccount(withdrawPassword)
      logout()
      navigate('/login', { replace: true })
    } catch (e) {
      setWithdrawError(e instanceof Error ? e.message : '탈퇴에 실패했습니다.')
    } finally {
      setWithdrawLoading(false)
    }
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImgUploading(true)
    try {
      const form = new FormData()
      form.append('image', file)
      const res = await client.post<ApiResponse<{ profileImage: string }>>('/users/me/profile-image', form)
      updateUser({ profileImage: res.data.profileImage })
    } catch { /* ignore */ } finally {
      setImgUploading(false)
      e.target.value = ''
    }
  }

  const onPasswordSubmit = async (data: PasswordForm) => {
    if (data.newPassword !== data.confirmPassword) {
      setError('confirmPassword', { message: '새 비밀번호가 일치하지 않습니다.' })
      return
    }
    try {
      await client.patch('/users/me/password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })
      reset()
      setShowPasswordForm(false)
      setPwSuccess(true)
      setTimeout(() => setPwSuccess(false), 3000)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '비밀번호 변경에 실패했습니다.'
      setError('currentPassword', { message: msg })
    }
  }

  const toggleBlockedList = async () => {
    if (!showBlockedList) {
      setLoadingBlocked(true)
      try {
        const res = await chatApi.getBlockedUsers()
        setBlockedUsers(res.data)
      } finally {
        setLoadingBlocked(false)
      }
    }
    setShowBlockedList((v) => !v)
  }

  const handleUnblock = async (userId: string) => {
    await chatApi.unblockUser(userId)
    setBlockedUsers((prev) => prev.filter((u) => u.id !== userId))
  }

  if (!user) return null

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">프로필</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* 좌측: 프로필 카드 */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card flex flex-col items-center gap-4 py-10">
            <button
              className="relative w-28 h-28 rounded-full group"
              onClick={() => fileInputRef.current?.click()}
              disabled={imgUploading}
            >
              {user.profileImage ? (
                <img src={user.profileImage} alt="프로필" className="w-28 h-28 rounded-full object-cover" />
              ) : (
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary-200 to-secondary-200 flex items-center justify-center text-5xl">
                  {user.gender === 'male' ? '🧑' : '👩'}
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {imgUploading
                  ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                }
              </div>
            </button>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageChange} />

            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900">{user.nickname}</h3>
              {(user.department || user.grade) && (
                <p className="text-sm text-primary-500 mt-1">
                  {user.department}{user.grade ? ` · ${user.grade}학년` : ''}
                </p>
              )}
              {user.mbti && (
                <span className="inline-block mt-2 bg-secondary-50 text-secondary-600 text-xs font-semibold px-3 py-1 rounded-full">
                  {user.mbti}
                </span>
              )}
            </div>

            {user.bio && (
              <p className="text-sm text-gray-500 text-center leading-relaxed">{user.bio}</p>
            )}

            {user.interests.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center">
                {user.interests.map((i) => (
                  <span key={i} className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full">{i}</span>
                ))}
              </div>
            )}

            <Link to="/profile/edit" className="btn-outline text-sm mt-1 w-full text-center">프로필 수정</Link>
          </div>

          {/* 계정 정보 */}
          <div className="card space-y-3">
            <p className="text-sm font-semibold text-gray-500">계정 정보</p>
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-gray-400 shrink-0">학교 이메일</span>
              <span className="text-gray-700 font-medium truncate text-right cursor-default" title={user.email ?? ''}>
                {user.email ?? <span className="text-gray-300">미등록</span>}
              </span>
            </div>
            {[
              { label: '학번', value: user.studentId },
              { label: '성별', value: user.gender === 'male' ? '남성' : '여성' },
            ].filter(({ value }) => value).map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-400">{label}</span>
                <span className="text-gray-700 font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 우측: 설정 패널 */}
        <div className="lg:col-span-2 space-y-4">

          {/* 비밀번호 변경 */}
          <div className="card space-y-3">
            <button
              className="flex items-center justify-between w-full"
              onClick={() => { setShowPasswordForm((v) => !v); setPwSuccess(false) }}
            >
              <p className="text-sm font-semibold text-gray-700">비밀번호 변경</p>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${showPasswordForm ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {pwSuccess && (
              <p className="text-sm text-green-600 font-medium">비밀번호가 변경되었습니다.</p>
            )}

            {showPasswordForm && (
              <form onSubmit={handleSubmit(onPasswordSubmit)} className="space-y-3 pt-1">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <div>
                    <input
                      type="password"
                      placeholder="현재 비밀번호"
                      className="input-field"
                      {...register('currentPassword', { required: '현재 비밀번호를 입력해주세요.' })}
                    />
                    {errors.currentPassword && (
                      <p className="text-xs text-red-500 mt-1">{errors.currentPassword.message}</p>
                    )}
                  </div>
                  <div>
                    <input
                      type="password"
                      placeholder="새 비밀번호 (8자 이상)"
                      className="input-field"
                      {...register('newPassword', { required: '새 비밀번호를 입력해주세요.', minLength: { value: 8, message: '8자 이상 입력해주세요.' } })}
                    />
                    {errors.newPassword && (
                      <p className="text-xs text-red-500 mt-1">{errors.newPassword.message}</p>
                    )}
                  </div>
                  <div>
                    <input
                      type="password"
                      placeholder="새 비밀번호 확인"
                      className="input-field"
                      {...register('confirmPassword', { required: '비밀번호를 한 번 더 입력해주세요.' })}
                    />
                    {errors.confirmPassword && (
                      <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <button type="button" onClick={() => { setShowPasswordForm(false); reset() }} className="btn-outline text-sm px-6">취소</button>
                  <button type="submit" disabled={isSubmitting} className="btn-primary text-sm px-6">
                    {isSubmitting ? '변경 중...' : '변경'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* 차단 목록 */}
          <div className="card space-y-3">
            <button
              className="flex items-center justify-between w-full"
              onClick={toggleBlockedList}
            >
              <p className="text-sm font-semibold text-gray-700">차단 목록</p>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${showBlockedList ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showBlockedList && (
              <div className="pt-1">
                {loadingBlocked ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin w-5 h-5 border-2 border-primary-300 border-t-primary-500 rounded-full" />
                  </div>
                ) : blockedUsers.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-3">차단한 사용자가 없습니다.</p>
                ) : (
                  <ul className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                    {blockedUsers.map((u) => (
                      <li key={u.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl">
                        <span className="text-sm text-gray-700">{u.nickname}</span>
                        <button
                          onClick={() => handleUnblock(u.id)}
                          className="text-xs text-red-400 border border-red-200 rounded-xl px-3 py-1 hover:bg-red-50 transition-colors"
                        >
                          차단 해제
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* 고객센터 */}
          <Link
            to="/support"
            className="flex items-center justify-between w-full px-5 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">💬</span>
              <span className="text-sm font-semibold text-gray-700">고객센터 / 문의하기</span>
            </div>
            <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          {/* 로그아웃 */}
          <button
            onClick={handleLogout}
            className="w-full py-3.5 rounded-2xl border-2 border-red-200 text-red-400 font-semibold text-sm hover:bg-red-50 transition-colors"
          >
            로그아웃
          </button>

          {/* 회원 탈퇴 */}
          <button
            onClick={() => { setShowWithdraw(true); setWithdrawPassword(''); setWithdrawError('') }}
            className="w-full py-2.5 text-xs text-gray-300 hover:text-gray-400 transition-colors"
          >
            회원 탈퇴
          </button>
        </div>

      </div>

      {/* 회원 탈퇴 모달 */}
      {showWithdraw && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <div className="text-center space-y-1">
              <p className="text-2xl">😢</p>
              <h3 className="font-bold text-gray-900 text-lg">정말 탈퇴하시겠어요?</h3>
              <p className="text-sm text-gray-400">
                탈퇴 시 프로필, 채팅, 매칭 등<br />모든 데이터가 즉시 삭제됩니다.
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">비밀번호 확인</label>
              <input
                type="password"
                placeholder="현재 비밀번호 입력"
                className="input-field"
                value={withdrawPassword}
                onChange={(e) => { setWithdrawPassword(e.target.value); setWithdrawError('') }}
                autoFocus
              />
              {withdrawError && <p className="text-xs text-red-500 mt-1.5">{withdrawError}</p>}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowWithdraw(false)}
                className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleWithdraw}
                disabled={withdrawLoading}
                className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {withdrawLoading ? '처리 중...' : '탈퇴하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

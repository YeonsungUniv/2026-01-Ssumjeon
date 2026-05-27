import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { authApi, type LoginPayload } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { useState } from 'react'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginPayload>()

  const onSubmit = async (data: LoginPayload) => {
    setError('')
    try {
      const res = await authApi.login(data)
      setAuth(res.data.user, res.data.accessToken)
      if (res.data.user.status === 'pending') {
        navigate('/pending', { replace: true })
      } else if (res.data.user.isAdmin) {
        navigate('/admin', { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '로그인에 실패했습니다.'
      setError(msg)
    }
  }

  return (
    <div className="card">
      <h2 className="text-xl font-bold text-gray-900 mb-6">로그인</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <input
            type="text"
            placeholder="아이디"
            className="input-field"
            {...register('username', { required: '아이디를 입력해주세요' })}
          />
          {errors.username && <p className="text-xs text-red-500 mt-1">{errors.username.message}</p>}
        </div>

        <div>
          <input
            type="password"
            placeholder="비밀번호"
            className="input-field"
            {...register('password', { required: '비밀번호를 입력해주세요' })}
          />
          {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
        </div>

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting ? '로그인 중...' : '로그인'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-4">
        계정이 없으신가요?{' '}
        <Link to="/register" className="text-primary-500 font-semibold">회원가입</Link>
      </p>
    </div>
  )
}

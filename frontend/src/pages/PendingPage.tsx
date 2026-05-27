import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/auth'
import { useNavigate } from 'react-router-dom'

export default function PendingPage() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try { await authApi.logout() } catch { /* ignore */ }
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gray-50 p-5">
      <div className="card w-full max-w-sm text-center space-y-6">
        <div className="text-5xl">⏳</div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">인증 대기중입니다</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            제출하신 재학증명서를 관리자가 확인 중입니다.<br />
            승인이 완료되면 서비스를 이용하실 수 있습니다.
          </p>
        </div>

        {user && (
          <div className="bg-gray-50 rounded-2xl p-4 text-left space-y-1 text-sm text-gray-600">
            <p><span className="font-medium text-gray-800">아이디</span> {user.username}</p>
            <p><span className="font-medium text-gray-800">닉네임</span> {user.nickname}</p>
            <p><span className="font-medium text-gray-800">학과</span> {user.department}</p>
          </div>
        )}

        <div className="bg-primary-50 border border-primary-200 rounded-2xl p-4 text-sm text-primary-700">
          승인까지 보통 1~2일 소요됩니다.<br />
          문의: 학생처 또는 담당 관리자
        </div>

        <button onClick={handleLogout} className="btn-outline w-full text-sm">
          로그아웃
        </button>
      </div>
    </div>
  )
}

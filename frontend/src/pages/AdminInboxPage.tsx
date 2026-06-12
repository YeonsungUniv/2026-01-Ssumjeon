import { useEffect, useState } from 'react'
import { adminApi, type PendingUser } from '@/api/auth'
import AdminSubNav from '@/components/layout/AdminSubNav'
import { useNotificationStore } from '@/store/notificationStore'

export default function AdminInboxPage() {
  const [pending, setPending] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const decPendingUsers = useNotificationStore((s) => s.decPendingUsers)

  useEffect(() => { fetchPending() }, [])

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
      decPendingUsers()
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
      decPendingUsers()
    } catch (e) {
      alert(e instanceof Error ? e.message : '거절 실패')
    } finally {
      setActionId(null)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <AdminSubNav />
      <div className="flex items-center justify-between pt-2">
        <h2 className="text-xl font-bold text-gray-800">가입 수신함 <span className="text-sm font-normal text-gray-400">재학증명서 승인 대기</span></h2>
        {pending.length > 0 && (
          <span className="text-sm font-semibold text-primary-500">{pending.length}건</span>
        )}
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
                  <p className="text-sm text-gray-500">{u.department} · {u.gender === 'male' ? '남' : '여'} · 학번 {u.studentId ?? '-'}</p>
                </div>
                <span className="text-xs text-gray-400">{new Date(u.createdAt).toLocaleDateString('ko-KR')}</span>
              </div>

              {u.enrollmentDoc ? (
                <a
                  href={u.enrollmentDoc}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary-500 font-medium underline underline-offset-2"
                >
                  📄 재학증명서 확인 →
                </a>
              ) : (
                <p className="text-sm text-gray-400">재학증명서 없음</p>
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

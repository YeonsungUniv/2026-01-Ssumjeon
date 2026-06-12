import { useEffect, useState } from 'react'
import client from '@/api/client'
import type { ApiResponse } from '@/types'
import dayjs from 'dayjs'
import AdminSubNav from '@/components/layout/AdminSubNav'
import { useNotificationStore } from '@/store/notificationStore'

interface Inquiry {
  id: string
  category: string
  title: string
  content: string
  status: 'pending' | 'answered'
  answer?: string
  answered_at?: string
  created_at: string
  username: string
  nickname: string
}

export default function SuggestionsAdminPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [selected, setSelected] = useState<Inquiry | null>(null)
  const [answer, setAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'answered'>('all')
  const decPendingInquiries = useNotificationStore((s) => s.decPendingInquiries)

  useEffect(() => {
    client.get<ApiResponse<Inquiry[]>>('/admin/support').then((res) => setInquiries(res.data))
  }, [])

  const handleAnswer = async () => {
    if (!selected || !answer.trim()) return
    const wasPending = selected.status === 'pending'
    setSubmitting(true)
    try {
      await client.patch(`/admin/support/${selected.id}/answer`, { answer })
      if (wasPending) decPendingInquiries()
      setInquiries((prev) =>
        prev.map((i) =>
          i.id === selected.id ? { ...i, status: 'answered', answer, answered_at: new Date().toISOString() } : i,
        ),
      )
      setSelected((prev) => prev ? { ...prev, status: 'answered', answer, answered_at: new Date().toISOString() } : null)
      setAnswer('')
    } catch {
      alert('답변 등록에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = inquiries.filter((i) => filter === 'all' || i.status === filter)

  if (selected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelected(null)} className="text-gray-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-bold text-gray-800">문의 상세</h2>
        </div>

        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">{selected.category}</span>
            <StatusBadge status={selected.status} />
          </div>
          <p className="font-bold text-gray-900">{selected.title}</p>
          <p className="text-xs text-gray-400">
            {selected.nickname} (@{selected.username}) · {dayjs(selected.created_at).format('YYYY.MM.DD HH:mm')}
          </p>
          <hr className="border-gray-100" />
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selected.content}</p>
        </div>

        {selected.status === 'answered' && selected.answer ? (
          <div className="card bg-primary-50 border-primary-100 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary-600">등록된 답변</span>
              <span className="text-xs text-gray-400">{dayjs(selected.answered_at).format('YYYY.MM.DD HH:mm')}</span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selected.answer}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-600">답변 작성</label>
            <textarea
              rows={5}
              className="input-field resize-none"
              placeholder="답변 내용을 입력해주세요."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
            <button
              onClick={handleAnswer}
              disabled={submitting || !answer.trim()}
              className="btn-primary w-full"
            >
              {submitting ? '등록 중...' : '답변 등록'}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <AdminSubNav />
      <h2 className="text-xl font-bold text-gray-800">건의사항 관리</h2>

      <div className="flex bg-gray-100 rounded-2xl p-1 gap-1">
        {(['all', 'pending', 'answered'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
          >
            {f === 'all' ? '전체' : f === 'pending' ? '답변대기' : '답변완료'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <p className="text-3xl mb-3">📭</p>
          <p>문의 내역이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((inq) => (
            <button
              key={inq.id}
              className="card w-full text-left space-y-2 hover:bg-gray-50 transition-colors"
              onClick={() => { setSelected(inq); setAnswer('') }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{inq.category}</span>
                <StatusBadge status={inq.status} />
              </div>
              <p className="font-semibold text-gray-800 truncate">{inq.title}</p>
              <p className="text-xs text-gray-400">
                {inq.nickname} · {dayjs(inq.created_at).format('YYYY.MM.DD')}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: 'pending' | 'answered' }) {
  return status === 'answered'
    ? <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">답변완료</span>
    : <span className="text-xs font-semibold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">답변대기</span>
}

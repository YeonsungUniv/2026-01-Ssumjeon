import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import client from '@/api/client'
import type { ApiResponse } from '@/types'
import dayjs from 'dayjs'

const CATEGORIES = ['계정/로그인', '매칭', '채팅', '신고', '기타']

interface Inquiry {
  id: string
  category: string
  title: string
  content: string
  status: 'pending' | 'answered'
  answer?: string
  answered_at?: string
  created_at: string
}

interface FormData {
  category: string
  title: string
  content: string
}

export default function SupportPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'new' | 'history'>('new')
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [selected, setSelected] = useState<Inquiry | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    defaultValues: { category: CATEGORIES[0] },
  })

  useEffect(() => {
    if (tab === 'history') {
      client.get<ApiResponse<Inquiry[]>>('/support').then((res) => setInquiries(res.data))
    }
  }, [tab])

  const onSubmit = async (data: FormData) => {
    await client.post('/support', data)
    reset()
    setSubmitted(true)
    setTimeout(() => { setSubmitted(false); setTab('history') }, 1500)
  }

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
          <p className="text-sm text-gray-500">{dayjs(selected.created_at).format('YYYY.MM.DD HH:mm')}</p>
          <hr className="border-gray-100" />
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selected.content}</p>
        </div>

        {selected.status === 'answered' && selected.answer && (
          <div className="card bg-primary-50 border-primary-100 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary-600">답변</span>
              <span className="text-xs text-gray-400">{dayjs(selected.answered_at).format('YYYY.MM.DD HH:mm')}</span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selected.answer}</p>
          </div>
        )}

        {selected.status === 'pending' && (
          <div className="card bg-yellow-50 border-yellow-100 text-center py-4">
            <p className="text-sm text-yellow-700">답변 대기 중입니다.</p>
            <p className="text-xs text-yellow-500 mt-1">영업일 기준 1~3일 내 답변드립니다.</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-xl font-bold text-gray-800">고객센터</h2>
      </div>

      {/* 탭 */}
      <div className="flex bg-gray-100 rounded-2xl p-1 gap-1">
        {(['new', 'history'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
          >
            {t === 'new' ? '문의하기' : '문의 내역'}
          </button>
        ))}
      </div>

      {tab === 'new' && (
        <div className="space-y-4">
          {submitted && (
            <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 text-sm text-green-700 font-medium text-center">
              문의가 접수되었습니다!
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">카테고리</label>
              <select className="input-field" {...register('category', { required: true })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">제목</label>
              <input
                className="input-field"
                placeholder="문의 제목을 입력해주세요"
                {...register('title', { required: '제목을 입력해주세요.', maxLength: { value: 100, message: '100자 이하로 입력해주세요.' } })}
              />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">내용</label>
              <textarea
                rows={6}
                className="input-field resize-none"
                placeholder="문의 내용을 자세히 작성해주세요."
                {...register('content', { required: '내용을 입력해주세요.', minLength: { value: 10, message: '10자 이상 입력해주세요.' } })}
              />
              {errors.content && <p className="text-xs text-red-500 mt-1">{errors.content.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting ? '접수 중...' : '문의 접수'}
            </button>
          </form>

          <div className="card bg-gray-50 space-y-2 text-sm text-gray-500">
            <p className="font-semibold text-gray-600">문의 안내</p>
            <p>• 답변은 영업일 기준 1~3일 내 드립니다.</p>
            <p>• 욕설·비방 등의 문의는 처리되지 않을 수 있습니다.</p>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-3">
          {inquiries.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-3xl mb-3">📭</p>
              <p className="text-gray-500 font-medium">문의 내역이 없어요</p>
            </div>
          ) : (
            inquiries.map((inq) => (
              <button
                key={inq.id}
                className="card w-full text-left space-y-2 hover:bg-gray-50 transition-colors"
                onClick={() => setSelected(inq)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{inq.category}</span>
                  <StatusBadge status={inq.status} />
                </div>
                <p className="font-semibold text-gray-800 truncate">{inq.title}</p>
                <p className="text-xs text-gray-400">{dayjs(inq.created_at).format('YYYY.MM.DD')}</p>
              </button>
            ))
          )}
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

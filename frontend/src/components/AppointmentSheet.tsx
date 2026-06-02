import { useState } from 'react'
import { appointmentApi } from '@/api/appointment'
import type { Appointment } from '@/types'

interface Props {
  roomId: string
  onClose: () => void
  onProposed: (a: Appointment) => void
  editAppointment?: Appointment
}

export default function AppointmentSheet({ roomId, onClose, onProposed, editAppointment }: Props) {
  const isEdit = !!editAppointment
  const [date, setDate] = useState(editAppointment?.date ?? '')
  const [time, setTime] = useState(editAppointment?.time ?? '')
  const [location, setLocation] = useState(editAppointment?.location ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!date || !time || !location.trim()) { setError('날짜, 시간, 장소를 모두 입력해주세요.'); return }
    setLoading(true)
    try {
      const res = isEdit
        ? await appointmentApi.edit(editAppointment!.id, { date, time, location })
        : await appointmentApi.propose(roomId, { date, time, location })
      onProposed(res.data)
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white rounded-t-3xl z-50 animate-slide-up">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <div className="px-5 pb-8 pt-3 space-y-4">
          <h3 className="font-bold text-gray-800 text-center">
            {isEdit ? '약속 수정' : '약속 제안'}
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">날짜</label>
              <input
                type="date"
                className="input-field"
                value={date}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">시간</label>
              <input
                type="time"
                className="input-field"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">장소</label>
              <input
                className="input-field"
                placeholder="예: 강남역 2번 출구 앞 카페"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-500 text-center">{error}</p>}

          <div className="flex gap-3">
            <button onClick={onClose} className="btn-outline flex-1">취소</button>
            <button onClick={submit} disabled={loading} className="btn-primary flex-1">
              {loading ? (isEdit ? '수정 중...' : '전송 중...') : (isEdit ? '수정하기' : '제안하기')}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

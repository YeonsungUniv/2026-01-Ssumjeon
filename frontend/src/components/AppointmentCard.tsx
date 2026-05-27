import type { Appointment } from '@/types'
import { appointmentApi } from '@/api/appointment'
import dayjs from 'dayjs'

interface Props {
  appointment: Appointment
  myUserId: string
  onUpdate: (updated: Appointment) => void
}

const STATUS_LABEL = {
  pending: { text: '수락 대기 중', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  confirmed: { text: '확정됨 ✓', color: 'text-green-600 bg-green-50 border-green-200' },
  cancelled: { text: '취소됨', color: 'text-gray-400 bg-gray-50 border-gray-200' },
}

export default function AppointmentCard({ appointment, myUserId, onUpdate }: Props) {
  const isProposer = appointment.proposerId === myUserId
  const { text, color } = STATUS_LABEL[appointment.status]

  const handle = async (action: 'confirm' | 'cancel') => {
    const res = action === 'confirm'
      ? await appointmentApi.confirm(appointment.id)
      : await appointmentApi.cancel(appointment.id)
    onUpdate(res.data)
  }

  return (
    <div className={`rounded-2xl border-2 p-4 space-y-3 ${color}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📅</span>
          <span className="font-bold text-sm text-gray-800">약속 제안</span>
        </div>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${color}`}>{text}</span>
      </div>

      <div className="space-y-1.5 text-sm">
        <div className="flex items-center gap-2 text-gray-700">
          <span className="text-base">🗓</span>
          <span className="font-medium">{dayjs(appointment.date).format('YYYY년 MM월 DD일 (ddd)')}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-700">
          <span className="text-base">⏰</span>
          <span className="font-medium">{appointment.time}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-700">
          <span className="text-base">📍</span>
          <span className="font-medium">{appointment.location}</span>
        </div>
      </div>

      {appointment.status === 'pending' && (
        <div className="flex gap-2 pt-1">
          {!isProposer && (
            <button
              onClick={() => handle('confirm')}
              className="flex-1 py-2 rounded-xl bg-primary-500 text-white text-sm font-semibold"
            >
              수락
            </button>
          )}
          <button
            onClick={() => handle('cancel')}
            className="flex-1 py-2 rounded-xl border border-gray-300 text-gray-500 text-sm font-semibold"
          >
            {isProposer ? '취소' : '거절'}
          </button>
        </div>
      )}
    </div>
  )
}

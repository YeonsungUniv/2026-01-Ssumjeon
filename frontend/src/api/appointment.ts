import client from './client'
import type { ApiResponse, Appointment } from '@/types'

export const appointmentApi = {
  getByRoom: (roomId: string) =>
    client.get<ApiResponse<Appointment[]>>(`/appointments/rooms/${roomId}`),

  propose: (roomId: string, data: { date: string; time: string; location: string }) =>
    client.post<ApiResponse<Appointment>>(`/appointments/rooms/${roomId}`, data),

  confirm: (id: string) =>
    client.patch<ApiResponse<Appointment>>(`/appointments/${id}`, { status: 'confirmed' }),

  cancel: (id: string) =>
    client.patch<ApiResponse<Appointment>>(`/appointments/${id}`, { status: 'cancelled' }),

  edit: (id: string, data: { date: string; time: string; location: string }) =>
    client.put<ApiResponse<Appointment>>(`/appointments/${id}`, data),
}

import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useMatchRequestStore } from '@/store/matchRequestStore'
import { chatRequestApi } from '@/api/chatRequest'
import MainLayout from '@/components/layout/MainLayout'
import AuthLayout from '@/components/layout/AuthLayout'

import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import ForgotPage from '@/pages/ForgotPage'
import PendingPage from '@/pages/PendingPage'
import AdminPage from '@/pages/AdminPage'
import HomePage from '@/pages/HomePage'
import MatchingPage from '@/pages/MatchingPage'
import GroupMatchingPage from '@/pages/GroupMatchingPage'
import ChatLayout from '@/components/layout/ChatLayout'
import ChatRoomPage from '@/pages/ChatRoomPage'
import ProfilePage from '@/pages/ProfilePage'
import ProfileEditPage from '@/pages/ProfileEditPage'
import SupportPage from '@/pages/SupportPage'
import SuggestionsAdminPage from '@/pages/SuggestionsAdminPage'
import NotFoundPage from '@/pages/NotFoundPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.status === 'pending') return <Navigate to="/pending" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!user?.isAdmin) return <Navigate to="/" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <>{children}</>
  if (user?.status === 'pending') return <Navigate to="/pending" replace />
  return <Navigate to="/" replace />
}

function useInitialRefresh() {
  const { accessToken, setAccessToken, logout, isAuthenticated } = useAuthStore()
  const { setPendingIncomingCount } = useMatchRequestStore()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (accessToken) { setReady(true); return }
    fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setAccessToken(data.data.accessToken))
      .catch(() => logout())
      .finally(() => setReady(true))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    chatRequestApi.getPendingCount().then((res) => setPendingIncomingCount(res.data.count)).catch(() => {})
  }, [isAuthenticated, setPendingIncomingCount])

  return ready
}

export default function App() {
  const ready = useInitialRefresh()

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-10 h-10 border-4 border-primary-300 border-t-primary-500 rounded-full" />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/pending" element={<PendingPage />} />
        <Route path="/admin" element={<AdminPage />} />

        <Route element={<AuthLayout />}>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/forgot" element={<PublicRoute><ForgotPage /></PublicRoute>} />
        </Route>

        <Route element={<PrivateRoute><MainLayout /></PrivateRoute>}>
          <Route path="/" element={<HomePage />} />
          <Route path="/matching" element={<MatchingPage />} />
          <Route path="/group-matching" element={<GroupMatchingPage />} />
          <Route path="/chat" element={<ChatLayout />}>
            <Route path=":roomId" element={<ChatRoomPage />} />
          </Route>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/edit" element={<ProfileEditPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/suggestions" element={<AdminRoute><SuggestionsAdminPage /></AdminRoute>} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

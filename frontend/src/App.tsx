import { lazy } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { MemberLayout } from '@/components/layout/MemberLayout'
import { LoginPage } from '@/pages/LoginPage'

const AdminDashboardPage = lazy(() =>
  import('@/pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })),
)
const BallotPage = lazy(() =>
  import('@/pages/member/BallotPage').then((m) => ({ default: m.BallotPage })),
)
const ElectionsPage = lazy(() =>
  import('@/pages/admin/ElectionsPage').then((m) => ({ default: m.ElectionsPage })),
)
const MembersPage = lazy(() =>
  import('@/pages/admin/MembersPage').then((m) => ({ default: m.MembersPage })),
)
const PositionsPage = lazy(() =>
  import('@/pages/admin/PositionsPage').then((m) => ({ default: m.PositionsPage })),
)
const CandidatesPage = lazy(() =>
  import('@/pages/admin/CandidatesPage').then((m) => ({ default: m.CandidatesPage })),
)
const ReportsPage = lazy(() =>
  import('@/pages/admin/ReportsPage').then((m) => ({ default: m.ReportsPage })),
)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route element={<ProtectedRoute allowedRoles={['MEMBER']} />}>
                <Route element={<MemberLayout />}>
                  <Route path="/vote" element={<BallotPage />} />
                  <Route path="/my-votes" element={<Navigate to="/vote" replace />} />
                </Route>
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboardPage />} />
                  <Route path="members" element={<MembersPage />} />
                  <Route path="positions" element={<PositionsPage />} />
                  <Route path="candidates" element={<CandidatesPage />} />
                  <Route path="elections" element={<ElectionsPage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="live" element={<Navigate to="/admin" replace />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster richColors closeButton position="top-right" containerAriaLabel="Notifications" />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
